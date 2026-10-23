import { assetUrl } from "@openfront/shared/AssetUrls";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  COMMANDER_UPDATED_EVENT,
  commanderStore,
} from "../CommanderStore";
import "./CapIcon";
import "./NavAccountMenu";
import { NavNotificationsController } from "./NavNotificationsController";
import "./NavUtilityIcons";
import "./PlutoniumIcon";

@customElement("desktop-nav-bar")
export class DesktopNavBar extends LitElement {
  private _notifications = new NavNotificationsController(this);
  @state() private _profile = commanderStore.getProfile();
  @state() private _commanderLevel = commanderStore.getProfile().level;
  @state() private _availablePoints = commanderStore.getAvailablePoints();

  private _onCommanderUpdated = () => {
    this._profile = commanderStore.getProfile();
    this._commanderLevel = this._profile.level;
    this._availablePoints = commanderStore.getAvailablePoints();
  };

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("showPage", this._onShowPage);
    window.addEventListener(
      COMMANDER_UPDATED_EVENT,
      this._onCommanderUpdated,
    );

    const current = window.currentPageId;
    if (current) {
      // Wait for render
      this.updateComplete.then(() => {
        this._updateActiveState(current);
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("showPage", this._onShowPage);
    window.removeEventListener(
      COMMANDER_UPDATED_EVENT,
      this._onCommanderUpdated,
    );
  }

  private _onShowPage = (e: Event) => {
    const pageId = (e as CustomEvent).detail;
    this._updateActiveState(pageId);
  };

  private _updateActiveState(pageId: string) {
    this.querySelectorAll(".nav-menu-item").forEach((el) => {
      if ((el as HTMLElement).dataset.page === pageId) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  }

  render() {
    window.currentPageId ??= "page-play";
    const currentPage = window.currentPageId;

    return html`
      <nav
        class="hidden lg:flex w-full bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.4)] items-center justify-center gap-8 py-4 shrink-0 z-50 relative"
      >
        <div class="flex flex-col items-center justify-center">
          <div class="h-8">
            <img
              class="block h-full w-auto max-w-[220px]"
              src=${assetUrl("images/OpenFrontLogo.svg")}
              alt="BorderConflict"
            />
          </div>
          <div
            id="game-version"
            class="l-header__highlightText text-center text-[10px] tracking-wider text-cyan-400/70 font-mono mt-0.5"
          ></div>
        </div>
        <button
          class="nav-menu-item ${currentPage === "page-play"
            ? "active"
            : ""} text-white/70 hover:text-malibu-blue  font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue "
          data-page="page-play"
          data-i18n="main.play"
        ></button>
        <div class="relative">
          <button
            class="nav-menu-item ${currentPage === "page-doctrines"
              ? "active"
              : ""} flex items-center gap-2 text-cyan-300 hover:text-cyan-200 font-bold tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-cyan-400"
            data-page="page-doctrines"
          >
            <span>⚡ Doctrines</span>
            <span
              class="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[11px] font-extrabold text-cyan-300"
            >
              Niv.${this._commanderLevel}
            </span>
          </button>
          ${this._availablePoints > 0
            ? html`
                <span
                  class="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950 shadow"
                  title="${this._availablePoints} Points de Doctrine disponibles"
                >
                  ${this._availablePoints}
                </span>
              `
            : ""}
        </div>
        <!-- Desktop Navigation Menu Items -->
        <div class="relative no-game-portal">
          <button
            class="nav-menu-item ${currentPage === "page-item-store"
              ? "active"
              : ""} text-white/70 hover:text-malibu-blue  font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue "
            data-page="page-item-store"
            data-i18n="main.store"
            @click=${this._notifications.onStoreClick}
          ></button>
          ${this._notifications.showStoreDot()
            ? html`
                <span
                  class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"
                ></span>
                <span
                  class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                ></span>
              `
            : ""}
        </div>
        <button
          class="nav-menu-item ${currentPage === "page-inventory"
            ? "active"
            : ""} text-white/70 hover:text-malibu-blue font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue"
          data-page="page-inventory"
          data-i18n="main.inventory"
        ></button>
        <button
          class="nav-menu-item text-white/70 hover:text-malibu-blue  font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue "
          data-page="page-leaderboard"
          data-i18n="main.leaderboard"
        ></button>
        <button
          class="no-game-portal nav-menu-item text-white/70 hover:text-blue-500 font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-blue-500"
          data-page="page-clan"
          data-i18n="main.clans"
        ></button>
        <!-- Commander Currencies (Live Plutonium & Caps - aligned with Boutique) -->
        <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/25 text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <span class="flex items-center gap-1.5 text-green-400 font-bold" title="Plutonium (Devise Tactique)">
            <plutonium-icon .size=${16}></plutonium-icon>
            <span>${this._profile.plutonium.toLocaleString("fr-FR")}</span>
          </span>
          <span class="w-px h-3.5 bg-white/15"></span>
          <span class="flex items-center gap-1.5 text-amber-500 font-bold" title="Capsules de Territoire">
            <cap-icon .size=${18}></cap-icon>
            <span>${this._profile.caps.toLocaleString("fr-FR")}</span>
          </span>
        </div>
        <!-- Utility cluster: bell, help, settings and the profile control are
             account/notification/utility affordances rather than page links,
             so they sit tight together behind a divider instead of in the nav
             item list. -->
        <div class="flex items-center gap-1 pl-5 ml-1 border-l border-white/10">
          <nav-utility-icons size="desktop"></nav-utility-icons>
          <nav-account-menu variant="desktop"></nav-account-menu>
        </div>
      </nav>
    `;
  }
}
