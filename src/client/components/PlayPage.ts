import { assetUrl } from "@openfront/shared/AssetUrls";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  COMMANDER_UPDATED_EVENT,
  commanderStore,
  getCommanderRankTitle,
  xpRequiredForLevel,
} from "../CommanderStore";
import "./CapIcon";
import "./CosmeticBackground";
import "./NavAccountMenu";
import "./NavUtilityIcons";
import "./NewsBox";
import "./PlutoniumIcon";
import "./SteamWishlist";
import "./StreamingNow";
import "../UsernameInput";

@customElement("play-page")
export class PlayPage extends LitElement {
  @state() private commanderProfile = commanderStore.getProfile();
  private _resetTimerInterval: number | null = null;

  private onCommanderUpdated = () => {
    this.commanderProfile = commanderStore.getProfile();
  };

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(COMMANDER_UPDATED_EVENT, this.onCommanderUpdated);
    this._resetTimerInterval = window.setInterval(() => {
      this.requestUpdate();
    }, 30_000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      COMMANDER_UPDATED_EVENT,
      this.onCommanderUpdated,
    );
    if (this._resetTimerInterval !== null) {
      clearInterval(this._resetTimerInterval);
      this._resetTimerInterval = null;
    }
  }

  /**
   * Right Panel: Armored Commander HQ Dossier & Intelligence Terminal (Image 2 in Retro Military Style)
   */
  private renderCommanderCard() {
    const profile = this.commanderProfile;
    const rank = getCommanderRankTitle(profile.level);
    const xpMax = xpRequiredForLevel(profile.level);
    const xpPercent = Math.min(100, Math.round((profile.xp / xpMax) * 100));
    const equippedMedal = commanderStore.getEquippedMedalDef();
    const username = profile.username || "MindFox";

    return html`
      <div
        class="retro-metal-btn relative flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-xl border-2 border-[#2b3a2d] bg-[#121813]/95 shadow-2xl overflow-hidden select-none"
      >
        <!-- CRT Corner Screws (4 corners) -->
        <div class="crt-screw crt-screw-tl"></div>
        <div class="crt-screw crt-screw-tr"></div>
        <div class="crt-screw crt-screw-bl"></div>
        <div class="crt-screw crt-screw-br"></div>

        <!-- Commander Header & Identification -->
        <div
          class="flex items-center justify-between border-b border-[#2b3a2d] pb-2 px-3 pt-0.5"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="flex items-center justify-center size-9 rounded-lg bg-[#0e1510] border border-[#3b4d3e] text-xl shrink-0 shadow-inner"
            >
              ${rank.badge}
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="font-pixel text-[9px] sm:text-[10.5px] font-black text-amber-200 uppercase tracking-wide leading-tight glow-amber"
              >
                ${rank.title}
              </span>
              <span
                class="font-terminal text-xs text-green-400 font-bold tracking-wider uppercase"
              >
                NIVEAU ${profile.level} - DOSSIER ACTIF
              </span>
            </div>
          </div>

          <!-- Stamped Medal Badge -->
          <span
            class="flex items-center gap-1 px-2 py-0.5 rounded bg-[#201808] border border-amber-500/50 text-[9px] font-retro text-amber-300 shadow-sm"
            title="Médaille de guerre équipée"
          >
            <span>🏅</span>
            <span class="hidden sm:inline"
              >${equippedMedal
                ? equippedMedal.name
                : "Survivant du Cataclysme"}</span
            >
          </span>
        </div>

        <!-- Currencies in Recessed Teletype Slot -->
        <div
          class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0a0f0b] border border-[#233025] text-xs font-terminal shadow-inner"
        >
          <div
            class="flex items-center gap-1.5 text-green-400 font-bold"
            title="Plutonium Tactique"
          >
            <plutonium-icon .size=${16}></plutonium-icon>
            <span class="font-pixel text-[10px]"
              >${profile.plutonium.toLocaleString("fr-FR")}</span
            >
            <span class="text-[9px] text-green-500/80">PLUTONIUM</span>
          </div>
          <div class="h-4 w-px bg-white/10"></div>
          <div
            class="flex items-center gap-1.5 text-amber-400 font-bold"
            title="Capsules de Territoire"
          >
            <cap-icon .size=${16}></cap-icon>
            <span class="font-pixel text-[10px]"
              >${profile.caps.toLocaleString("fr-FR")}</span
            >
            <span class="text-[9px] text-amber-500/80">CAPS</span>
          </div>
        </div>

        <!-- Satellite Cloud Status & Tactical Identification -->
        <div class="flex flex-col gap-1.5 px-0.5">
          <div
            class="flex items-center justify-between text-[10px] font-terminal text-[#7e9482]"
          >
            <span class="flex items-center gap-1.5">
              <span class="size-2 rounded-full led-green-on"></span>
              <span class="uppercase">INDICATIF & FACTION MILITAIRE</span>
            </span>
            <button
              type="button"
              @click=${() => window.showPage?.("page-account")}
              class="text-amber-300 hover:text-white font-pixel text-[8.5px] cursor-pointer flex items-center gap-1 transition-colors bg-[#182119] border border-[#2d3d2f] px-1.5 py-0.5 rounded shadow-sm"
              title="Gérer le compte et modifier l'identité"
            >
              <span>👤 COMPTE</span>
            </button>
          </div>

          <!-- Stamped Aluminum Callsign Slot with Interactive Username & Clan Tag Input -->
          <div
            class="relative rounded-lg bg-[#0c120d] border border-[#2b3a2d] p-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] focus-within:border-amber-400/80 transition-colors"
          >
            <username-input class="w-full block"></username-input>
          </div>
        </div>

        <!-- Segmented Green Phosphor Grade XP Progress Meter -->
        <div class="flex flex-col gap-1 px-0.5">
          <div
            class="flex items-center justify-between text-[10px] font-terminal text-zinc-300 font-bold"
          >
            <span class="uppercase tracking-wider">PROGRESSION DU GRADE</span>
            <span class="text-green-400 font-pixel text-[9px]"
              >${profile.xp} / ${xpMax} XP (${xpPercent}%)</span
            >
          </div>
          <div
            class="w-full h-2.5 rounded bg-[#0a0f0b] border border-[#2b3a2d] overflow-hidden p-0.5 shadow-inner"
          >
            <div
              class="h-full rounded-xs bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 shadow-[0_0_8px_rgba(34,197,94,0.7)] transition-all duration-500"
              style="width: ${xpPercent}%"
            ></div>
          </div>
        </div>

        <!-- 3 Directives du Jour QG (Dossier Militaire Manila avec Objectifs Exponentiels) -->
        ${this.renderDailyDirectivesDossier()}
      </div>
    `;
  }

  private renderDailyDirectivesDossier() {
    const daily = commanderStore.getDailyDirectives();
    const directives = daily.directives;
    const completedCount = directives.filter((d) => d.completed).length;
    const resetTime = commanderStore.getTimeUntilDailyReset().formatted;
    const allDone = completedCount === 3;

    return html`
      <div
        class="retro-dossier relative p-2.5 sm:p-3 rounded-xl flex flex-col gap-2 shadow-xl border-2 border-[#9c7c4c] select-none"
      >
        <!-- Top Heavy Military Binder Clip -->
        <div
          class="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-3 bg-gradient-to-r from-zinc-500 via-zinc-200 to-zinc-500 rounded-xs border border-zinc-700 shadow-md flex items-center justify-center"
        >
          <div class="w-8 h-0.5 bg-zinc-600/70 rounded-full"></div>
        </div>

        <!-- Header: Title + Countdown + Counter Badge -->
        <div
          class="flex items-center justify-between pt-1 border-b border-[#9c7c4c]/40 pb-1.5"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-xs">🎯</span>
            <span
              class="font-pixel text-[8.5px] sm:text-[9.5px] font-black text-[#241a0e] uppercase tracking-wider truncate"
            >
              DIRECTIVES DU JOUR QG
            </span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span
              class="font-mono text-[8.5px] text-[#5c4627] font-bold tracking-tight bg-[#d9c29c]/50 px-1.5 py-0.5 rounded border border-[#9c7c4c]/50"
              title="Réinitialisation quotidienne à minuit UTC"
            >
              ⏱️ ${resetTime}
            </span>
            <span
              class="px-2 py-0.5 rounded font-pixel text-[8px] font-black uppercase ${allDone
                ? "bg-emerald-700 text-emerald-100 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-[#3d2b17] text-amber-200"}"
            >
              ${completedCount}/3
            </span>
          </div>
        </div>

        <!-- The 3 Exponential Daily Directives -->
        <div class="flex flex-col gap-1.5">
          ${directives.map((d) => {
            const pct = Math.min(
              100,
              Math.floor((d.progress / d.target) * 100),
            );
            const tierBadge =
              d.tier === 1
                ? {
                    label: "NIV. 1 · ÉCHAUFFEMENT",
                    bg: "bg-sky-800/80 text-sky-100 border-sky-600",
                  }
                : d.tier === 2
                  ? {
                      label: "NIV. 2 · STRATÉGIQUE",
                      bg: "bg-amber-700/80 text-amber-100 border-amber-600",
                    }
                  : {
                      label: "NIV. 3 · EXPONENTIEL",
                      bg: "bg-rose-900/90 text-rose-100 border-rose-600",
                    };

            return html`
              <div
                class="rounded-lg border p-1.5 sm:p-2 flex flex-col gap-1 transition-all ${d.completed
                  ? "bg-[#32452b]/15 border-emerald-700/60 shadow-sm"
                  : "bg-[#edd6b1]/60 border-[#ab8b5c]/70 hover:border-[#805e32]"}"
              >
                <!-- Line 1: Tier Pill & Rewards -->
                <div class="flex items-center justify-between gap-1">
                  <span
                    class="px-1.5 py-0.2 rounded text-[7px] sm:text-[7.5px] font-pixel font-bold uppercase border ${tierBadge.bg}"
                  >
                    ${tierBadge.label}
                  </span>
                  <div class="flex items-center gap-1">
                    <span
                      class="px-1.5 py-0.2 rounded bg-[#2e1d0f] text-amber-300 font-pixel text-[8px] font-black shadow-inner flex items-center gap-1"
                      title="Capsules de Territoire"
                    >
                      <span>+${d.rewardCaps}</span>
                      <cap-icon .size=${12}></cap-icon>
                    </span>
                    <span
                      class="px-1.5 py-0.2 rounded bg-[#1e2e1a] text-emerald-300 font-pixel text-[8px] font-black shadow-inner"
                      title="XP Tactique"
                    >
                      +${d.rewardXp} XP
                    </span>
                  </div>
                </div>

                <!-- Line 2: Title & Description -->
                <div class="min-w-0">
                  <div
                    class="font-terminal text-[11px] font-bold text-[#1f170e] flex items-center gap-1.5"
                  >
                    <span>${d.icon}</span>
                    <span class="truncate">${d.title}</span>
                  </div>
                  <p
                    class="font-terminal text-[10px] text-[#42311f] leading-snug"
                  >
                    ${d.description}
                  </p>
                </div>

                <!-- Line 3: Progress Bar & Status -->
                <div class="flex items-center gap-2 pt-0.5">
                  <div
                    class="flex-1 h-2 rounded bg-[#2a1d0f]/20 border border-[#8a6b3f]/60 overflow-hidden p-0.2"
                  >
                    <div
                      class="h-full rounded-xs transition-all duration-500 ${d.completed
                        ? "bg-gradient-to-r from-emerald-600 to-green-400"
                        : "bg-gradient-to-r from-amber-600 to-amber-400"}"
                      style="width: ${pct}%"
                    ></div>
                  </div>
                  <span
                    class="font-pixel text-[7.5px] sm:text-[8px] shrink-0 font-bold ${d.completed
                      ? "text-emerald-800 font-black"
                      : "text-[#3b2915]"}"
                  >
                    ${d.completed
                      ? "✓ VALIDÉE"
                      : `${d.progress.toLocaleString("fr-FR")} / ${d.target.toLocaleString("fr-FR")}`}
                  </span>
                </div>
              </div>
            `;
          })}
        </div>

        <!-- Grand Chelem QG Bonus Box (Si les 3 sont faites -> +1 Plutonium) -->
        <div
          class="rounded-lg p-2 flex flex-col gap-0.5 border-2 transition-all ${allDone
            ? "bg-gradient-to-r from-[#17301c] to-[#204026] border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
            : "bg-[#2b1f13] border-[#7d5e38] text-amber-200"}"
        >
          <div class="flex items-center justify-between">
            <span
              class="font-pixel text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1.5 ${allDone
                ? "text-emerald-300 animate-pulse"
                : "text-amber-300"}"
            >
              <span>${allDone ? "🏆" : "🌟"}</span>
              <span>BONUS GRAND CHELEM (3/3)</span>
            </span>
            <span
              class="px-1.5 py-0.2 rounded text-[7.5px] font-pixel font-black ${allDone
                ? "bg-emerald-500 text-black shadow"
                : "bg-black/40 text-amber-400 border border-amber-500/30"}"
            >
              ${allDone ? "ACCORDÉ !" : `${completedCount}/3`}
            </span>
          </div>

          <div
            class="flex items-center justify-between text-[9px] font-terminal pt-0.5"
          >
            <span
              class="${allDone
                ? "text-emerald-100 font-bold"
                : "text-[#c2ab87]"}"
            >
              ${allDone
                ? "Récompense suprême décernée au dossier !"
                : "Accomplissez les 3 directives :"}
            </span>
            <div
              class="flex items-center gap-1.5 font-pixel text-[8.5px] font-bold"
            >
              <span class="text-green-400 flex items-center gap-0.5">
                <span>+1</span>
                <plutonium-icon .size=${12}></plutonium-icon>
              </span>
              <span class="text-amber-300 flex items-center gap-0.5">
                <span>+25</span>
                <cap-icon .size=${12}></cap-icon>
              </span>
              <span class="text-emerald-300">+45 XP</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bottom-Right: Heavy Bolted Tactical Radar Scope with LED VU-Meter
   */
  private renderTacticalRadar() {
    return html`
      <div
        class="relative flex items-center gap-1.5 p-2 rounded-xl bg-[#1a231b] border-2 border-[#2f3f31] shadow-2xl select-none"
      >
        <!-- Corner Bolts -->
        <div class="crt-screw crt-screw-tl"></div>
        <div class="crt-screw crt-screw-tr"></div>
        <div class="crt-screw crt-screw-bl"></div>
        <div class="crt-screw crt-screw-br"></div>

        <!-- Left Vertical LED VU-Meter Bar -->
        <div
          class="flex flex-col gap-0.5 py-1 pl-1 pr-1 bg-[#0f1510] border border-[#28352a] rounded shadow-inner"
        >
          <div
            class="w-2 h-1 rounded-xs bg-red-500 shadow-[0_0_4px_#ef4444] animate-pulse"
          ></div>
          <div class="w-2 h-1 rounded-xs bg-red-600/60"></div>
          <div
            class="w-2 h-1 rounded-xs bg-amber-400 shadow-[0_0_4px_#f59e0b]"
          ></div>
          <div class="w-2 h-1 rounded-xs bg-amber-500"></div>
          <div
            class="w-2 h-1 rounded-xs bg-green-400 shadow-[0_0_4px_#22c55e]"
          ></div>
          <div class="w-2 h-1 rounded-xs bg-green-500"></div>
          <div class="w-2 h-1 rounded-xs bg-green-600"></div>
          <div class="w-2 h-1 rounded-xs bg-green-700"></div>
        </div>

        <!-- Circular Radar Scope Screen -->
        <div
          class="relative size-20 sm:size-22 rounded-full border-2 border-[#166534] bg-[#022c22] overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.8),0_0_12px_rgba(34,197,94,0.4)] flex items-center justify-center"
        >
          <!-- Range Concentric Circles -->
          <div
            class="absolute size-18 rounded-full border border-green-500/30 pointer-events-none"
          ></div>
          <div
            class="absolute size-12 rounded-full border border-green-500/40 pointer-events-none"
          ></div>
          <div
            class="absolute size-6 rounded-full border border-green-500/50 pointer-events-none"
          ></div>
          <!-- Crosshair Grid -->
          <div
            class="absolute w-full h-px bg-green-500/30 pointer-events-none"
          ></div>
          <div
            class="absolute h-full w-px bg-green-500/30 pointer-events-none"
          ></div>
          <div
            class="absolute w-full h-px bg-green-500/20 rotate-45 pointer-events-none"
          ></div>
          <div
            class="absolute h-full w-px bg-green-500/20 rotate-45 pointer-events-none"
          ></div>

          <!-- Radar Sweeper Line -->
          <div class="absolute inset-0 radar-sweep pointer-events-none">
            <div
              class="w-1/2 h-1/2 bg-gradient-to-br from-green-300 via-green-500/30 to-transparent origin-bottom-right"
              style="clip-path: polygon(100% 100%, 0 0, 100% 0);"
            ></div>
          </div>

          <!-- Target Blips -->
          <div
            class="absolute top-4 right-6 size-1 bg-green-300 rounded-full animate-ping pointer-events-none"
          ></div>
          <div
            class="absolute top-4 right-6 size-1 bg-green-400 rounded-full pointer-events-none"
          ></div>
          <div
            class="absolute bottom-5 left-5 size-1 bg-green-400 rounded-full pointer-events-none"
          ></div>
          <div
            class="absolute top-6 left-7 size-1 bg-amber-400 rounded-full animate-pulse pointer-events-none"
          ></div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div
        id="page-play"
        class="relative w-full h-full flex-1 min-h-0 flex flex-col justify-center p-2 sm:p-4 select-none z-20 overflow-y-auto lg:overflow-hidden"
      >
        <token-login class="absolute"></token-login>
        <rewards-modal class="absolute"></rewards-modal>

        <!-- Main Tactical Launchpad & Commander HQ: Centered Compact Command Deck -->
        <div
          class="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 w-full max-w-[1000px] mx-auto flex-1 min-h-0 py-2 sm:py-3 z-20"
        >
          <!-- Left: Compact Launchpad Module (Image 2) -->
          <div class="w-full max-w-[620px] min-w-0 flex flex-col gap-2">
            <game-mode-selector class="w-full"></game-mode-selector>
          </div>

          <!-- Right: Armored Commander Dossier & Intelligence Panel -->
          <div class="w-full max-w-[340px] shrink-0 flex flex-col gap-2.5">
            ${this.renderCommanderCard()}
          </div>
        </div>

        <!-- Bottom Right Corner: Tactical Bolted CRT Radar Scope -->
        <div
          class="hidden xl:flex absolute bottom-3 right-3 z-30 pointer-events-auto"
        >
          ${this.renderTacticalRadar()}
        </div>
      </div>
    `;
  }
}
