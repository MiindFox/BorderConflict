import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { renderNumber } from "@openfront/engine-lib/Format";
import {
  getActiveMegastructures,
  getDirectiveAtTick,
  getDirectiveCurrentValue,
  MEGASTRUCTURE_DEFINITIONS,
  MegastructureDefinition,
  PlayerStructureCounts,
  TacticalDirective,
  getWorldEventStateAtTick,
  WorldEventState,
} from "@openfront/engine-lib/configuration/HexaFrontSystems";
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
          class="cursor-pointer select-none w-fit max-w-[300px] flex flex-col gap-1 rounded-l-xl border-l-4 border-cyan-400 bg-slate-950/90 backdrop-blur-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs text-slate-200 shadow-lg hover:bg-slate-900/95 transition-all"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              @click=${() => (this.expanded = !this.expanded)}
              class="flex items-center gap-1.5 font-extrabold text-cyan-400 hover:text-cyan-300"
            >
              <span
                class="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"
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
                class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-300 font-mono transition-colors"
                title="${this.isMinimized ? "Agrandir le radar" : "Réduire le radar"}"
              >
                ${this.isMinimized ? "➕" : "➖"}
              </button>
            </div>
          </div>
          ${!this.isMinimized
            ? html`
                <div
                  @click=${() => (this.expanded = !this.expanded)}
                  class="flex items-center justify-between gap-2 text-[11px] text-slate-400"
                >
                  <span>Prochaine anomalie</span>
                  <span class="text-cyan-300 font-semibold">
                    ${rankInfo.badge} Niv.${profile.level} (${spentDoctrine} pts)
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
          class="cursor-pointer select-none w-[280px] sm:w-[320px] rounded-l-xl border-l-4 border-amber-400 bg-slate-950/92 backdrop-blur-xl px-3.5 py-2.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all"
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
            ? "border-emerald-400 bg-slate-950/92"
            : "border-indigo-400 bg-slate-950/90"} backdrop-blur-xl px-2.5 py-1 text-xs text-slate-200 shadow-lg flex items-center justify-between gap-2"
        >
          <span class="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-300">
            <span>${done ? "✅" : "🎯"}</span>
            <span class="truncate max-w-[140px]">${d.title}</span>
          </span>
          <span class="font-mono text-[10px] text-cyan-300 font-bold">${renderNumber(this.directiveCurrentVal)}/${renderNumber(d.targetValue)}</span>
          <button
            type="button"
            @click=${() => (this.directiveMinimized = false)}
            class="px-1 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] text-slate-300"
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
          ? "border-emerald-400 bg-slate-950/92 shadow-[0_4px_20px_rgba(16,185,129,0.25)]"
          : "border-indigo-400 bg-slate-950/90 shadow-lg"} backdrop-blur-xl px-3 py-2 text-xs text-slate-200 transition-all"
      >
        <div class="flex items-center justify-between gap-2">
          <span
            class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${done
              ? "text-emerald-400"
              : "text-indigo-300"}"
          >
            <span>${done ? "✅" : "🎯"}</span>
            <span>${done ? "DIRECTIVE ACCOMPLIE" : "DIRECTIVE DU QG"}</span>
          </span>
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[11px] font-bold text-slate-300">
              ${d.secondsRemaining}s
            </span>
            <button
              type="button"
              @click=${() => (this.directiveMinimized = true)}
              class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-300 font-mono transition-colors"
              title="Réduire la directive"
            >
              ➖
            </button>
          </div>
        </div>

        <div class="mt-0.5 flex items-center justify-between gap-2">
          <span class="font-extrabold text-white text-xs truncate">
            ${d.icon} ${d.title}
          </span>
          <span
            class="font-mono text-[11px] font-extrabold ${done
              ? "text-emerald-400"
              : "text-cyan-300"}"
          >
            ${renderNumber(this.directiveCurrentVal)} /
            ${renderNumber(d.targetValue)}
          </span>
        </div>

        <div class="text-[11px] text-slate-300 mt-0.5">${d.description}</div>

        <div class="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            class="h-full transition-all duration-300 ${done
              ? "bg-emerald-400"
              : "bg-gradient-to-r from-indigo-500 to-cyan-400"}"
            style="width: ${done ? 100 : pct}%"
          ></div>
        </div>

        <div
          class="mt-1.5 flex items-center justify-between text-[10px] font-bold"
        >
          <span class="text-amber-300">
            🎁 +${renderNumber(d.rewardGold)} Or · +${renderNumber(
              d.rewardTroops,
            )} Troupes
          </span>
          <span class="text-cyan-300">+${d.rewardXp} XP</span>
        </div>
      </div>
    `;
  }

  private renderMegastructuresCard() {
    const activeCount = this.activeMegas.length;
    const c = this.playerCounts;

    if (this.megasMinimized) {
      return html`
        <div
          class="select-none w-fit max-w-[280px] rounded-l-xl border-l-4 ${activeCount > 0
            ? "border-amber-400 bg-slate-950/92"
            : "border-slate-600 bg-slate-950/85"} backdrop-blur-xl px-2.5 py-1 text-xs text-slate-200 shadow-lg flex items-center justify-between gap-2"
        >
          <span class="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-300">
            <span>🏛️</span>
            <span>MÉGAS (${activeCount}/5)</span>
          </span>
          <button
            type="button"
            @click=${() => (this.megasMinimized = false)}
            class="px-1 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] text-slate-300 transition-colors"
            title="Agrandir les mégastructures"
          >
            ➕
          </button>
        </div>
      `;
    }

    return html`
      <div
        class="cursor-pointer select-none w-fit max-w-[310px] rounded-l-xl border-l-4 ${activeCount >
        0
          ? "border-amber-400 bg-slate-950/92 shadow-[0_4px_18px_rgba(245,158,11,0.2)]"
          : "border-slate-600 bg-slate-950/85"} backdrop-blur-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs text-slate-200 transition-all hover:bg-slate-900/95"
      >
        <div class="flex items-center justify-between gap-3">
          <span
            @click=${() => (this.megasExpanded = !this.megasExpanded)}
            class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${activeCount >
            0
              ? "text-amber-300"
              : "text-slate-400"}"
          >
            <span>🏛️</span>
            <span>MÉGASTRUCTURES (${activeCount}/5)</span>
            <span class="text-[10px] text-slate-400">
              ${this.megasExpanded ? "▲" : "▼"}
            </span>
          </span>
          <button
            type="button"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.megasMinimized = true;
            }}
            class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-300 font-mono transition-colors"
            title="Réduire les mégastructures"
          >
            ➖
          </button>
        </div>

        ${activeCount > 0 && !this.megasExpanded
          ? html`
              <div class="mt-1 flex flex-wrap gap-1">
                ${this.activeMegas.map(
                  (m) => html`
                    <span
                      class="rounded bg-amber-500/15 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-200"
                    >
                      ${m.icon} ${m.name}
                    </span>
                  `,
                )}
              </div>
            `
          : nothing}

        ${this.megasExpanded
          ? html`
              <div
                class="mt-2 pt-2 border-t border-white/10 space-y-1.5 w-[275px]"
              >
                ${MEGASTRUCTURE_DEFINITIONS.map((m) => {
                  const isActive = this.activeMegas.some((a) => a.id === m.id);
                  const progressLabel =
                    m.id === "cyber_arcology"
                      ? `${c.cities}/3`
                      : m.id === "titan_foundry"
                        ? `${c.factories}/3`
                        : m.id === "hegemon_shipyard"
                          ? `${c.ports}/3`
                          : m.id === "orbital_command"
                            ? `${c.silos}/2`
                            : `${c.defensesAndSam}/4`;
                  return html`
                    <div
                      class="rounded-lg border px-2 py-1 ${isActive
                        ? "border-amber-400/50 bg-amber-500/10"
                        : "border-white/10 bg-slate-900/70 opacity-75"}"
                    >
                      <div class="flex items-center justify-between text-[11px] font-bold">
                        <span class="${isActive ? "text-amber-300" : "text-slate-200"}">
                          ${m.icon} ${m.name}
                        </span>
                        <span
                          class="font-mono text-[10px] ${isActive
                            ? "text-emerald-400"
                            : "text-slate-400"}"
                        >
                          ${isActive ? "ACTIF" : progressLabel}
                        </span>
                      </div>
                      <div class="text-[10px] text-slate-400">
                        ${m.requirementDesc} →
                        <span class="text-cyan-300">${m.effectDesc}</span>
                      </div>
                    </div>
                  `;
                })}
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
      ${this.renderWorldEventCard()}
      ${this.renderDirectiveCard()}
      ${this.renderMegastructuresCard()}
    `;
  }
}
