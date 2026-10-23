import { assetUrl } from "@openfront/shared/AssetUrls";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  COMMANDER_UPDATED_EVENT,
  commanderStore,
  getCommanderRankTitle,
  xpRequiredForLevel,
} from "../CommanderStore";
import "./CosmeticBackground";
import "./NavAccountMenu";
import "./NavUtilityIcons";
import "./NewsBox";
import "./PlutoniumIcon";
import "./SteamWishlist";
import "./StreamingNow";

@customElement("play-page")
export class PlayPage extends LitElement {
  @state() private commanderProfile = commanderStore.getProfile();

  private onCommanderUpdated = () => {
    this.commanderProfile = commanderStore.getProfile();
  };

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(COMMANDER_UPDATED_EVENT, this.onCommanderUpdated);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      COMMANDER_UPDATED_EVENT,
      this.onCommanderUpdated,
    );
  }

  private renderCommanderCard() {
    const profile = this.commanderProfile;
    const rank = getCommanderRankTitle(profile.level);
    const xpMax = xpRequiredForLevel(profile.level);
    const xpPercent = Math.min(100, Math.round((profile.xp / xpMax) * 100));
    const equippedMedal = commanderStore.getEquippedMedalDef();

    return html`
      <div
        class="relative flex flex-col gap-3 p-4 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/25 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <!-- Subtle ambient glow -->
        <div
          class="absolute -right-12 -top-12 size-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
        ></div>

        <!-- Commander Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="flex items-center justify-center size-11 rounded-xl bg-slate-900 border border-cyan-400/30 text-2xl shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              style="border-color: ${rank.color}66"
            >
              ${rank.badge}
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="text-xs font-black uppercase tracking-wider truncate"
                style="color: ${rank.color}"
              >
                ${rank.title}
              </span>
              <span class="text-[11px] font-mono text-cyan-300 font-extrabold">
                NIVEAU ${profile.level}
              </span>
            </div>
          </div>
          ${equippedMedal
            ? html`
                <span
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[11px] font-extrabold text-amber-300 shadow-sm"
                  title="Médaille de guerre équipée"
                >
                  <span>${equippedMedal.icon}</span>
                  <span class="hidden sm:inline">${equippedMedal.name}</span>
                </span>
              `
            : html``}
        </div>

        <!-- Identity: Territory Pattern / Skin Frame with Username Input -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Identifiant & Faction
          </span>
          <div
            class="relative rounded-xl overflow-visible bg-slate-900/90 border border-cyan-500/30 shadow-inner"
          >
            <cosmetic-background
              class="absolute inset-0 z-0 overflow-hidden rounded-xl opacity-40 pointer-events-none"
            ></cosmetic-background>
            <div class="relative z-10 p-1 flex items-center">
              <username-input class="w-full h-10 sm:h-11"></username-input>
            </div>
          </div>
        </div>

        <!-- XP Progression Bar -->
        <div class="flex flex-col gap-1.5">
          <div
            class="flex items-center justify-between text-[10px] font-mono text-slate-400 font-semibold"
          >
            <span>PROGRESSION DU GRADE</span>
            <span class="text-cyan-300 font-bold"
              >${profile.xp} / ${xpMax} XP (${xpPercent}%)</span
            >
          </div>
          <div
            class="w-full h-2 rounded-full bg-slate-900 border border-white/10 overflow-hidden p-0.5"
          >
            <div
              class="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
              style="width: ${xpPercent}%"
            ></div>
          </div>
        </div>

        <!-- Directive Secrète du QG (Défi / Mission Active) -->
        <div
          class="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900/80 border border-amber-400/30 text-xs shadow-inner"
        >
          <div class="flex items-center justify-between">
            <span
              class="flex items-center gap-1.5 font-extrabold text-amber-300 uppercase tracking-wider text-[11px]"
            >
              <span>🎯</span>
              <span>Directive du Jour</span>
            </span>
            <span
              class="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-mono font-bold text-emerald-300"
            >
              <plutonium-icon .size=${12}></plutonium-icon>
              <span>+100 / +250 XP</span>
            </span>
          </div>
          <p class="text-[11px] text-slate-300 leading-snug">
            Conquérir 10 capitales mondiales ou éliminer 3 nations ennemies.
          </p>
        </div>

        <!-- Integrated News Box removed as requested -->
      </div>
    `;
  }

  render() {
    return html`
      <div
        id="page-play"
        class="flex flex-col gap-4 w-full px-2 sm:px-4 lg:px-6 min-h-0 py-2 sm:py-3"
      >
        <token-login class="absolute"></token-login>
        <rewards-modal class="absolute"></rewards-modal>

        <!-- Mobile: Fixed top bar -->
        <div
          class="lg:hidden fixed left-0 right-0 top-[var(--top-ad-height,0px)] z-40 pt-[env(safe-area-inset-top)] bg-slate-950/90 backdrop-blur-xl border-b border-cyan-500/20"
        >
          <div
            class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center h-14 px-2 gap-2"
          >
            <button
              id="hamburger-btn"
              class="col-start-1 justify-self-start h-10 shrink-0 aspect-[4/3] flex text-white/90 rounded-md items-center justify-center transition-colors"
              data-i18n-aria-label="main.menu"
              aria-expanded="false"
              aria-controls="sidebar-menu"
              aria-haspopup="dialog"
              data-i18n-title="main.menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <div
              class="col-start-2 flex items-center justify-center text-malibu-blue min-w-0"
            >
              <img
                src=${assetUrl("images/OpenFrontLogo.svg")}
                alt="BorderConflict"
                class="h-full w-auto"
              />
            </div>

            <div
              class="col-start-3 justify-self-end shrink-0 flex items-center gap-0.5"
            >
              <nav-utility-icons size="mobile"></nav-utility-icons>
              <nav-account-menu variant="mobile"></nav-account-menu>
            </div>
          </div>
        </div>

        <!-- Mobile spacer for fixed top bar -->
        <div
          class="lg:hidden h-[calc(env(safe-area-inset-top)+56px)] -mb-2"
        ></div>

        <!-- Main Modern Launchpad Layout: Hero Hub on Left, Commander HQ on Right -->
        <div class="flex flex-col lg:flex-row gap-5 w-full items-start">
          <!-- Left Column: The Interactive Game Hub -->
          <div class="flex-1 min-w-0 w-full">
            <game-mode-selector></game-mode-selector>
          </div>

          <!-- Right Column: The Commander HQ & Frontline Panel -->
          <div class="w-full lg:w-[350px] xl:w-[380px] shrink-0 flex flex-col gap-3">
            ${this.renderCommanderCard()}
            <streaming-now class="hidden xl:flex flex-col w-full"></streaming-now>
          </div>
        </div>
      </div>
    `;
  }
}
