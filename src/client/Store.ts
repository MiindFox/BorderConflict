import {
  isGrantedSubscription,
  UserMeResponse,
} from "@openfront/shared/ApiSchemas";
import {
  CosmeticPack,
  Cosmetics,
  Product,
  Subscription,
} from "@openfront/shared/CosmeticSchemas";
import type { PropertyValues, TemplateResult } from "lit";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { COMMANDER_UPDATED_EVENT, commanderStore } from "./CommanderStore";
import { BaseModal } from "./components/BaseModal";
import "./components/CapIcon";
import "./components/CosmeticCard";
import { cosmeticSelectionLabel } from "./components/CosmeticPresentation";
import { isPreviewableCosmetic } from "./components/CosmeticPreviewBubble";
import "./components/CosmeticPreviewModal";
import "./components/CurrencyDisplay";
import "./components/CustomCurrencyCard";
import "./components/CustomSkinStudio";
import "./components/EffectsGrid";
import type { InlineCheckout } from "./components/InlineCheckout";
import "./components/NotLoggedInWarning";
import "./components/PackContentsDialog";
import "./components/PlutoniumIcon";
import { ProgressiveList } from "./components/ProgressiveList";
import "./components/PurchaseButton";
import { alignPurchaseRows } from "./components/PurchaseButton";
import "./components/TribesPanel";
import { modalHeader } from "./components/ui/ModalHeader";
import {
  fetchCosmetics,
  findPackItem,
  groupCosmeticVariants,
  ownedPackItems,
  purchaseCosmetic,
  resolveCosmetics,
  ResolvedCosmetic,
} from "./Cosmetics";
import { matchesStoreItem } from "./EquippedCosmetics";
import {
  priceStringToCents,
  reportPendingSteamAuthorizations,
} from "./Payments";
import { lastUserMeResponse } from "./UserMeBroadcast";
import { showToast, translateText } from "./Utils";

// Matches the API's formatting of `product.price`, so a tier priced from its
// own cents reads the same as one priced from its Stripe listing.
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatUsdCents(cents: number): string {
  return usdFormatter.format(cents / 100);
}

type StoreTab =
  | "cosmetics"
  | "bundles"
  | "custom_skin"
  | "season_pass"
  | "effects"
  | "packs"
  | "subscriptions"
  | "tribes";

const COSMETICS_SUB_TABS = ["patterns", "flags", "crowns"] as const;
type CosmeticsSubTab = (typeof COSMETICS_SUB_TABS)[number];

/** Sub-tab holding the catalog item a store deep link points at. */
export function subTabForItem(itemKey: string): CosmeticsSubTab {
  if (itemKey.startsWith("crown:")) return "crowns";
  if (itemKey.startsWith("flag:")) return "flags";
  return "patterns";
}

interface StoreBrowserOptions {
  emptyTranslationKey: string;
  userHasSubscription?: boolean;
  trailingContent?: TemplateResult;
  gridClass?: string;
  cardClass?: string;
  previewSize?: "card" | "detail";
  emptyClass?: string;
}

@customElement("store-modal")
export class StoreModal extends BaseModal {
  protected routerName = "store";
  private cosmetics: Cosmetics | null = null;
  private affiliateCode: string | null = null;
  private userMeResponse: UserMeResponse | false = false;
  // `userMeResponse` starts at `false`, which is also what "no session" looks
  // like, so a tab that renders a sign-in prompt on `false` would show it to a
  // logged-in player for the whole window before Main's first userMeResponse
  // broadcast (a Steam ticket exchange on desktop). This distinguishes the
  // two: nothing is asserted about the session until it has actually settled.
  // Reactive on its own, unlike `userMeResponse`: onUserMe() only calls
  // refresh() after the catalog fetch, and a settled no-session result must
  // not wait on a slow catalog before it may say so.
  @state() private authSettled = false;
  @state() private lastCrateDrops: {
    flare: string;
    label: string;
    rarity: string;
  }[] = [];
  private cosmeticsSubTab: CosmeticsSubTab = "patterns";
  // Item the URL asked for (`#modal=store&item=<key>`). Held until its group
  // is visible, then inspected so the store opens on that item.
  private requestedItem: string | null = null;
  private inspected: ResolvedCosmetic | null = null;
  private previewingCosmetic: ResolvedCosmetic | null = null;
  private visibleGroups: readonly (readonly ResolvedCosmetic[])[] = [];
  /** The bundle whose contents dialog is open, if any. */
  private openedPack: ResolvedCosmetic | null = null;
  private readonly pages = new ProgressiveList(this);

  protected modalConfig() {
    if (this.affiliateCode) {
      // Affiliate mode: hide tabs, show only items associated with the code.
      return {};
    }
    return {
      tabs: [
        { key: "bundles", label: "⭐ Offres & Bundles" },
        { key: "custom_skin", label: "🎨 Forge de Skin" },
        { key: "season_pass", label: "🎖️ Pass de Saison" },
        { key: "packs", label: "☢️ Plutonium & Caisses" },
        { key: "cosmetics", label: translateText("store.cosmetics") },
        { key: "effects", label: translateText("store.effects") },
      ],
    };
  }

  private onCommanderUpdated = () => {
    void this.onUserMe(commanderStore.getLocalUserMeResponse());
  };

  connectedCallback() {
    super.connectedCallback();
    this.checkStripeRedirectReturn();
    document.addEventListener("userMeResponse", this.onUserMeEvent);
    window.addEventListener(COMMANDER_UPDATED_EVENT, this.onCommanderUpdated);
    // The store loads on demand, usually after Main's broadcast went out.
    const last = lastUserMeResponse();
    if (last !== null && last.response !== false) {
      void this.onUserMe(last.response);
    } else {
      void this.onUserMe(commanderStore.getLocalUserMeResponse());
    }
    this.addEventListener("open-cosmetic-preview", this.onOpenCosmeticPreview);
    // Rows re-wrap on resize, so which currencies share a row changes with it.
    if (typeof ResizeObserver !== "undefined") {
      this.rowObserver ??= new ResizeObserver(() => alignPurchaseRows(this));
      this.rowObserver.observe(this);
    }
  }

  disconnectedCallback() {
    document.removeEventListener("userMeResponse", this.onUserMeEvent);
    window.removeEventListener(
      COMMANDER_UPDATED_EVENT,
      this.onCommanderUpdated,
    );
    this.removeEventListener(
      "open-cosmetic-preview",
      this.onOpenCosmeticPreview,
    );
    this.rowObserver?.disconnect();
    if (this.alignFrame !== null) cancelAnimationFrame(this.alignFrame);
    this.alignFrame = null;
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    // The cards are nested components, so their purchase buttons only exist
    // (and only have positions) after their own updates commit — a frame later.
    alignPurchaseRows(this);
    if (typeof requestAnimationFrame === "undefined") return;
    this.alignFrame ??= requestAnimationFrame(() => {
      this.alignFrame = null;
      alignPurchaseRows(this);
    });
  }

  private onUserMeEvent = (event: Event) => {
    const customEvent = event as CustomEvent<UserMeResponse | false>;
    this.onUserMe(customEvent.detail);
  };

  private onOpenCosmeticPreview = (event: Event) => {
    const customEvent = event as CustomEvent<ResolvedCosmetic>;
    this.previewingCosmetic = customEvent.detail;
    this.requestUpdate();
  };

  private rowObserver: ResizeObserver | null = null;
  private alignFrame: number | null = null;

  async onUserMe(userMeResponse: UserMeResponse | false) {
    this.userMeResponse =
      userMeResponse === false
        ? commanderStore.getLocalUserMeResponse()
        : userMeResponse;
    this.authSettled = true;
    this.cosmetics = await fetchCosmetics();
    this.selectVisible(this.groupsForTab(this.activeTab));
    await this.refresh();
  }

  private renderHeader(): TemplateResult {
    const currency =
      this.userMeResponse === false
        ? undefined
        : this.userMeResponse.player.currency;
    return modalHeader({
      title: translateText("store.title"),
      onBack: () => this.close(),
      ariaLabel: translateText("common.back"),
      rightContent: html`<div class="flex items-center gap-4">
        ${currency
          ? html`<currency-display
              .hard=${currency.hard}
              .soft=${currency.soft}
            ></currency-display>`
          : html`<not-logged-in-warning></not-logged-in-warning>`}
      </div>`,
    });
  }

  private resolvedPurchasables(): ResolvedCosmetic[] {
    return resolveCosmetics(
      this.cosmetics,
      this.userMeResponse,
      this.affiliateCode,
    ).filter((resolved) => resolved.relationship === "purchasable");
  }

  private cosmeticsGroups(
    tab: CosmeticsSubTab,
  ): readonly (readonly ResolvedCosmetic[])[] {
    const items = this.resolvedPurchasables();
    if (tab === "flags") {
      return items
        .filter((resolved) => resolved.type === "flag")
        .map((r) => [r]);
    }
    if (tab === "crowns") {
      return items
        .filter((resolved) => resolved.type === "crown")
        .map((r) => [r]);
    }
    return groupCosmeticVariants(
      items.filter(
        (resolved) => resolved.type === "pattern" || resolved.type === "skin",
      ),
    );
  }

  private groupsForTab(tab: string): readonly (readonly ResolvedCosmetic[])[] {
    if (this.affiliateCode) {
      return groupCosmeticVariants(
        this.resolvedPurchasables().filter((resolved) => {
          const c = resolved.cosmetic;
          return (
            c !== null &&
            "affiliateCode" in c &&
            c.affiliateCode === this.affiliateCode
          );
        }),
      );
    }
    if (tab === "cosmetics") {
      return this.cosmeticsGroups(this.cosmeticsSubTab);
    }
    if (tab === "effects") {
      return this.resolvedPurchasables()
        .filter((resolved) => resolved.type === "effect")
        .map((resolved) => [resolved]);
    }
    if (tab === "packs") {
      return this.resolvedPurchasables()
        .filter((resolved) => resolved.type === "pack")
        .map((resolved) => [resolved]);
    }
    if (tab === "bundles") {
      // Owned and partially owned bundles stay listed (as a status, not a
      // buy button) so the player can see why one isn't for sale to them.
      return resolveCosmetics(
        this.cosmetics,
        this.userMeResponse,
        this.affiliateCode,
      )
        .filter(
          (resolved) =>
            resolved.type === "cosmeticPack" &&
            (resolved.relationship !== "blocked" ||
              this.ownedPackItemNames(resolved).length > 0),
        )
        .map((resolved) => [resolved]);
    }
    if (tab === "subscriptions") {
      return resolveCosmetics(
        this.cosmetics,
        this.userMeResponse,
        this.affiliateCode,
      )
        .filter(
          (resolved) =>
            resolved.type === "subscription" &&
            (resolved.relationship === "purchasable" ||
              resolved.relationship === "owned"),
        )
        .map((resolved) => [resolved]);
    }
    return [];
  }

  private inspect(resolved: ResolvedCosmetic): void {
    this.inspected = resolved;
    this.requestUpdate();
  }

  // Activating a bundle also opens its contents: the card only has room to
  // tile a few items, so the dialog is where each one is shown with its name.
  private activate(resolved: ResolvedCosmetic): void {
    if (resolved.type === "cosmeticPack") this.openedPack = resolved;
    if (isPreviewableCosmetic(resolved)) this.previewingCosmetic = resolved;
    this.inspect(resolved);
  }

  private closePack(): void {
    this.openedPack = null;
    this.requestUpdate();
  }

  private reconcileInspection(
    groups: readonly (readonly ResolvedCosmetic[])[],
  ): void {
    const visible = groups.flat();
    const wanted = this.requestedItem;
    if (wanted !== null) {
      const match = visible.find((item) => matchesStoreItem(item.key, wanted));
      // The catalog loads after open, so keep the request until its item shows.
      if (match !== undefined) {
        this.requestedItem = null;
        this.inspected = match;
        return;
      }
    }
    const current = visible.find((item) => item.key === this.inspected?.key);
    this.inspected = current ?? groups[0]?.[0] ?? null;
  }

  private selectVisible(
    groups: readonly (readonly ResolvedCosmetic[])[],
  ): void {
    this.visibleGroups = groups;
    this.reconcileInspection(groups);
  }

  protected onTabEnter(key: string): void {
    this.selectVisible(this.groupsForTab(key));
    this.requestUpdate();
  }

  private setCosmeticsSubTab(tab: CosmeticsSubTab): void {
    this.cosmeticsSubTab = tab;
    this.selectVisible(this.cosmeticsGroups(tab));
    this.requestUpdate();
  }

  /** Display names of the bundle's items the player already owns. */
  private ownedPackItemNames(resolved: ResolvedCosmetic): string[] {
    return ownedPackItems(
      resolved.cosmetic as CosmeticPack,
      this.userMeResponse,
    ).map((item) => {
      const found = findPackItem(item, resolved.packItems ?? []);
      return found ? cosmeticSelectionLabel(found) : item.name;
    });
  }

  // Same box as a purchase button (w-full, min-h-11, text-base) so an owned
  // tier or bundle reads as a peer of its neighbours' buy action instead of
  // a small tag tucked to one side of the card.
  private renderStatus(text: string, muted = false): TemplateResult {
    return html`<span
      data-store-status
      class="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border px-2 py-1.5 text-center font-bold ${muted
        ? "border-white/15 bg-white/5 text-xs text-white/60"
        : "border-emerald-500/40 bg-emerald-500/15 text-base text-emerald-300"}"
      >${text}</span
    >`;
  }

  private renderCardAction(
    active: ResolvedCosmetic,
    userHasSubscription: boolean,
  ): TemplateResult {
    if (active.type === "subscription" && active.relationship === "owned") {
      return this.renderStatus(translateText("store.subscribed"));
    }
    if (active.type === "cosmeticPack") {
      if (active.relationship === "owned") {
        return this.renderStatus(translateText("store.pack_owned"));
      }
      if (active.relationship === "blocked") {
        return this.renderStatus(
          translateText("store.pack_partially_owned", {
            items: this.ownedPackItemNames(active).join(", "),
          }),
          true,
        );
      }
    }
    return this.renderPurchaseAction(active, userHasSubscription);
  }

  private renderCosmeticCards(
    groups: readonly (readonly ResolvedCosmetic[])[] = this.visibleGroups,
    userHasSubscription = false,
    cardClass = "block h-full min-w-0",
    previewSize: "card" | "detail" = "card",
  ): TemplateResult {
    return html`${groups.map((group) => {
      const focused = group.find((item) => item.key === this.inspected?.key);
      const active = focused ?? group[0];
      const action = this.renderCardAction(active, userHasSubscription);
      return html`<cosmetic-card
        data-store-product
        data-cosmetic-key=${group[0].key}
        class=${cardClass}
        previewSize=${previewSize}
        .resolved=${group[0]}
        .variants=${group.length > 1 ||
        group[0].type === "pattern" ||
        group[0].type === "skin"
          ? group
          : []}
        .activeVariantKey=${active.key}
        .actionContent=${action}
        state=${focused ? "focused" : "idle"}
        .onActivate=${(resolved: ResolvedCosmetic) => this.activate(resolved)}
        .onVariantActivate=${(resolved: ResolvedCosmetic) =>
          this.inspect(resolved)}
      ></cosmetic-card>`;
    })}`;
  }

  private renderPurchaseAction(
    resolved: ResolvedCosmetic,
    userHasSubscription: boolean,
  ): TemplateResult {
    const priced = resolved.cosmetic as {
      name?: string;
      product?: Product | null;
      priceHard?: number;
      priceSoft?: number;
      rarity?: string;
    } | null;
    const isPurchasable = resolved.relationship === "purchasable";
    // Only packs and subscriptions still check out in USD; cosmetics are
    // currency-only (their catalog product is always null now, but a cached
    // cosmetics.json may still carry one — never render a dollar button).
    const product =
      isPurchasable &&
      (resolved.type === "pack" || resolved.type === "subscription")
        ? (priced?.product ?? null)
        : null;
    // A tier with no Stripe listing (sold only on Steam) has no `product`;
    // its price is the tier's own, in cents.
    const subscriptionDollarPrice =
      isPurchasable && resolved.type === "subscription" && product === null
        ? formatUsdCents((resolved.cosmetic as Subscription).priceMonthly)
        : "";
    const priceHard = isPurchasable ? priced?.priceHard : undefined;
    const priceSoft = isPurchasable ? priced?.priceSoft : undefined;
    const purchase = (method: "dollar" | "hard" | "soft") =>
      purchaseCosmetic(resolved, method);
    // Currency packs check out inline (wallet button / in-page card form)
    // when the display price parses; anything else — including subscriptions,
    // which are recurring and not a PaymentIntent — keeps the redirect flow,
    // which is also what an unparseable price degrades to.
    const amountCents =
      resolved.type === "pack" && product !== null && priced?.name !== undefined
        ? priceStringToCents(product.price)
        : null;
    const inlineCheckout =
      amountCents !== null
        ? {
            request: {
              kind: "currency_pack" as const,
              packName: priced!.name!,
            },
            amountCents,
            successMessageKey: "store.currency_pack_purchase_success",
          }
        : null;
    // Reserved currency lines are assigned per visual row by
    // alignPurchaseRows() once the grid has laid out.
    return html`<purchase-button
      .product=${product}
      .dollarPrice=${subscriptionDollarPrice}
      .inlineCheckout=${inlineCheckout}
      .priceHard=${priceHard ?? null}
      .priceSoft=${priceSoft ?? null}
      .rarity=${priced?.rarity ?? "common"}
      .itemName=${cosmeticSelectionLabel(resolved)}
      .dollarLabelKey=${resolved.type === "subscription" && userHasSubscription
        ? "store.switch_button"
        : ""}
      .priceSuffix=${resolved.type === "subscription"
        ? translateText("store.price_per_month")
        : ""}
      .onPurchaseDollar=${product || subscriptionDollarPrice
        ? () => purchase("dollar")
        : undefined}
      .onPurchaseHard=${priceHard !== undefined
        ? () => purchase("hard")
        : undefined}
      .onPurchaseSoft=${priceSoft !== undefined
        ? () => purchase("soft")
        : undefined}
    ></purchase-button>`;
  }

  private renderBrowserLayout(
    cards: TemplateResult,
    gridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4",
  ): TemplateResult {
    return html`<div data-store-browser class="grid grid-cols-1 gap-4 p-3">
      <div data-store-grid class=${gridClass}>${cards}</div>
    </div>`;
  }

  private renderBrowser(
    groups: readonly (readonly ResolvedCosmetic[])[],
    options: StoreBrowserOptions,
  ): TemplateResult {
    const page = this.pages.page(
      "store-grid",
      `${this.affiliateCode ?? ""}:${this.activeTab}:${this.cosmeticsSubTab}`,
      groups,
    );
    const cards =
      groups.length === 0
        ? options.trailingContent
          ? html``
          : html`<div
              class=${`${options.emptyClass ?? "col-span-full"} py-8 text-center text-sm font-bold uppercase tracking-wider text-white/40`}
            >
              ${translateText(options.emptyTranslationKey)}
            </div>`
        : this.renderCosmeticCards(
            page.items,
            options.userHasSubscription,
            options.cardClass,
            options.previewSize,
          );
    return this.renderBrowserLayout(
      html`${cards}${page.more}${options.trailingContent ?? ""}`,
      options.gridClass,
    );
  }

  // Skins / Flags / Crowns grouped under one top-level tab; a sub-tab bar
  // (styled like effects-grid's) picks which grid shows.
  private renderCosmeticsPanel(): TemplateResult {
    const emptyKey =
      this.cosmeticsSubTab === "flags"
        ? "store.no_flags"
        : this.cosmeticsSubTab === "crowns"
          ? "store.no_crowns"
          : "store.no_skins";
    return html`
      <div
        class="flex items-center justify-center gap-6 border-b border-white/10 px-4"
      >
        ${COSMETICS_SUB_TABS.map((tab) => {
          const active = this.cosmeticsSubTab === tab;
          return html`<button
            class="-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${active
              ? "border-malibu-blue text-aquarius"
              : "border-transparent text-white/40 hover:text-white/70"}"
            @click=${() => this.setCosmeticsSubTab(tab)}
          >
            ${translateText(`store.${tab}`)}
          </button>`;
        })}
      </div>
      ${this.renderBrowser(this.visibleGroups, {
        emptyTranslationKey: emptyKey,
      })}
    `;
  }

  private renderEffectGrid(): TemplateResult {
    // A sub-tab per effectType (Boat Trail / Nuke Trail); each tab opens that
    // type's grid. Tabs are always present, even when a type has nothing to buy.
    return html`<effects-grid
      mode="purchase"
      tabbed
      .cosmetics=${this.cosmetics}
      .userMeResponse=${this.userMeResponse}
      .affiliateCode=${this.affiliateCode}
      .focusedKey=${this.inspected?.key ?? null}
      .onPurchaseFocus=${(item: ResolvedCosmetic) => this.activate(item)}
      .renderPurchaseAction=${(item: ResolvedCosmetic) =>
        this.renderPurchaseAction(item, false)}
      .onVisiblePurchaseItemsChange=${(items: readonly ResolvedCosmetic[]) => {
        this.selectVisible(items.map((item) => [item]));
        this.requestUpdate();
      }}
    ></effects-grid>`;
  }

  private handleOpenCrate(tier: "standard" | "elite" | "supreme") {
    const res = commanderStore.openSupplyCrate(tier);
    if (!res.ok) {
      showToast(`⚠️ ${res.error}`, "red", 2500);
      return;
    }
    this.lastCrateDrops = res.granted;
    showToast(
      `🎉 Coffre ouvert ! +${res.granted.length} cosmétiques ajoutés à votre Inventaire !`,
      "green",
      3000,
    );
  }

  private renderSupplyCratesSection(): TemplateResult {
    return html`
      <div class="p-4 space-y-5">
        <div
          class="rounded-2xl border border-cyan-400/30 bg-slate-900/90 p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg"
        >
          <div>
            <div
              class="text-xs font-black uppercase tracking-widest text-cyan-300"
            >
              ⚡ Ravitaillement Stratégique & Coffres Cosmétiques
            </div>
            <p
              class="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap"
            >
              <span>Gagnez des <strong>Caps</strong></span>
              <cap-icon .size=${16}></cap-icon>
              <span>en jouant des parties. Le <strong>Plutonium</strong></span>
              <plutonium-icon .size=${14}></plutonium-icon>
              <span
                >est une ressource rare réservée aux victoires épiques et aux
                packs de ravitaillement.</span
              >
            </p>
          </div>
        </div>

        ${this.lastCrateDrops.length > 0
          ? html`
              <div
                class="rounded-2xl border border-amber-400/50 bg-amber-500/10 p-4 space-y-2.5 shadow-[0_0_24px_rgba(245,158,11,0.2)]"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-black uppercase tracking-wider text-amber-300"
                  >
                    ✨ Dernier Butin Débloqué (Disponible dans votre Inventaire)
                    :
                  </span>
                  <button
                    type="button"
                    @click=${() => (this.lastCrateDrops = [])}
                    class="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕ Fermer
                  </button>
                </div>
                <div
                  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
                >
                  ${this.lastCrateDrops.map(
                    (drop) => html`
                      <div
                        class="rounded-xl bg-slate-950/90 border border-amber-400/40 p-3 flex flex-col justify-between"
                      >
                        <span
                          class="text-[10px] font-black uppercase tracking-widest ${drop.rarity ===
                          "legendary"
                            ? "text-amber-400"
                            : drop.rarity === "epic"
                              ? "text-purple-400"
                              : drop.rarity === "rare"
                                ? "text-cyan-400"
                                : "text-emerald-400"}"
                        >
                          ● ${drop.rarity}
                        </span>
                        <div
                          class="text-xs font-extrabold text-white mt-1 capitalize"
                        >
                          ${drop.label}
                        </div>
                      </div>
                    `,
                  )}
                </div>
              </div>
            `
          : ""}

        <!-- DIRECT PLUTONIUM PACKS (Point 5) -->
        <div class="mt-8 mb-2">
          <div
            class="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2"
          >
            <plutonium-icon .size=${16}></plutonium-icon>
            <span>Recharges Immédiates de Plutonium (Stripe)</span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Ajoutez du Plutonium instantanément pour débloquer coffres et
            cosmétiques sans délai.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- 250 PLUTONIUM -->
          <div
            class="rounded-2xl border border-slate-700 bg-slate-900/90 p-4 flex flex-col justify-between shadow-md hover:border-emerald-400/50 transition-all"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-2xl">☢️</span>
                <span
                  class="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300"
                >
                  1,49 €
                </span>
              </div>
              <h4 class="mt-2 text-base font-black text-white">
                250 Plutonium
              </h4>
              <p class="text-[11px] text-slate-300 mt-1">
                Réserve rapide pour ouvrir 1 coffre ou personnaliser votre
                profil.
              </p>
            </div>
            <button
              type="button"
              @click=${() => this.handleBuyStripeBundle("plutonium_250")}
              class="mt-4 w-full cursor-pointer rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-black uppercase text-white shadow"
            >
              Acheter · 1,49 €
            </button>
          </div>

          <!-- 600 PLUTONIUM -->
          <div
            class="rounded-2xl border border-indigo-500/50 bg-slate-900/95 p-4 flex flex-col justify-between shadow-lg relative overflow-hidden"
          >
            <div
              class="absolute -right-8 top-3 rotate-45 bg-indigo-600 text-[9px] font-black uppercase px-8 text-white"
            >
              BEST-SELLER
            </div>
            <div>
              <div class="flex items-center justify-between">
                <span class="text-2xl">☢️</span>
                <span
                  class="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300"
                >
                  2,99 €
                </span>
              </div>
              <h4 class="mt-2 text-base font-black text-white">
                600 Plutonium
              </h4>
              <p class="text-[11px] text-slate-300 mt-1">
                Idéal pour coffre Cyber-Élite + cosmétiques de navires.
              </p>
            </div>
            <button
              type="button"
              @click=${() => this.handleBuyStripeBundle("plutonium_600")}
              class="mt-4 w-full cursor-pointer rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-black uppercase text-white shadow"
            >
              Acheter · 2,99 €
            </button>
          </div>

          <!-- 1700 PLUTONIUM -->
          <div
            class="rounded-2xl border border-amber-400/50 bg-slate-900/95 p-4 flex flex-col justify-between shadow-lg hover:border-amber-300 transition-all"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-2xl">☢️🔥</span>
                <span
                  class="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300"
                >
                  6,99 €
                </span>
              </div>
              <h4 class="mt-2 text-base font-black text-amber-300">
                1 700 Plutonium
              </h4>
              <p class="text-[11px] text-slate-300 mt-1">
                1 500 + 200 Plutonium OFFERTS. Le plein pour les coffres
                Suprêmes.
              </p>
            </div>
            <button
              type="button"
              @click=${() => this.handleBuyStripeBundle("plutonium_1700")}
              class="mt-4 w-full cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 py-2.5 text-xs font-black uppercase text-slate-950 shadow"
            >
              Acheter · 6,99 €
            </button>
          </div>
        </div>

        <!-- 3 SUPPLY CRATE TIERS -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            class="rounded-2xl border border-emerald-500/35 bg-slate-900/85 p-5 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-3xl">📦</span>
                <span
                  class="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300"
                >
                  Commun / Rare
                </span>
              </div>
              <h3 class="mt-3 text-lg font-black text-white uppercase">
                Coffre Tactique Standard
              </h3>
              <p class="mt-1 text-xs text-slate-300 leading-relaxed">
                Débloque
                <strong>2 cosmétiques aléatoires non possédés</strong> (Motifs
                de territoire, Palettes ou Effets visuels).
              </p>
            </div>
            <button
              type="button"
              @click=${() => this.handleOpenCrate("standard")}
              class="mt-4 w-full cursor-pointer rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Ouvrir · 2 500</span>
              <cap-icon .size=${16}></cap-icon>
              <span>Caps</span>
            </button>
          </div>

          <div
            class="rounded-2xl border border-cyan-500/45 bg-slate-900/90 p-5 flex flex-col justify-between shadow-[0_0_24px_rgba(6,182,212,0.15)]"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-3xl">💠</span>
                <span
                  class="rounded-md bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-300"
                >
                  Rare / Épique+
                </span>
              </div>
              <h3 class="mt-3 text-lg font-black text-white uppercase">
                Coffre Cyber-Élite
              </h3>
              <p class="mt-1 text-xs text-slate-300 leading-relaxed">
                Débloque
                <strong>3 cosmétiques de rareté supérieure</strong> (Sillages
                Plasma, Motifs Radar/Circuits, Couronnes ou Effets de Navires).
              </p>
            </div>
            <button
              type="button"
              @click=${() => this.handleOpenCrate("elite")}
              class="mt-4 w-full cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Ouvrir · 450</span>
              <plutonium-icon .size=${16}></plutonium-icon>
              <span>Plutonium</span>
            </button>
          </div>

          <div
            class="rounded-2xl border border-amber-400/50 bg-slate-900/95 p-5 flex flex-col justify-between shadow-[0_0_28px_rgba(245,158,11,0.2)]"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-3xl">👑</span>
                <span
                  class="rounded-md bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300"
                >
                  Épique / Légendaire
                </span>
              </div>
              <h3 class="mt-3 text-lg font-black text-amber-300 uppercase">
                Coffre Singularity Suprême
              </h3>
              <p class="mt-1 text-xs text-slate-300 leading-relaxed">
                Débloque
                <strong>4 cosmétiques Épiques ou Légendaires</strong> en
                priorité (Explosions Supernova/MIRV, Spirales Nucléaires 3D,
                Motifs Légendaires).
              </p>
            </div>
            <button
              type="button"
              @click=${() => this.handleOpenCrate("supreme")}
              class="mt-4 w-full cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Ouvrir · 900</span>
              <plutonium-icon .size=${16}></plutonium-icon>
              <span>Plutonium</span>
            </button>
          </div>
          <!-- VIP STATUS PASS (Point 2) -->
          <div
            class="col-span-full rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5"
          >
            <div class="space-y-1.5 text-center md:text-left">
              <div
                class="flex items-center justify-center md:justify-start gap-2"
              >
                <span class="text-2xl">🌟</span>
                <span
                  class="text-sm font-black uppercase tracking-wider text-amber-300"
                >
                  Statut VIP Commandant · Abonnement Mensuel Confort (2,99 € /
                  mois)
                </span>
                ${commanderStore.isVipActive()
                  ? html`<span
                      class="rounded bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest"
                    >
                      ACTIF
                    </span>`
                  : ""}
              </div>
              <p class="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Avantages exclusifs en jeu :
                <strong>Forge de skin personnalisé offerte</strong>,
                <strong>Pseudo doré et badge VIP</strong>,
                <strong>+25% de Caps</strong> sur chaque partie,
                <strong>+2 XP bonus</strong> et hébergement de salons privés
                sans restriction.
              </p>
            </div>
            <div class="shrink-0 w-full md:w-auto">
              <button
                type="button"
                @click=${() => this.handleBuyStripeBundle("vip_status_30d")}
                class="w-full md:w-56 cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span
                  >${commanderStore.isVipActive()
                    ? "Prolonger (+30 Jours) · 2,99 €"
                    : "Devenir VIP · 2,99 € / mois"}</span
                >
              </button>
            </div>
          </div>

          <!-- NOUVEAU MODULE : FORGE DE SKIN PERSONNALISÉ -->
          <div
            class="col-span-full rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-purple-950/40 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5"
          >
            <div class="space-y-1.5 text-center md:text-left">
              <div
                class="flex items-center justify-center md:justify-start gap-2"
              >
                <span class="text-2xl">🎨</span>
                <span
                  class="text-sm font-black uppercase tracking-wider text-cyan-300"
                >
                  Pass Forge de Skin de Territoire Personnalisé (3,99 €)
                </span>
                <span
                  class="rounded bg-cyan-400 text-slate-950 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest"
                >
                  NOUVEAU
                </span>
              </div>
              <p class="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Importez <strong>votre propre image, logo ou photo</strong> pour
                remplacer les motifs standards du jeu. Votre skin sera projeté
                sur votre territoire et
                <strong>visible par tous les joueurs</strong> en multijoueur !
                <em>(Également inclus gratuitement avec l'abonnement VIP)</em>
              </p>
            </div>
            <div
              class="shrink-0 flex flex-col sm:flex-row gap-2.5 w-full md:w-auto"
            >
              <button
                type="button"
                @click=${() => this.setActiveTab("custom_skin")}
                class="w-full md:w-44 cursor-pointer rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-400/50 py-3 text-xs font-black uppercase tracking-wider text-cyan-300 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Ouvrir l'Atelier 🎨</span>
              </button>
              <button
                type="button"
                @click=${() => this.handleBuyStripeBundle("custom_skin_pass")}
                class="w-full md:w-48 cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Acheter le Pass · 3,99 €</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderPackGrid(): TemplateResult {
    return html`
      ${this.renderSupplyCratesSection()}
      ${this.renderBrowser(this.visibleGroups, {
        emptyTranslationKey: "store.no_packs",
        gridClass: "flex flex-wrap gap-4 justify-center",
        cardClass: "w-[calc(50%-0.5rem)] sm:w-48",
        previewSize: "detail",
      })}
    `;
  }

  private checkStripeRedirectReturn() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentSuccess = urlParams.get("payment_success");
      const sessionId = urlParams.get("session_id");

      if (paymentSuccess === "true" && sessionId) {
        // Clean up URL without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.ok && data.paid) {
              showToast(
                "🎉 Paiement validé ! Votre bundle a été crédité à votre compte !",
                "green",
                5000,
              );
              // Refresh user profile
              this.onUserMe(commanderStore.getLocalUserMeResponse());
            }
          })
          .catch((e) => console.error("Stripe verify failed:", e));
      } else if (urlParams.get("payment_cancel") === "true") {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        showToast("ℹ️ Paiement annulé.", "green", 3000);
      }
    } catch (e) {
      console.warn("Stripe check redirect error:", e);
    }
  }

  private async handleBuyStripeBundle(bundleId: string) {
    const email =
      this.userMeResponse !== false && this.userMeResponse.user?.email
        ? this.userMeResponse.user.email
        : commanderStore.getEmail();

    if (!email) {
      showToast(
        "⚠️ Veuillez d'abord vous connecter avec votre adresse email (Menu Compte).",
        "red",
        3500,
      );
      return;
    }

    showToast("💳 Préparation du paiement sécurisé Stripe...", "green", 3000);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId, email }),
      });
      const data = await res.json();
      if (!data.ok || !data.checkoutUrl) {
        showToast(
          `⚠️ Erreur : ${data.error || "Impossible de joindre Stripe"}`,
          "red",
          3500,
        );
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      showToast(`⚠️ Erreur réseau : ${err.message}`, "red", 3500);
    }
  }

  private renderStripeBundlesSection(): TemplateResult {
    return html`
      <div class="p-4 space-y-5">
        <div
          class="rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-slate-900/95 via-indigo-950/40 to-slate-900/95 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl"
        >
          <div>
            <div
              class="text-xs font-black uppercase tracking-widest text-indigo-400"
            >
              ⭐ Bundles Officiels du Commandant · Paiement Sécurisé Stripe
            </div>
            <p class="text-xs sm:text-sm text-slate-300 mt-1">
              Soutenez le développement de BorderConflict et débloquez du
              Plutonium, des cosmétiques rares et des couronnes animées
              légendaires.
            </p>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>🔒 Carte Bancaire / Apple Pay / Google Pay</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- BUNDLE 1 : 0.99 EUR -->
          <div
            class="rounded-2xl border border-slate-700 hover:border-emerald-500/60 bg-slate-900/90 p-5 flex flex-col justify-between shadow-lg transition-all"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-2xl">🎖️</span>
                <span
                  class="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-xs font-black uppercase text-emerald-300"
                >
                  0,99 €
                </span>
              </div>
              <h3 class="mt-3 text-lg font-black text-white uppercase">
                Kit de Recrue Stratégique
              </h3>
              <p class="mt-1 text-xs text-slate-300 leading-relaxed">
                Le pack découverte idéal pour démarrer avec style :
              </p>
              <ul class="mt-2.5 space-y-1.5 text-xs text-slate-200 font-medium">
                <li class="flex items-center gap-1.5">
                  <plutonium-icon .size=${14}></plutonium-icon>
                  <span><strong>+120 Plutonium</strong></span>
                </li>
                <li class="flex items-center gap-1.5">
                  <cap-icon .size=${14}></cap-icon>
                  <span><strong>+1 500 Caps</strong></span>
                </li>
                <li>👑 <strong>Couronne Vanguard d'Argent</strong></li>
                <li>🏷️ Titre de profil <em>« Recrue d'Élite »</em></li>
              </ul>
            </div>
            <button
              type="button"
              @click=${() => this.handleBuyStripeBundle("bundle_recrue")}
              class="mt-5 w-full cursor-pointer rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Acheter · 0,99 €</span>
            </button>
          </div>

          <!-- BUNDLE 2 : 2.99 EUR -->
          <div
            class="rounded-2xl border border-indigo-500/50 hover:border-indigo-400 bg-slate-900/95 p-5 flex flex-col justify-between shadow-[0_0_24px_rgba(99,102,241,0.2)] transition-all relative overflow-hidden"
          >
            <div
              class="absolute -right-12 top-4 rotate-45 bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white py-1 px-12 shadow"
            >
              POPULAIRE
            </div>
            <div>
              <div class="flex items-center justify-between">
                <span class="text-2xl">⚡</span>
                <span
                  class="rounded-md bg-indigo-500/20 border border-indigo-400/40 px-2 py-0.5 text-xs font-black uppercase text-indigo-300"
                >
                  2,99 €
                </span>
              </div>
              <h3 class="mt-3 text-lg font-black text-indigo-200 uppercase">
                Pack Officier de Terrain
              </h3>
              <p class="mt-1 text-xs text-slate-300 leading-relaxed">
                Le meilleur rapport valeur/prix pour régner sur le front :
              </p>
              <ul class="mt-2.5 space-y-1.5 text-xs text-slate-200 font-medium">
                <li class="flex items-center gap-1.5">
                  <plutonium-icon .size=${14}></plutonium-icon>
                  <span><strong>+450 Plutonium</strong></span>
                </li>
                <li class="flex items-center gap-1.5">
                  <cap-icon .size=${14}></cap-icon>
                  <span><strong>+6 000 Caps</strong></span>
                </li>
                <li>✨ <strong>Couronne Animée Plasma Pulsar</strong></li>
                <li>🌊 <strong>Sillage de Navire Plasma</strong></li>
                <li>📦 <strong>1 Caisse Cyber-Élite</strong> offerte</li>
              </ul>
            </div>
            <button
              type="button"
              @click=${() => this.handleBuyStripeBundle("bundle_officier")}
              class="mt-5 w-full cursor-pointer rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Acheter · 2,99 €</span>
            </button>
          </div>

          <!-- BUNDLE 3 : 4.99 EUR -->
          <div
            class="rounded-2xl border border-amber-400/60 hover:border-amber-300 bg-slate-900/95 p-5 flex flex-col justify-between shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="text-2xl">👑</span>
                <span
                  class="rounded-md bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-xs font-black uppercase text-amber-300"
                >
                  4,99 €
                </span>
              </div>
              <h3 class="mt-3 text-lg font-black text-amber-300 uppercase">
                Édition Suprême Commandant
              </h3>
              <p class="mt-1 text-xs text-slate-300 leading-relaxed">
                L'arsenal ultime réservé aux commandants légendaires :
              </p>
              <ul class="mt-2.5 space-y-1.5 text-xs text-slate-200 font-medium">
                <li class="flex items-center gap-1.5">
                  <plutonium-icon .size=${14}></plutonium-icon>
                  <span><strong>+950 Plutonium</strong></span>
                </li>
                <li class="flex items-center gap-1.5">
                  <cap-icon .size=${14}></cap-icon>
                  <span><strong>+15 000 Caps</strong></span>
                </li>
                <li>🌟 <strong>Couronne Animée Supernova Royale</strong></li>
                <li>💥 <strong>Effet d'Impact MIRV Personnalisé</strong></li>
                <li>
                  🏆 <strong>1 Caisse Suprême Singularity</strong> offerte
                </li>
              </ul>
            </div>
            <button
              type="button"
              @click=${() => this.handleBuyStripeBundle("bundle_supreme")}
              class="mt-5 w-full cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Acheter · 4,99 €</span>
            </button>
          </div>
          <!-- VIP STATUS PASS (Point 2) -->
          <div
            class="col-span-full rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5"
          >
            <div class="space-y-1.5 text-center md:text-left">
              <div
                class="flex items-center justify-center md:justify-start gap-2"
              >
                <span class="text-2xl">🌟</span>
                <span
                  class="text-sm font-black uppercase tracking-wider text-amber-300"
                >
                  Statut VIP Commandant · Abonnement Mensuel Confort (2,99 € /
                  mois)
                </span>
                ${commanderStore.isVipActive()
                  ? html`<span
                      class="rounded bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest"
                    >
                      ACTIF
                    </span>`
                  : ""}
              </div>
              <p class="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Avantages exclusifs en jeu :
                <strong>Forge de skin personnalisé offerte</strong>,
                <strong>Pseudo doré et badge VIP</strong>,
                <strong>+25% de Caps</strong> sur chaque partie,
                <strong>+2 XP bonus</strong> et hébergement de salons privés
                sans restriction.
              </p>
            </div>
            <div class="shrink-0 w-full md:w-auto">
              <button
                type="button"
                @click=${() => this.handleBuyStripeBundle("vip_status_30d")}
                class="w-full md:w-56 cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span
                  >${commanderStore.isVipActive()
                    ? "Prolonger (+30 Jours) · 2,99 €"
                    : "Devenir VIP · 2,99 € / mois"}</span
                >
              </button>
            </div>
          </div>

          <!-- NOUVEAU MODULE : FORGE DE SKIN PERSONNALISÉ -->
          <div
            class="col-span-full rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-purple-950/40 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5"
          >
            <div class="space-y-1.5 text-center md:text-left">
              <div
                class="flex items-center justify-center md:justify-start gap-2"
              >
                <span class="text-2xl">🎨</span>
                <span
                  class="text-sm font-black uppercase tracking-wider text-cyan-300"
                >
                  Pass Forge de Skin de Territoire Personnalisé (3,99 €)
                </span>
                <span
                  class="rounded bg-cyan-400 text-slate-950 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest"
                >
                  NOUVEAU
                </span>
              </div>
              <p class="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Importez <strong>votre propre image, logo ou photo</strong> pour
                remplacer les motifs standards du jeu. Votre skin sera projeté
                sur votre territoire et
                <strong>visible par tous les joueurs</strong> en multijoueur !
                <em>(Également inclus gratuitement avec l'abonnement VIP)</em>
              </p>
            </div>
            <div
              class="shrink-0 flex flex-col sm:flex-row gap-2.5 w-full md:w-auto"
            >
              <button
                type="button"
                @click=${() => this.setActiveTab("custom_skin")}
                class="w-full md:w-44 cursor-pointer rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-400/50 py-3 text-xs font-black uppercase tracking-wider text-cyan-300 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Ouvrir l'Atelier 🎨</span>
              </button>
              <button
                type="button"
                @click=${() => this.handleBuyStripeBundle("custom_skin_pass")}
                class="w-full md:w-48 cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Acheter le Pass · 3,99 €</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderBundleGrid(): TemplateResult {
    return html`${this.renderStripeBundlesSection()}${this.renderBrowser(
      this.visibleGroups,
      {
        emptyTranslationKey: "store.no_bundles",
      },
    )}${this.openedPack && !this.previewingCosmetic
      ? // The dialog is portaled above the modal's stacking context, so a
        // preview opened from one of its items would render underneath it.
        // Yield to the preview; the dialog comes back when it closes.
        html`<pack-contents-dialog
          .pack=${this.openedPack}
          .actionContent=${this.renderCardAction(this.openedPack, false)}
          @close=${() => this.closePack()}
        ></pack-contents-dialog>`
      : ""}`;
  }

  private renderSubscriptionGrid(): TemplateResult {
    // Drives the "Switch" label on the other tiers' buy buttons. A granted
    // player is deliberately NOT counted (OPE-440): they have nothing to
    // switch from — nobody is billing them — so every tier, theirs included,
    // is a first purchase and reads as a plain price.
    const sub =
      this.userMeResponse === false
        ? null
        : this.userMeResponse.player.subscription;
    const userHasSubscription = sub !== null && !isGrantedSubscription(sub);
    // The Steam store lists one tier; a lone card in the narrow tile column
    // reads as a cramped list, so it gets a wider card and a larger preview.
    const lone = this.visibleGroups.length === 1;
    return this.renderBrowser(this.visibleGroups, {
      emptyTranslationKey: "store.no_subscriptions",
      userHasSubscription,
      gridClass:
        "flex flex-wrap items-stretch justify-center content-start gap-4 p-4 sm:p-8",
      cardClass: lone
        ? "block w-full max-w-xs shrink-0"
        : "block w-[calc(50%-0.5rem)] max-w-48 shrink-0 sm:w-48",
      previewSize: lone ? "detail" : "card",
      emptyClass:
        "w-full py-8 text-center text-sm font-bold uppercase tracking-wider text-white/40",
    });
  }

  protected renderHeaderSlot() {
    return html`${this.renderHeader()}
    ${this.previewingCosmetic
      ? html`<cosmetic-preview-modal
          .resolved=${this.previewingCosmetic}
          @close-preview=${() => {
            this.previewingCosmetic = null;
            this.requestUpdate();
          }}
        ></cosmetic-preview-modal>`
      : ""}`;
  }

  protected renderBody(key: string): TemplateResult {
    if (this.affiliateCode) {
      return this.renderAffiliateGrid();
    }
    switch (key as StoreTab) {
      case "cosmetics":
        return this.renderCosmeticsPanel();
      case "bundles":
        return this.renderBundleGrid();
      case "custom_skin":
        return html`<custom-skin-studio></custom-skin-studio>`;
      case "season_pass":
        return this.renderSeasonPassSection();
      case "effects":
        return this.renderEffectGrid();
      case "subscriptions":
        return this.renderSubscriptionGrid();
      case "tribes":
        return this.renderTribeGrid();
      case "packs":
      default:
        return this.renderPackGrid();
    }
  }

  private renderSeasonPassSection(): TemplateResult {
    const hasPass = commanderStore.hasSeasonPass();
    const profile = commanderStore.getProfile();
    const currentLevel = profile.level;
    const maxSeasonLevel = 30;

    const milestones = [
      { lvl: 1, free: "500 Caps", premium: "Couronne Atomic Conqueror" },
      { lvl: 5, free: "Titre Recrue", premium: "+150 Plutonium" },
      { lvl: 10, free: "1 000 Caps", premium: "Motif Rad-Active Néon" },
      { lvl: 15, free: "Caisse Standard", premium: "Sillage Missile Plasma" },
      { lvl: 20, free: "1 500 Caps", premium: "+350 Plutonium" },
      { lvl: 25, free: "Titre Stratège", premium: "Caisse Cyber-Élite" },
      {
        lvl: 30,
        free: "3 000 Caps",
        premium: "Couronne Animée Singularity Lord",
      },
    ];

    return html`
      <div class="p-4 space-y-6">
        <!-- HEADER BANNER -->
        <div
          class="rounded-3xl border border-red-500/40 bg-gradient-to-r from-red-950/60 via-slate-900/90 to-amber-950/50 p-6 shadow-2xl relative overflow-hidden"
        >
          <div
            class="flex flex-col lg:flex-row items-center justify-between gap-6"
          >
            <div class="space-y-2 text-center lg:text-left">
              <div
                class="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-400/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-300"
              >
                <span>🔥 SAISON 1</span>
                <span>•</span>
                <span>TEMPÊTE NUCLÉAIRE</span>
              </div>
              <h2
                class="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase"
              >
                Pass de Saison Stratégique
              </h2>
              <p
                class="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed"
              >
                Montez de niveau en jouant des batailles multijoueur. Débloquez
                30 paliers de butin : chaque palier offre une récompense
                gratuite, et la voie <strong>Premium</strong> débloque l'arsenal
                atomique complet.
              </p>
            </div>

            <div class="shrink-0 flex flex-col items-center gap-3">
              ${hasPass
                ? html`
                    <div
                      class="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-6 py-4 text-center"
                    >
                      <span
                        class="text-emerald-300 text-xs font-black uppercase tracking-widest block"
                      >
                        ✓ PASS PREMIUM ACTIF
                      </span>
                      <span class="text-white text-xs mt-1 block"
                        >Toutes les récompenses débloquées au fil de vos
                        niveaux</span
                      >
                    </div>
                  `
                : html`
                    <div class="text-center">
                      <span class="text-xs text-slate-400 block mb-1"
                        >Accès illimité à la voie Premium</span
                      >
                      <button
                        type="button"
                        @click=${() =>
                          this.handleBuyStripeBundle("battle_pass_s1")}
                        class="cursor-pointer rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 px-8 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(239,68,68,0.35)] transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>Débloquer le Pass · 4,99 €</span>
                      </button>
                    </div>
                  `}
            </div>
          </div>

          <!-- PROGRESS BAR -->
          <div class="mt-6 pt-5 border-t border-white/10">
            <div
              class="flex items-center justify-between text-xs font-bold text-slate-300 mb-2"
            >
              <span
                >Progression Saisonnière : Niveau ${currentLevel} /
                ${maxSeasonLevel}</span
              >
              <span class="text-amber-400"
                >${Math.min(
                  100,
                  Math.round((currentLevel / maxSeasonLevel) * 100),
                )}%
                complété</span
              >
            </div>
            <div
              class="w-full bg-slate-950/80 rounded-full h-3 border border-white/10 overflow-hidden"
            >
              <div
                class="bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 h-full transition-all duration-500"
                style="width: ${Math.min(
                  100,
                  (currentLevel / maxSeasonLevel) * 100,
                )}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- 30 TIERS MILESTONES PREVIEW -->
        <div class="space-y-3">
          <div
            class="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2"
          >
            <span>🏆 Paliers Clés de la Saison 1</span>
          </div>

          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          >
            ${milestones.map(
              (m) => html`
                <div
                  class="rounded-2xl border ${currentLevel >= m.lvl
                    ? "border-amber-400/50 bg-slate-900/90"
                    : "border-slate-800 bg-slate-950/70"} p-4 flex flex-col justify-between shadow transition-all"
                >
                  <div class="flex items-center justify-between">
                    <span
                      class="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-slate-300"
                    >
                      NIVEAU ${m.lvl}
                    </span>
                    ${currentLevel >= m.lvl
                      ? html`<span
                          class="text-[10px] font-black text-emerald-400"
                          >ATTEINT</span
                        >`
                      : html`<span class="text-[10px] font-black text-slate-500"
                          >VERROUILLÉ</span
                        >`}
                  </div>

                  <div class="mt-3 space-y-2 text-xs">
                    <div
                      class="p-2 rounded-lg bg-slate-950/60 border border-white/5"
                    >
                      <span
                        class="text-[10px] font-bold uppercase text-slate-400 block"
                        >Piste Gratuite</span
                      >
                      <span class="font-extrabold text-slate-200"
                        >${m.free}</span
                      >
                    </div>

                    <div
                      class="p-2 rounded-lg ${hasPass
                        ? "bg-amber-500/10 border border-amber-400/30"
                        : "bg-red-950/30 border border-red-500/20"}"
                    >
                      <span
                        class="text-[10px] font-bold uppercase text-amber-400 block flex items-center justify-between"
                      >
                        <span>Piste Premium</span>
                        ${!hasPass
                          ? html`<span class="text-[9px] text-red-400"
                              >🔒 Pass Requis</span
                            >`
                          : ""}
                      </span>
                      <span class="font-extrabold text-amber-300"
                        >${m.premium}</span
                      >
                    </div>
                  </div>
                </div>
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }

  private renderTribeGrid(): TemplateResult {
    // The panel's `false` branch is a sign-in prompt, i.e. a logged-out
    // state; hold it back until the session is known (see authSettled).
    if (!this.authSettled) return html``;
    return html`<tribes-panel
      .userMeResponse=${this.userMeResponse}
    ></tribes-panel>`;
  }

  private renderAffiliateGrid(): TemplateResult {
    return this.renderBrowser(this.visibleGroups, {
      emptyTranslationKey: "store.no_affiliate_items",
    });
  }

  protected async onOpen(args?: Record<string, unknown>) {
    // Drain any Steam overlay approval parked before this UI existed. The
    // main process's "something arrived" nudge is contentless, so one that
    // fired with no window listening is heard by nobody and sits parked until
    // something drains it -- which makes this required on every open, not an
    // optimisation.
    void reportPendingSteamAuthorizations();
    const affiliate =
      typeof args?.affiliateCode === "string" ? args.affiliateCode : null;
    this.affiliateCode = affiliate;
    this.requestedItem = typeof args?.item === "string" ? args.item : null;
    if (this.requestedItem !== null) {
      this.cosmeticsSubTab = subTabForItem(this.requestedItem);
    }
    this.cosmetics ??= await fetchCosmetics();
    this.selectVisible(this.groupsForTab(this.activeTab));
    await this.refresh();
  }

  protected onClose(): void {
    // The store hides via CSS (inline modal), so the tiles never disconnect
    // and an open card-payment modal — portaled to <body> — would float over
    // the play page after Escape closes the store. Close it explicitly.
    for (const inline of this.querySelectorAll<InlineCheckout>(
      "inline-checkout",
    )) {
      inline.closeCardModal();
    }
    this.affiliateCode = null;
    this.openedPack = null;
    this.previewingCosmetic = null;
    this.pages.reset();
    this.requestedItem = null;
    this.selectVisible(this.groupsForTab(this.activeTab));
  }

  public async refresh() {
    this.requestUpdate();
  }
}
