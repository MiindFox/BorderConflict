import { UnitType } from "@openfront/engine-api/game/GameTypes";
import {
  getActiveMegastructures,
  getDirectiveAtTick,
  getDirectiveCurrentValue,
  getMegastructureProgress,
  MEGASTRUCTURE_DEFINITIONS,
  MegastructureDefinition,
  PlayerStructureCounts,
  TacticalDirective,
  getWorldEventStateAtTick,
  WorldEventState,
} from "@openfront/engine-lib/configuration/HexaFrontSystems";
import { renderNumber } from "@openfront/engine-lib/Format";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { commanderStore, getCommanderRankTitle } from "../../CommanderStore";
import { Controller } from "../../Controller";
import { GameView } from "../../view";

@customElement("world-events-banner")
export class WorldEventsBanner extends LitElement implements Controller {
  public game: GameView;

  @state() private eventState: WorldEventState | null = null;
  @state() private inSpawnPhase = true;
  @state() private enabled = true;
  @state() private expanded = false;
  @state() private megasExpanded = false;
  @state() private pulseFlash = false;
  @state() private currentDirective: TacticalDirective | null = null;
  @state() private directiveCurrentVal = 0;
  @state() private directiveCompletedInCycle = false;
  @state() private activeMegas: MegastructureDefinition[] = [];
  @state() private isMinimized = false;
  @state() private directiveMinimized = false;
  @state() private megasMinimized = false;
  @state() private playerCounts: PlayerStructureCounts = {
    cities: 0,
    factories: 0,
    ports: 0,
    silos: 0,
    defensesAndSam: 0,
    tilesOwned: 0,
    gold: 0,
    troops: 0,
    maxTroops: 1,
  };

  private lastRewardedCycle = -1;
  private completedDirectiveCycles = new Set<number>();

  createRenderRoot() {
    this.style.display = "flex";
    this.style.flexDirection = "column";
    this.style.alignItems = "flex-end";
    this.style.gap = "8px";
    return this;
  }

  init() {
    this.lastRewardedCycle = -1;
    this.completedDirectiveCycles.clear();
    this.expanded = false;
    this.megasExpanded = false;
    this.currentDirective = null;
  }

  tick() {
    if (!this.game) return;
    const tick = this.game.ticks();
    this.game.config().setCurrentTick(tick);

    this.inSpawnPhase = this.game.inSpawnPhase();
    if (this.inSpawnPhase) {
      this.eventState = null;
      this.currentDirective = null;
      return;
    }

    const cfg = this.game.config().gameConfig();
    this.enabled = cfg.worldEventsEnabled ?? true;

    if (this.enabled) {
      const state = getWorldEventStateAtTick(tick, cfg.gameMap, true);
      this.eventState = state;

      if (
        state.phase === "active" &&
        this.lastRewardedCycle !== state.cycleIndex
      ) {
        this.lastRewardedCycle = state.cycleIndex;
        commanderStore.recordWorldEventSurvived();
      }

      if (state.phase === "active" && state.isPulseTick) {
        this.pulseFlash = true;
        window.setTimeout(() => {
          this.pulseFlash = false;
        }, 900);
      }
    } else {
      this.eventState = null;
    }

    // Update player counts for Directives & Megastructures
    const myPlayer = this.game.myPlayer();
    if (myPlayer && myPlayer.isAlive()) {
      const counts: PlayerStructureCounts = {
        cities: myPlayer.totalUnitLevels(UnitType.City),
        factories: myPlayer.totalUnitLevels(UnitType.Factory),
        ports: myPlayer.totalUnitLevels(UnitType.Port),
        silos: myPlayer.totalUnitLevels(UnitType.MissileSilo),
        defensesAndSam:
          myPlayer.totalUnitLevels(UnitType.DefensePost) +
          myPlayer.totalUnitLevels(UnitType.SAMLauncher),
        tilesOwned: myPlayer.numTilesOwned(),
        gold: Number(myPlayer.gold()),
        troops: myPlayer.troops(),
        maxTroops: this.game.config().maxTroops(myPlayer),
      };
      this.playerCounts = counts;
      this.activeMegas = getActiveMegastructures(counts);

      const directive = getDirectiveAtTick(tick, String(cfg.gameMap));
      this.currentDirective = directive;
      if (directive) {
        this.directiveCurrentVal = getDirectiveCurrentValue(directive, counts);
        if (
          this.directiveCurrentVal >= directive.targetValue &&
          !this.completedDirectiveCycles.has(directive.cycleIndex)
        ) {
          this.completedDirectiveCycles.add(directive.cycleIndex);
          commanderStore.recordDirectiveCompleted(directive.rewardXp);
        }
        this.directiveCompletedInCycle = this.completedDirectiveCycles.has(
          directive.cycleIndex,
        );
      }
    } else {
      this.currentDirective = null;
      this.activeMegas = [];
    }
  }

  private renderWorldEventCard() {
    if (!this.enabled || !this.eventState) {
      return nothing;
    }
    const s = this.eventState;
    const ev = s.currentEvent;
    const profile = commanderStore.getProfile();
    const rankInfo = getCommanderRankTitle(profile.level);
    const spentDoctrine = commanderStore.getSpentPoints();

    if (s.phase === "calm") {
      return html`
        <div
          class="cursor-pointer select-none w-fit max-w-[320px] flex flex-col gap-1 rounded-l-xl border-l-4 border-2 border-l-emerald-400 border-[#2b3a2d] bg-[#121813]/95 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-mono text-slate-200 shadow-[0_8px_25px_rgba(0,0,0,0.85)] hover:bg-[#1a251c] transition-all"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              @click=${() => (this.expanded = !this.expanded)}
              class="flex items-center gap-1.5 font-bold font-mono text-emerald-400 hover:text-emerald-300"
            >
              <span
                class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]"
              ></span>
              RADAR MONDIAL
            </span>
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-white">
                ${s.secondsRemainingInPhase}s
              </span>
              <button
                type="button"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.isMinimized = !this.isMinimized;
                }}
                class="px-1.5 py-0.5 rounded bg-[#18231a] hover:bg-[#223024] border border-[#2b3a2d] text-[10px] text-amber-200 font-mono transition-colors"
                title="${this.isMinimized
                  ? "Agrandir le radar"
                  : "Réduire le radar"}"
              >
                ${this.isMinimized ? "➕" : "➖"}
              </button>
            </div>
          </div>
          ${!this.isMinimized
            ? html`
                <div
                  @click=${() => (this.expanded = !this.expanded)}
                  class="flex items-center justify-between gap-2 text-[11px] font-mono text-[#8fa382]"
                >
                  <span>Prochaine anomalie</span>
                  <span class="text-amber-300 font-semibold">
                    ${rankInfo.badge} Niv.${profile.level} (${spentDoctrine}
                    pts)
                  </span>
                </div>
              `
            : nothing}
        </div>
      `;
    }

    if (s.phase === "warning") {
      return html`
        <div
          @click=${() => (this.expanded = !this.expanded)}
          class="cursor-pointer select-none w-[280px] sm:w-[320px] rounded-l-xl border-l-4 border-2 border-l-amber-400 border-[#2b3a2d] bg-[#121813]/95 px-3.5 py-2.5 font-mono shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xl animate-bounce shrink-0">${ev.icon}</span>
              <div class="min-w-0">
                <div
                  class="text-[10px] font-black uppercase tracking-wider text-amber-300 animate-pulse truncate"
                >
                  ⚠️ ALERTE DANS ${s.secondsRemainingInPhase}s
                </div>
                <div class="text-xs sm:text-sm font-black text-white truncate">
                  ${ev.name}
                </div>
              </div>
            </div>

            <div class="text-right shrink-0">
              <div class="text-sm font-black font-mono text-amber-400">
                -${s.secondsRemainingInPhase}s
              </div>
              <div class="text-[10px] text-slate-400">
                ${this.expanded ? "▲" : "▼"}
              </div>
            </div>
          </div>

          ${this.expanded
            ? html`
                <div
                  class="mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-300 space-y-1.5"
                >
                  <p>${ev.lore}</p>
                  <div class="flex flex-wrap gap-1">
                    ${ev.modifierBadges.map(
                      (b) => html`
                        <span
                          class="rounded bg-slate-800 border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-200"
                        >
                          ${b}
                        </span>
                      `,
                    )}
                  </div>
                  <div class="text-[10px] text-cyan-300 font-semibold">
                    💡 ${ev.strategicTip}
                  </div>
                </div>
              `
            : nothing}
        </div>
      `;
    }

    const remainingPct = Math.max(
      0,
      Math.min(100, Math.round((1 - s.progressFraction) * 100)),
    );

    return html`
      <div
        @click=${() => (this.expanded = !this.expanded)}
        class="cursor-pointer select-none w-[290px] sm:w-[340px] overflow-hidden rounded-l-xl border-l-4 bg-slate-950/92 backdrop-blur-xl px-3.5 py-2.5 transition-all duration-300 ${this
          .pulseFlash
          ? "ring-2 ring-white/60"
          : ""}"
        style="border-left-color: ${ev.accentColor}; box-shadow: 0 4px 22px ${ev.borderGlow};"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-slate-900 text-lg"
            >
              ${ev.icon}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span
                  class="text-[9px] font-black uppercase tracking-wider truncate"
                  style="color: ${ev.accentColor}"
                >
                  ● ${ev.categoryLabel}
                </span>
                <span
                  class="rounded bg-white/10 px-1 py-0.2 text-[9px] font-extrabold text-slate-200"
                >
                  x${s.escalationMultiplier.toFixed(1)}
                </span>
              </div>
              <div class="text-xs sm:text-sm font-black text-white truncate">
                ${ev.name}
              </div>
            </div>
          </div>

          <div class="text-right shrink-0">
            <div class="text-sm font-black font-mono text-white">
              ${s.secondsRemainingInPhase}s
            </div>
            <div class="text-[10px] text-slate-400">
              ${this.expanded ? "Réduire ▲" : "Infos ▼"}
            </div>
          </div>
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-1">
          ${ev.modifierBadges.map(
            (badge) => html`
              <span
                class="rounded bg-slate-900/95 border border-white/15 px-1.5 py-0.5 text-[10px] font-bold text-slate-100"
              >
                ${badge}
              </span>
            `,
          )}
        </div>

        ${this.expanded
          ? html`
              <div
                class="mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-300 space-y-1"
              >
                ${ev.pulseDescription
                  ? html`
                      <div class="text-[10px] font-bold text-amber-300">
                        ⚡ ${ev.pulseDescription}
                      </div>
                    `
                  : nothing}
                <p>${ev.lore}</p>
                <div class="text-cyan-300 font-semibold text-[10px]">
                  💡 ${ev.strategicTip}
                </div>
                <div
                  class="flex items-center justify-between pt-1 text-[10px] text-slate-400"
                >
                  <span
                    >🔮 Suivant :
                    <strong class="text-slate-200"
                      >${s.nextEvent.icon} ${s.nextEvent.name}</strong
                    ></span
                  >
                </div>
              </div>
            `
          : nothing}

        <div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            class="h-full transition-all duration-300"
            style="width: ${remainingPct}%; background-color: ${ev.accentColor}"
          ></div>
        </div>
      </div>
    `;
  }

  private renderDirectiveCard() {
    if (!this.currentDirective) return nothing;
    const d = this.currentDirective;
    const done = this.directiveCompletedInCycle;
    const pct = Math.min(
      100,
      Math.round((this.directiveCurrentVal / Math.max(1, d.targetValue)) * 100),
    );

    if (this.directiveMinimized) {
      return html`
        <div
          class="select-none w-fit max-w-[280px] rounded-l-xl border-l-4 ${done
            ? "border-emerald-400 bg-[#121813]/98"
            : "border-amber-400/80 bg-[#121813]/98"} border-y border-r border-[#2b3a2d] px-2.5 py-1 text-xs text-slate-200 shadow-lg flex items-center justify-between gap-2 font-mono"
        >
          <span
            class="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase ${done
              ? "text-emerald-400"
              : "text-amber-300"}"
          >
            <span>${done ? "✅" : "🎯"}</span>
            <span class="truncate max-w-[140px]">${d.title}</span>
          </span>
          <span class="font-mono text-[10px] text-emerald-400 font-bold"
            >${renderNumber(this.directiveCurrentVal)}/${renderNumber(
              d.targetValue,
            )}</span
          >
          <button
            type="button"
            @click=${() => (this.directiveMinimized = false)}
            class="retro-metal-btn px-1 py-0.5 rounded bg-[#18231a] border border-[#2b3a2d] text-[9px] text-slate-300 hover:text-white font-mono"
            title="Agrandir la directive"
          >
            ➕
          </button>
        </div>
      `;
    }

    return html`
      <div
        class="select-none w-[270px] sm:w-[310px] rounded-l-xl border-l-4 ${done
          ? "border-emerald-400 bg-[#121813]/98 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          : "border-amber-400/80 bg-[#121813]/98 shadow-[0_12px_32px_rgba(0,0,0,0.9)]"} border-y-2 border-r-2 border-[#2b3a2d] backdrop-blur-xl px-3 py-2 text-xs text-slate-200 transition-all font-mono"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${done
              ? "text-emerald-400"
              : "text-amber-300"}"
          >
            <span>${done ? "✅" : "🎯"}</span>
            <span>${done ? "DIRECTIVE ACCOMPLIE" : "DIRECTIVE DU QG"}</span>
          </span>
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[11px] font-bold text-emerald-400">
              ${d.secondsRemaining}s
            </span>
            <button
              type="button"
              @click=${() => (this.directiveMinimized = true)}
              class="retro-metal-btn px-1.5 py-0.5 rounded bg-[#18231a] border border-[#2b3a2d] text-[10px] text-slate-300 hover:text-white font-mono transition-colors"
              title="Réduire la directive"
            >
              ➖
            </button>
          </div>
        </div>

        <div class="mt-0.5 flex items-center justify-between gap-2">
          <span class="font-mono font-bold text-white text-xs truncate">
            ${d.icon} ${d.title}
          </span>
          <span
            class="font-mono text-[11px] font-bold ${done
              ? "text-emerald-400"
              : "text-amber-300"}"
          >
            ${renderNumber(this.directiveCurrentVal)} /
            ${renderNumber(d.targetValue)}
          </span>
        </div>

        <div class="text-[11px] text-slate-300 mt-0.5 font-mono">
          ${d.description}
        </div>

        <div
          class="mt-1.5 h-2 w-full rounded-md bg-[#0a0e0b] border border-[#2b3a2d] overflow-hidden"
        >
          <div
            class="h-full transition-all duration-300 ${done
              ? "bg-gradient-to-r from-emerald-600 to-green-400"
              : "bg-gradient-to-r from-[#183520] via-[#22c55e] to-[#4ade80]"}"
            style="width: ${done ? 100 : pct}%"
          ></div>
        </div>

        <div
          class="mt-1.5 flex items-center justify-between text-[10px] font-mono font-bold"
        >
          <span class="text-amber-300">
            🎁 +${renderNumber(d.rewardGold)} Or ·
            +${renderNumber(d.rewardTroops)} Troupes
          </span>
          <span class="text-emerald-400">+${d.rewardXp} XP</span>
        </div>
      </div>
    `;
  }

  private renderMegastructuresCard() {
    const activeCount = this.activeMegas.length;
    const c = this.playerCounts;
    const totalGoldPerPulse = this.activeMegas.reduce(
      (sum, m) => sum + m.goldPerPulse,
      0,
    );
    const totalTroopsPerPulse = this.activeMegas.reduce(
      (sum, m) => sum + m.troopsPerPulse,
      0,
    );

    if (this.megasMinimized) {
      return html`
        <div
          class="select-none w-fit max-w-[290px] rounded-l-xl border-l-4 border-2 ${activeCount >
          0
            ? "border-l-emerald-400 border-[#2b3a2d] bg-[#121813]/95 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
            : "border-l-[#2b3a2d] border-[#2b3a2d] bg-[#121813]/90"} px-2.5 py-1 text-xs font-mono text-slate-200 shadow-lg flex items-center justify-between gap-2"
        >
          <span
            class="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase ${activeCount >
            0
              ? "text-emerald-300"
              : "text-amber-300"}"
          >
            <span>🏛️</span>
            <span>MÉGAS (${activeCount}/5)</span>
            ${activeCount > 0
              ? html`
                  <span class="text-[9px] text-emerald-400 font-bold">
                    +${renderNumber(totalGoldPerPulse)}/5s
                  </span>
                `
              : nothing}
          </span>
          <button
            type="button"
            @click=${() => (this.megasMinimized = false)}
            class="retro-metal-btn px-1.5 py-0.5 rounded bg-[#18231a] hover:bg-[#223024] border border-[#2b3a2d] text-[9px] text-amber-200 font-mono transition-colors"
            title="Agrandir les mégastructures"
          >
            ➕
          </button>
        </div>
      `;
    }

    return html`
      <div
        class="select-none w-[285px] sm:w-[335px] rounded-l-xl border-l-4 border-y-2 border-r-2 ${activeCount >
        0
          ? "border-l-emerald-400 border-[#2b3a2d] bg-[#101712]/98 shadow-[0_0_20px_rgba(34,197,94,0.25)]"
          : "border-l-amber-400/80 border-[#2b3a2d] bg-[#101712]/95 shadow-[0_12px_32px_rgba(0,0,0,0.9)]"} px-3 py-2 text-xs font-mono text-slate-200 transition-all"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-2">
          <div
            @click=${() => (this.megasExpanded = !this.megasExpanded)}
            class="cursor-pointer flex items-center gap-1.5 flex-1 min-w-0"
          >
            <span class="text-sm">🏛️</span>
            <span
              class="text-[11px] font-mono font-black uppercase tracking-wider ${activeCount >
              0
                ? "text-emerald-300"
                : "text-amber-300"} truncate"
            >
              MÉGASTRUCTURES (${activeCount}/5)
            </span>
            <span class="text-[10px] text-slate-400">
              ${this.megasExpanded ? "▲" : "▼"}
            </span>
          </div>
          <button
            type="button"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.megasMinimized = true;
            }}
            class="retro-metal-btn px-1.5 py-0.5 rounded bg-[#18231a] hover:bg-[#223024] border border-[#2b3a2d] text-[10px] text-slate-300 hover:text-white font-mono transition-colors"
            title="Réduire les mégastructures"
          >
            ➖
          </button>
        </div>

        <!-- Collapsed Summary -->
        ${!this.megasExpanded
          ? html`
              <div
                @click=${() => (this.megasExpanded = true)}
                class="mt-1.5 cursor-pointer space-y-1.5"
              >
                ${activeCount > 0
                  ? html`
                      <!-- Active Yield Banner -->
                      <div
                        class="rounded-lg bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 flex items-center justify-between text-[10px] font-mono shadow-[0_0_8px_rgba(34,197,94,0.15)]"
                      >
                        <span
                          class="text-emerald-300 font-bold flex items-center gap-1"
                        >
                          <span class="animate-pulse">⚡</span> BONUS ACTIFS :
                        </span>
                        <span class="text-white font-black">
                          +${renderNumber(totalGoldPerPulse)} Or ·
                          +${renderNumber(totalTroopsPerPulse)} Tr / 5s
                        </span>
                      </div>

                      <div class="flex flex-wrap gap-1">
                        ${this.activeMegas.map(
                          (m) => html`
                            <span
                              class="rounded bg-emerald-900/30 border border-emerald-400/50 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-200 flex items-center gap-1"
                            >
                              <span>${m.icon}</span>
                              <span>${m.name}</span>
                              <span class="text-emerald-400 font-black">✓</span>
                            </span>
                          `,
                        )}
                      </div>
                      <div class="text-[9.5px] text-slate-400 text-right italic">
                        Cliquez pour voir tous les objectifs et bonus ▼
                      </div>
                    `
                  : html`
                      <div
                        class="text-[10px] text-slate-300 flex items-center justify-between"
                      >
                        <span class="text-amber-400 font-bold"
                          >🔒 Objectifs de suprématie</span
                        >
                        <span class="text-slate-400 underline text-[9.5px]"
                          >Détails (0/5) ▼</span
                        >
                      </div>
                      <div class="text-[9.5px] text-slate-400 mt-0.5">
                        8 Villes · 8 Usines · 7 Ports · 5 Silos · 14 SAM
                      </div>
                    `}
              </div>
            `
          : nothing}

        <!-- Expanded Detailed Drawer -->
        ${this.megasExpanded
          ? html`
              <div class="mt-2 pt-2 border-t border-white/10 space-y-2">
                <!-- Status Banner -->
                ${activeCount > 0
                  ? html`
                      <div
                        class="rounded-lg bg-gradient-to-r from-emerald-950/70 to-emerald-900/40 border border-emerald-400/50 p-2 shadow-[0_0_12px_rgba(34,197,94,0.2)] font-mono"
                      >
                        <div
                          class="flex items-center justify-between text-[10px] font-bold text-emerald-300 uppercase"
                        >
                          <span class="flex items-center gap-1">
                            <span class="animate-pulse text-xs">⚡</span>
                            PRODUCTION TOTALE ACTIVE
                          </span>
                          <span
                            class="text-white bg-emerald-700/50 px-1.5 py-0.2 rounded border border-emerald-400/40 text-[9px]"
                          >
                            ${activeCount}/5 ACTIVES
                          </span>
                        </div>
                        <div
                          class="mt-1 flex items-center justify-between text-[11px] font-black text-white"
                        >
                          <span class="text-amber-300">
                            💰 +${renderNumber(totalGoldPerPulse)} Or / 5s
                          </span>
                          <span class="text-emerald-300">
                            🎖️ +${renderNumber(totalTroopsPerPulse)} Troupes / 5s
                          </span>
                        </div>
                        <div class="text-[9px] text-emerald-400/80 mt-0.5">
                          Versé automatiquement en direct toutes les 5 secondes
                        </div>
                      </div>
                    `
                  : html`
                      <div
                        class="rounded-lg bg-[#0c120d] border border-[#2b3a2d] p-2 text-[10px] font-mono text-slate-300"
                      >
                        <div
                          class="font-bold text-amber-300 uppercase flex items-center gap-1"
                        >
                          <span>🏛️</span> OBJECTIFS MID / LATE-GAME
                        </div>
                        <div
                          class="text-[9.5px] text-slate-400 mt-0.5 leading-snug"
                        >
                          Atteignez les quotas d'infrastructures pour débloquer
                          ces puissantes mégastructures et recevoir leurs bonus
                          toutes les 5 secondes.
                        </div>
                      </div>
                    `}

                <!-- 5 Megastructures List -->
                <div class="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                  ${MEGASTRUCTURE_DEFINITIONS.map((m) => {
                    const prog = getMegastructureProgress(m, c);
                    return html`
                      <div
                        class="rounded-lg border p-2 transition-all font-mono ${prog.isUnlocked
                          ? "border-emerald-500/70 bg-[#0e1f14]/95 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                          : "border-[#2b3a2d] bg-[#0c120d]/85"}"
                      >
                        <!-- Card Header -->
                        <div class="flex items-center justify-between gap-2">
                          <span
                            class="font-bold text-[11px] flex items-center gap-1.5 ${prog.isUnlocked
                              ? "text-white"
                              : "text-slate-200"}"
                          >
                            <span class="text-sm">${m.icon}</span>
                            <span class="truncate">${m.name}</span>
                          </span>
                          <span
                            class="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded border uppercase shrink-0 ${prog.isUnlocked
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/60 animate-pulse"
                              : "bg-black/40 text-amber-300 border-[#2b3a2d]"}"
                          >
                            ${prog.isUnlocked
                              ? "⚡ ACTIVE"
                              : `🔒 ${prog.current} / ${prog.target}`}
                          </span>
                        </div>

                        <!-- Objective & Progress Bar -->
                        <div class="mt-1.5">
                          <div
                            class="flex items-center justify-between text-[10px]"
                          >
                            <span
                              class="${prog.isUnlocked
                                ? "text-emerald-400 font-bold"
                                : "text-amber-200/90 font-medium"}"
                            >
                              ${prog.isUnlocked
                                ? `✓ Objectif atteint (${prog.current}/${prog.target} ${m.unitLabel})`
                                : `Objectif : ${prog.target} ${m.unitLabel} (Actuel : ${prog.current}/${prog.target})`}
                            </span>
                            <span
                              class="font-bold ${prog.isUnlocked
                                ? "text-emerald-400"
                                : "text-slate-400"}"
                            >
                              ${prog.percent}%
                            </span>
                          </div>

                          <!-- Progress Bar -->
                          <div
                            class="mt-1 h-1.5 w-full rounded-full bg-[#070b08] border border-[#232f25] overflow-hidden"
                          >
                            <div
                              class="h-full transition-all duration-300 ${prog.isUnlocked
                                ? "bg-gradient-to-r from-emerald-500 to-green-300 shadow-[0_0_6px_rgba(34,197,94,0.8)]"
                                : "bg-gradient-to-r from-[#183520] via-amber-600 to-amber-400"}"
                              style="width: ${prog.percent}%"
                            ></div>
                          </div>
                        </div>

                        <!-- Bonus Yield Display -->
                        <div
                          class="mt-1.5 pt-1.5 border-t ${prog.isUnlocked
                            ? "border-emerald-500/30"
                            : "border-white/5"} text-[10px]"
                        >
                          ${prog.isUnlocked
                            ? html`
                                <div>
                                  <div
                                    class="text-[9.5px] uppercase font-bold text-emerald-300 flex items-center gap-1"
                                  >
                                    <span>⚡</span> BONUS ACTIF EN COURS :
                                  </div>
                                  <div
                                    class="flex items-center justify-between font-black text-white mt-0.5"
                                  >
                                    <span class="text-amber-300">
                                      +${renderNumber(m.goldPerPulse)} Or
                                    </span>
                                    <span class="text-emerald-300">
                                      +${renderNumber(m.troopsPerPulse)} Troupes
                                      / 5s
                                    </span>
                                  </div>
                                </div>
                              `
                            : html`
                                <div>
                                  <div
                                    class="text-[9.5px] text-cyan-300 font-bold"
                                  >
                                    🎁 Bonus au déblocage :
                                  </div>
                                  <div class="text-[9.5px] text-slate-200 mt-0.5">
                                    +${renderNumber(m.goldPerPulse)} Or &
                                    +${renderNumber(m.troopsPerPulse)} Troupes
                                    toutes les 5s
                                  </div>
                                  ${prog.missing > 0
                                    ? html`
                                        <div
                                          class="text-[9px] text-amber-400/80 mt-0.5 font-mono"
                                        >
                                          Reste ${prog.missing} ${m.unitLabel} à
                                          construire ou capturer
                                        </div>
                                      `
                                    : nothing}
                                </div>
                              `}
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    if (this.inSpawnPhase) {
      return nothing;
    }

    return html`
      ${this.renderWorldEventCard()} ${this.renderDirectiveCard()}
      ${this.renderMegastructuresCard()}
    `;
  }
}
