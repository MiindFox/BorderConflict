import { assetUrl } from "@openfront/shared/AssetUrls";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { COMMANDER_UPDATED_EVENT, commanderStore } from "../CommanderStore";
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
    window.addEventListener(COMMANDER_UPDATED_EVENT, this._onCommanderUpdated);

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

  private _handleDeployCombat = () => {
    window.dispatchEvent(new CustomEvent("showPage", { detail: "page-play" }));
    document.dispatchEvent(new CustomEvent("trigger-quick-deploy"));
  };

  render() {
    window.currentPageId ??= "page-play";
    const currentPage = window.currentPageId;

    return html`
      <nav
        class="hidden lg:flex w-full bg-[#1e261f] border-b-2 border-[#121713] shadow-[0_6px_20px_rgba(0,0,0,0.8)] items-center justify-between px-4 py-2 shrink-0 z-50 relative select-none"
      >
        <!-- Left: BORDERCONFLICT Pixel Logo in Recessed Metal Slot -->
        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded bg-[#111712] border-2 border-[#324034] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] cursor-pointer hover:border-red-500/50 transition-all"
            @click=${() =>
              window.dispatchEvent(
                new CustomEvent("showPage", { detail: "page-play" }),
              )}
            title="Accueil BorderConflict"
          >
            <span
              class="font-pixel text-red-500 text-xs sm:text-sm tracking-wider glow-red select-none whitespace-nowrap"
            >
              BORDERCONFLICT
            </span>
          </div>
        </div>

        <!-- Center: Tactile Military Command Buttons -->
        <div class="flex items-center gap-2">
          <!-- JOUER & DOCTRINES -->
          <div
            class="flex items-center gap-1.5 p-1 rounded bg-[#171f18] border border-[#2e3b30] shadow-inner"
          >
            <button
              class="nav-menu-item retro-metal-btn ${currentPage === "page-play"
                ? "ring-2 ring-amber-400 brightness-110"
                : ""} px-3 py-1.5 rounded text-[11px] font-retro text-amber-100 font-black tracking-wider uppercase cursor-pointer"
              data-page="page-play"
            >
              JOUER
            </button>
            <!-- DOCTRINES (TALENTS) -->
            <button
              type="button"
              @click=${() =>
                window.dispatchEvent(
                  new CustomEvent("showPage", { detail: "page-doctrines" }),
                )}
              class="nav-menu-item retro-metal-btn ${currentPage ===
              "page-doctrines"
                ? "ring-2 ring-amber-400 brightness-110"
                : ""} px-3.5 py-1.5 rounded text-[11px] font-retro text-amber-200 hover:text-white font-bold tracking-wider uppercase cursor-pointer flex items-center gap-2 transition-all shadow-md whitespace-nowrap"
              data-page="page-doctrines"
              title="Accéder aux Doctrines et Talents militaires"
            >
              <span class="text-xs text-amber-400">⚡</span>
              <span>DOCTRINES</span>
              <span
                class="px-1.5 py-0.5 rounded bg-[#0d130e] border border-[#304032] text-[9px] font-retro font-bold text-green-400 shadow-inner"
              >
                NIV.${this._commanderLevel}
              </span>
              ${this._availablePoints > 0
                ? html`
                    <span
                      class="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400 text-[8.5px] font-pixel text-amber-300 animate-pulse"
                      title="${this
                        ._availablePoints} points de doctrine disponibles"
                    >
                      +${this._availablePoints}
                    </span>
                  `
                : ""}
            </button>
          </div>

          <!-- BOUTIQUE -->
          <div class="relative no-game-portal">
            <button
              class="nav-menu-item retro-metal-btn ${currentPage ===
              "page-item-store"
                ? "ring-2 ring-amber-400 brightness-110"
                : ""} px-3.5 py-1.5 rounded cursor-pointer transition-all text-[11px] font-retro font-black tracking-wider text-amber-100 uppercase"
              data-page="page-item-store"
              @click=${this._notifications.onStoreClick}
            >
              BOUTIQUE
            </button>
            ${this._notifications.showStoreDot()
              ? html`
                  <span
                    class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"
                  ></span>
                  <span
                    class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black"
                  ></span>
                `
              : ""}
          </div>

          <!-- INVENTAIRE -->
          <button
            class="nav-menu-item retro-metal-btn ${currentPage ===
            "page-inventory"
              ? "ring-2 ring-amber-400 brightness-110"
              : ""} px-3.5 py-1.5 rounded cursor-pointer transition-all text-[11px] font-retro font-black tracking-wider text-amber-100 uppercase"
            data-page="page-inventory"
          >
            INVENTAIRE
          </button>

          <!-- CLASSEMENT + TOGGLE SWITCH LEVER -->
          <div class="flex items-center gap-1">
            <button
              class="nav-menu-item retro-metal-btn ${currentPage ===
              "page-leaderboard"
                ? "ring-2 ring-amber-400 brightness-110"
                : ""} px-3.5 py-1.5 rounded cursor-pointer transition-all text-[11px] font-retro font-black tracking-wider text-amber-100 uppercase"
              data-page="page-leaderboard"
            >
              CLASSEMENT
            </button>
            <!-- Mechanical Toggle Switch Graphic -->
            <div
              class="flex flex-col items-center justify-center p-1 bg-[#151c16] border border-[#334235] rounded shadow-inner cursor-pointer"
              title="Commutateur Tactique"
              @click=${() =>
                window.dispatchEvent(
                  new CustomEvent("showPage", { detail: "page-leaderboard" }),
                )}
            >
              <div
                class="w-2.5 h-5 bg-gradient-to-b from-[#94a3b8] to-[#475569] rounded-xs border border-[#1e293b] shadow relative"
              >
                <div
                  class="w-3.5 h-2 bg-[#dc2626] rounded-xs -left-0.5 top-0.5 absolute shadow-[0_0_4px_rgba(220,38,38,0.8)]"
                ></div>
              </div>
            </div>
          </div>

          <!-- CLANS -->
          <button
            class="no-game-portal nav-menu-item retro-metal-btn ${currentPage ===
            "page-clan"
              ? "ring-2 ring-amber-400 brightness-110"
              : ""} px-3.5 py-1.5 rounded cursor-pointer transition-all text-[11px] font-retro font-black tracking-wider text-amber-100 uppercase"
            data-page="page-clan"
          >
            CLANS
          </button>
        </div>

        <!-- Right: Utility Buttons & Mini Green Radar -->
        <div class="flex items-center gap-3">
          <!-- Square Utility Push-Buttons -->
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              @click=${() =>
                window.dispatchEvent(
                  new CustomEvent("showPage", { detail: "page-settings" }),
                )}
              class="retro-metal-btn size-7 rounded flex items-center justify-center text-xs font-bold text-amber-200 hover:text-white"
              title="Paramètres / Configuration"
            >
              ⚙️
            </button>
            <button
              type="button"
              @click=${() =>
                window.dispatchEvent(
                  new CustomEvent("showPage", { detail: "page-account" }),
                )}
              class="retro-metal-btn size-7 rounded flex items-center justify-center text-xs font-bold text-amber-200 hover:text-white"
              title="Compte & Identité"
            >
              👤
            </button>
            <button
              type="button"
              @click=${() => window.location.reload()}
              class="retro-red-btn size-7 rounded flex items-center justify-center text-[10px] font-pixel text-white font-bold"
              title="Réinitialiser"
            >
              ✕
            </button>
          </div>

          <!-- Mini Tactical CRT Radar Sweep -->
          <div
            class="relative size-10 rounded-full border-2 border-[#166534] bg-[#022c22] overflow-hidden shadow-[0_0_10px_rgba(34,197,94,0.35)] shrink-0 flex items-center justify-center"
            title="Radar Tactique Global"
          >
            <!-- Concentric Rings -->
            <div
              class="absolute size-7 rounded-full border border-green-500/30 pointer-events-none"
            ></div>
            <div
              class="absolute size-4 rounded-full border border-green-500/40 pointer-events-none"
            ></div>
            <!-- Crosshairs -->
            <div
              class="absolute w-full h-px bg-green-500/30 pointer-events-none"
            ></div>
            <div
              class="absolute h-full w-px bg-green-500/30 pointer-events-none"
            ></div>
            <!-- Sweeping Radar Line -->
            <div class="absolute inset-0 radar-sweep pointer-events-none">
              <div
                class="w-1/2 h-1/2 bg-gradient-to-br from-green-400/90 via-green-500/25 to-transparent origin-bottom-right"
                style="clip-path: polygon(100% 100%, 0 0, 100% 0);"
              ></div>
            </div>
            <!-- Blips -->
            <div
              class="absolute top-1.5 right-2 size-1 bg-green-300 rounded-full animate-ping pointer-events-none"
            ></div>
            <div
              class="absolute bottom-2 left-2 size-1 bg-green-400 rounded-full pointer-events-none"
            ></div>
          </div>
        </div>
      </nav>

      <!-- Mobile Top Bar (< lg) -->
      <nav
        class="lg:hidden flex w-full bg-[#182119] border-b-2 border-[#121713] items-center justify-between px-3 py-2 shrink-0 z-50 relative select-none"
      >
        <!-- Retro Hamburger Button for Mobile Drawer -->
        <button
          id="hamburger-btn"
          type="button"
          class="retro-metal-btn size-9 rounded flex flex-col items-center justify-center gap-1 p-1 cursor-pointer"
          data-i18n-aria-label="main.menu"
          aria-expanded="false"
          aria-controls="sidebar-menu"
          aria-haspopup="dialog"
          title="Menu de Commandement"
        >
          <span class="w-4 h-0.5 bg-[#8fa382] rounded-full"></span>
          <span class="w-4 h-0.5 bg-[#8fa382] rounded-full"></span>
          <span class="w-4 h-0.5 bg-[#8fa382] rounded-full"></span>
        </button>

        <!-- Centered Logo -->
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101711] border border-[#2e3e30] cursor-pointer"
          @click=${() =>
            window.dispatchEvent(
              new CustomEvent("showPage", { detail: "page-play" }),
            )}
        >
          <span class="size-2 rounded-full led-green-on"></span>
          <span class="font-pixel text-red-500 text-xs tracking-wider glow-red">
            BORDERCONFLICT
          </span>
        </div>

        <!-- Right Quick Action / Currency -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click=${this._handleDeployCombat}
            class="retro-red-btn px-2.5 py-1 rounded font-pixel text-[10px] text-white font-black tracking-wide"
            title="Engager le combat"
          >
            COMBAT
          </button>
        </div>
      </nav>
    `;
  }
}
