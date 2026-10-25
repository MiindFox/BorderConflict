import { TileRef } from "@openfront/engine-api/game/GameMap";
import { GameMode, GameType, Gold } from "@openfront/engine-api/game/GameTypes";
import { GameUpdateType } from "@openfront/engine-api/game/GameUpdates";
import { ClientID } from "@openfront/engine-api/Schemas";
import { Config } from "@openfront/engine-lib/configuration/Config";
import { renderNumber, renderTroops } from "@openfront/engine-lib/Format";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { EventBus } from "@openfront/shared/EventBus";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { Controller } from "../../Controller";
import { AttackRatioEvent, SetAttackRatioEvent } from "../../InputHandler";
import { UIState } from "../../UIState";
import { USER_SETTINGS_CHANGED_EVENT, UserSettings } from "../../UserSettings";
import { getGamesPlayed, translateText } from "../../Utils";
import { GameView } from "../../view";
import { PlayerView } from "../../view/PlayerView";
import { goldCoinIcon, soldierIcon } from "../HotbarIcons";
import { TutorialHighlight, TutorialHighlightEvent } from "../Tutorial";
const swordIcon = assetUrl("images/SwordIcon.svg");

@customElement("control-panel")
export class ControlPanel extends LitElement implements Controller {
  public game: GameView;
  public clientID: ClientID;
  public eventBus: EventBus;
  public uiState: UIState;

  @state()
  private attackRatio: number = 0.2;

  @state()
  private _maxTroops: number;

  @state()
  private troopRate: number;

  @state()
  private _troops: number;

  @state()
  private _isVisible = false;

  @state()
  private _notification: { type: "warning" | "info"; message: string } | null =
    null;

  @state()
  private _gold: Gold;

  @state()
  private _attackingTroops: number = 0;

  @state()
  private _goldGain: bigint | null = null;
  @state()
  private _goldGainPulseId: number = 0;
  private _goldGainTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @state()
  private _tutorialHighlight: TutorialHighlight | null = null;

  @state()
  private _hoveredTooltip: {
    title: string;
    description: string;
    extra?: string;
    rect: DOMRect;
    accentColor: string;
  } | null = null;

  private showControlTooltip(
    title: string,
    description: string,
    accentColor: string,
    e: MouseEvent,
    extra?: string,
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this._hoveredTooltip = {
      title,
      description,
      extra,
      rect,
      accentColor,
    };
  }

  private hideControlTooltip() {
    this._hoveredTooltip = null;
  }

  private renderFloatingControlTooltip() {
    if (!this._hoveredTooltip) return null;
    const { title, description, extra, rect, accentColor } =
      this._hoveredTooltip;
    const bottomPos = Math.max(80, window.innerHeight - rect.top + 12);
    const centerX = rect.left + rect.width / 2;
    const leftPos = Math.max(160, Math.min(window.innerWidth - 160, centerX));

    return html`
      <div
        class="fixed text-slate-100 text-center w-max max-w-[320px] text-xs bg-[#121813]/98 border-2 border-[#2b3a2d] rounded-xl p-3 z-[99999] shadow-[0_16px_40px_rgba(0,0,0,0.95)] pointer-events-none font-mono"
        style="bottom: ${bottomPos}px; left: ${leftPos}px; transform: translateX(-50%); border-top: 3px solid ${accentColor};"
      >
        <div class="font-bold text-sm mb-1" style="color: ${accentColor};">
          ${title}
        </div>
        <div class="px-1 py-1 text-slate-300 leading-relaxed text-[11.5px]">
          ${description}
        </div>
        ${extra
          ? html`<div
              class="mt-1 pt-1.5 border-t border-[#2b3a2d] text-amber-300 font-bold text-xs"
            >
              ${extra}
            </div>`
          : null}
      </div>
    `;
  }

  private _troopRateIsIncreasing: boolean = true;

  private _lastTroopIncreaseRate: number;

  // Border detection cache
  private _nearbyPlayerIDs: Set<number> = new Set();
  private _borderRefreshCounter: number = 0;
  private _borderTilesPromise: Promise<void> | null = null;
  // Track last attack tick per target player (for 15-second threshold)
  private _lastAttackTickByTarget: Map<number, number> = new Map();
  private static readonly BORDER_REFRESH_INTERVAL = 10; // recompute every 1s
  private static readonly ATTACK_THRESHOLD_TICKS = 15 * 10; // 15 seconds

  connectedCallback() {
    super.connectedCallback();
    // The attack ratio is cached below for the lifetime of the game, but the
    // settings modal is now reachable mid-match, so follow the stored value
    // when it changes there. (This panel's own slider is session-only: it
    // never writes UserSettings, so there is no loop.)
    globalThis.addEventListener(
      `${USER_SETTINGS_CHANGED_EVENT}:settings.attackRatio`,
      this.onAttackRatioSettingChanged,
    );
  }

  init() {
    this.attackRatio = new UserSettings().attackRatio();
    this.uiState.attackRatio = this.attackRatio;
    this.eventBus.on(TutorialHighlightEvent, (e) => {
      this._tutorialHighlight = e.target;
    });
    this.eventBus.on(AttackRatioEvent, (event) => {
      let newAttackRatio = this.attackRatio + event.attackRatio / 100;

      if (newAttackRatio < 0.01) {
        newAttackRatio = 0.01;
      }

      if (newAttackRatio > 1) {
        newAttackRatio = 1;
      }

      if (newAttackRatio === 0.11 && this.attackRatio === 0.01) {
        // If we're changing the ratio from 1%, then set it to 10% instead of 11% to keep a consistency
        newAttackRatio = 0.1;
      }

      this.attackRatio = newAttackRatio;
      this.onAttackRatioChange(this.attackRatio);
    });
    this.eventBus.on(SetAttackRatioEvent, (event) => {
      this.setRatioPreset(event.ratio);
    });
  }

  tick() {
    if (!this._isVisible && !this.game.inSpawnPhase()) {
      this.setVisibile(true);
    }

    const player = this.game.myPlayer();
    if (player === null || !player.isAlive()) {
      this.setVisibile(false);
      return;
    }

    this.updateTroopIncrease();

    const config = this.game.config();
    this._maxTroops = config.maxTroops(player);
    this._gold = player.gold();
    this._troops = player.troops();
    this._attackingTroops = player
      .outgoingAttacks()
      .map((a) => a.troops)
      .reduce((a, b) => a + b, 0);
    this.troopRate = config.troopIncreaseRate(player) * 10;

    const helpEnabled = new UserSettings().helpMessages();

    // Don't target veteran players
    if (helpEnabled && getGamesPlayed() < 20) {
      // Track outgoing attacks for 15-second threshold
      this.trackOutgoingAttacks(player);

      // Refresh border detection cache periodically
      this.refreshNearbyPlayers(player);

      // Compute notification
      this._notification = this.computeNotification(player, config);
    }

    const updates = this.game.updatesSinceLastTick();
    if (updates) {
      const myID = player.id();
      const bonusEvents = updates[GameUpdateType.BonusEvent];
      if (bonusEvents) {
        for (const ev of bonusEvents) {
          if (ev.player === myID && ev.gold > 0) {
            this.addGoldGain(BigInt(ev.gold));
          }
        }
      }
      const conquestEvents = updates[GameUpdateType.ConquestEvent];
      if (conquestEvents) {
        for (const ev of conquestEvents) {
          if (ev.conquerorId === myID && ev.gold > 0n) {
            this.addGoldGain(ev.gold);
          }
        }
      }
      const donateEvents = updates[GameUpdateType.DonateEvent];
      if (donateEvents) {
        for (const ev of donateEvents) {
          if (
            ev.donationType === "gold" &&
            ev.recipientId === myID &&
            ev.amount > 0n
          ) {
            this.addGoldGain(ev.amount);
          }
        }
      }
    }

    this.requestUpdate();
  }

  // Last-wins: when multiple gold events arrive in one tick, the pip shows
  // only the most recent amount (not a sum) — each gain restarts the pulse.
  private addGoldGain(amount: bigint) {
    this._goldGain = amount;
    this._goldGainPulseId++;
    if (this._goldGainTimeoutId !== null) {
      clearTimeout(this._goldGainTimeoutId);
    }
    this._goldGainTimeoutId = setTimeout(() => {
      this._goldGain = null;
      this._goldGainTimeoutId = null;
      this.requestUpdate();
    }, 2000);
  }

  private trackOutgoingAttacks(player: PlayerView) {
    const currentTick = this.game.ticks();
    for (const attack of player.outgoingAttacks()) {
      if (attack.targetID !== 0 && !attack.retreating) {
        this._lastAttackTickByTarget.set(attack.targetID, currentTick);
      }
    }
    // Clean up old entries
    for (const [playerID, tick] of this._lastAttackTickByTarget.entries()) {
      if (currentTick - tick > ControlPanel.ATTACK_THRESHOLD_TICKS * 2) {
        this._lastAttackTickByTarget.delete(playerID);
      }
    }
  }

  private refreshNearbyPlayers(player: PlayerView) {
    this._borderRefreshCounter++;
    if (
      this._borderRefreshCounter < ControlPanel.BORDER_REFRESH_INTERVAL ||
      this._borderTilesPromise !== null
    ) {
      return;
    }
    this._borderRefreshCounter = 0;
    this._borderTilesPromise = player.borderTiles().then((bt) => {
      this._borderTilesPromise = null;
      const myID = player.smallID();
      const nearby = new Set<number>();
      for (const tile of bt.borderTiles) {
        for (const neighbor of this.game.neighbors(tile as TileRef)) {
          const ownerID = this.game.ownerID(neighbor);
          if (ownerID !== 0 && ownerID !== myID) {
            nearby.add(ownerID);
          }
        }
      }
      this._nearbyPlayerIDs = nearby;
    });
  }

  private computeNotification(
    player: PlayerView,
    config: Config,
  ): { type: "warning" | "info"; message: string } | null {
    const currentTick = this.game.ticks();

    // Army limit warning
    const { gameMode, gameType } = config.gameConfig();
    const isPublicTeamGame =
      gameMode === GameMode.Team && gameType === GameType.Public;
    const canDonateTroops = config.donateTroops();
    if (isPublicTeamGame && canDonateTroops) {
      const ratio = this._troops / Math.max(this._maxTroops, 1);
      if (ratio >= config.armyLimitWarningThreshold()) {
        return {
          type: "warning",
          message: "control_panel.army_limit_warning",
        };
      }
    }

    // Low troops (Less than 1k) warning
    if (this._troops < 10000 && this._troops > 0) {
      return { type: "warning", message: "control_panel.low_troops_warning" };
    }

    // Info messages: check nearby players for traitors, AFK allies, AFK teammates
    for (const nearbyID of this._nearbyPlayerIDs) {
      let other;
      try {
        other = this.game.playerBySmallID(nearbyID);
      } catch {
        continue;
      }
      if (!other.isPlayer() || !other.isAlive()) continue;

      const lastAttackTick = this._lastAttackTickByTarget.get(nearbyID) ?? -1;
      const secondsSinceAttack = (currentTick - lastAttackTick) / 10;
      const hasNotAttackedRecently =
        lastAttackTick < 0 || secondsSinceAttack > 15;

      if (!hasNotAttackedRecently) continue;

      if (other.isTraitor() && player.isAlliedWith(other)) {
        return { type: "info", message: "control_panel.traitor_neighbor_info" };
      }
      if (other.isDisconnected() && player.isAlliedWith(other)) {
        return {
          type: "info",
          message: "control_panel.allied_afk_neighbor_info",
        };
      }
      if (other.isDisconnected() && player.isOnSameTeam(other)) {
        return {
          type: "info",
          message: "control_panel.teammate_afk_neighbor_info",
        };
      }
    }

    return null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener(
      `${USER_SETTINGS_CHANGED_EVENT}:settings.attackRatio`,
      this.onAttackRatioSettingChanged,
    );
    if (this._goldGainTimeoutId !== null) {
      clearTimeout(this._goldGainTimeoutId);
      this._goldGainTimeoutId = null;
    }
  }

  private updateTroopIncrease() {
    const player = this.game?.myPlayer();
    if (player === null) return;
    const troopIncreaseRate = this.game.config().troopIncreaseRate(player);
    this._troopRateIsIncreasing =
      troopIncreaseRate >= this._lastTroopIncreaseRate;
    this._lastTroopIncreaseRate = troopIncreaseRate;
  }

  onAttackRatioChange(newRatio: number) {
    // The element outlives any one game; uiState only exists once init() ran.
    // Before that (the hidden slider on the lobby page) this.attackRatio holds
    // the value, and init() reloads it from UserSettings anyway.
    if (this.uiState === undefined) return;
    this.uiState.attackRatio = newRatio;
  }

  private onAttackRatioSettingChanged = () => {
    if (this.uiState === undefined) return;
    this.attackRatio = new UserSettings().attackRatio();
    this.onAttackRatioChange(this.attackRatio);
    this.requestUpdate();
  };

  setVisibile(visible: boolean) {
    this._isVisible = visible;
    this.requestUpdate();
  }

  private handleRatioSliderInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = Number(input.value);
    this.attackRatio = value / 100;
    this.onAttackRatioChange(this.attackRatio);
  }

  private setRatioPreset(ratio: number) {
    this.attackRatio = Math.max(0.01, Math.min(1.0, ratio));
    this.onAttackRatioChange(this.attackRatio);
    this.requestUpdate();
  }

  private handleRatioSliderPointerUp(e: Event) {
    (e.target as HTMLInputElement).blur();
  }

  private calculateTroopBar(): { greenPercent: number; orangePercent: number } {
    const base = Math.max(this._maxTroops, 1);
    const greenPercentRaw = (this._troops / base) * 100;
    const orangePercentRaw = (this._attackingTroops / base) * 100;

    const greenPercent = Math.max(0, Math.min(100, greenPercentRaw));
    const orangePercent = Math.max(
      0,
      Math.min(100 - greenPercent, orangePercentRaw),
    );

    return { greenPercent, orangePercent };
  }

  private renderMobileTroopBar() {
    const { greenPercent, orangePercent } = this.calculateTroopBar();
    const isNearCap = greenPercent >= 90;
    return html`
      <div
        class="w-full h-6 border rounded-lg bg-slate-900/90 shadow-inner overflow-hidden relative transition-all duration-300 ${isNearCap
          ? "border-amber-400/90 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          : "border-cyan-500/35"}"
      >
        <div class="relative h-full">
          <div
            class="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-cyan-500 to-indigo-600 transition-transform duration-200 ease-out"
            style="transform: scaleX(${greenPercent / 100});"
          ></div>
          <div
            class="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-amber-500 to-orange-500 transition-transform duration-200 ease-out"
            style="transform: translateX(${greenPercent}%) scaleX(${orangePercent /
            100});"
          ></div>
        </div>
        <div
          class="absolute inset-0 flex items-center justify-between px-1.5 text-xs font-extrabold leading-none pointer-events-none"
          translate="no"
        >
          <span class="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
            >${renderTroops(this._troops)}</span
          >
          <span class="text-cyan-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
            >${renderTroops(this._maxTroops)}</span
          >
        </div>
        <div
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
          translate="no"
        >
          <div
            class="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950/60 ${this.tutorialHighlightClass(
              "troop_rate",
            )}"
          >
            <img
              src=${soldierIcon}
              alt=""
              aria-hidden="true"
              width="12"
              height="12"
              class="brightness-0 invert drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
            />
            <span
              class="text-[10px] font-extrabold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] ${this
                ._troopRateIsIncreasing
                ? "text-emerald-400"
                : "text-amber-400"}"
              >+${renderTroops(this.troopRate)}/s</span
            >
          </div>
        </div>
      </div>
    `;
  }

  private renderDesktopTroopBar() {
    const { greenPercent, orangePercent } = this.calculateTroopBar();
    const isNearCap = greenPercent >= 90;
    return html`
      <div
        class="w-full h-7 border-2 rounded-lg bg-[#0a0e0b] shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] overflow-hidden relative transition-all duration-300 border-[#2b3a2d] ${isNearCap
          ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
          : ""}"
      >
        <div class="relative h-full">
          <div
            class="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-emerald-600 via-green-500 to-[#4ade80] transition-transform duration-200 ease-out"
            style="transform: scaleX(${greenPercent / 100});"
          ></div>
          <div
            class="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-amber-600 to-amber-400 transition-transform duration-200 ease-out"
            style="transform: translateX(${greenPercent}%) scaleX(${orangePercent /
            100});"
          ></div>
        </div>
        <!-- Scanlines layer -->
        <div
          class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_2.5px] pointer-events-none"
        ></div>
        <div
          class="absolute inset-0 flex items-center text-xs font-mono font-bold leading-none pointer-events-none px-2"
          translate="no"
        >
          <span class="flex-1 flex justify-end h-full items-center pr-1">
            <span class="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              >${renderTroops(this._troops)}</span
            >
          </span>
          <span
            class="h-full flex items-center px-0.5 text-emerald-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
            >/</span
          >
          <span
            class="flex-1 flex justify-start h-full items-center pl-1 gap-1"
          >
            <span
              class="text-emerald-100 tabular-nums w-[3.2rem] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              >${renderTroops(this._maxTroops)}</span
            >
            <img
              src=${soldierIcon}
              alt=""
              aria-hidden="true"
              width="14"
              height="14"
              class="shrink-0 brightness-0 invert drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ml-0.5"
            />
          </span>
          <span
            class="ml-auto text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#0e1410]/90 border ${isNearCap
              ? "text-amber-300 border-amber-400/60 animate-pulse"
              : "text-emerald-300 border-[#2b3a2d]"}"
          >
            ${Math.round(greenPercent)}%
          </span>
        </div>
      </div>
    `;
  }

  private tutorialHighlightClass(target: TutorialHighlight): string {
    return this._tutorialHighlight === target ? "tutorial-highlight" : "";
  }

  private renderNotification() {
    if (!this._notification) return html``;
    const isWarning = this._notification.type === "warning";
    return html`
      <div
        class="flex items-center gap-1.5 px-1.5 py-1 rounded-md border text-xs font-medium mb-1 ${isWarning
          ? "border-orange-400/60 bg-orange-400/10 text-orange-300"
          : "border-blue-400/60 bg-blue-400/10 text-blue-300"}"
      >
        <span class="shrink-0">${isWarning ? "⚠" : "ℹ"}</span>
        <span>${translateText(this._notification.message)}</span>
      </div>
    `;
  }

  private renderDesktop() {
    return html`
      ${this.renderNotification()}
      <!-- Ultra-low-profile widescreen command telemetry bar -->
      <div
        class="flex items-center justify-between gap-2.5 w-full flex-wrap min-[1180px]:flex-nowrap px-1 py-0.5"
      >
        <!-- Telemetry & Troops group -->
        <div
          class="flex items-center gap-2 flex-1 min-w-[320px] max-w-full min-[1180px]:max-w-[55%]"
        >
          <!-- Troop rate -->
          <div
            class="flex items-center justify-center gap-1.5 shrink-0 bg-[#0e1410] border-2 rounded-lg font-mono font-bold text-xs h-7 px-2 shadow-inner cursor-help ${this.tutorialHighlightClass(
              "troop_rate",
            )} ${this._troopRateIsIncreasing
              ? "border-[#22c55e]/50 text-emerald-400"
              : "border-amber-500/50 text-amber-400"}"
            translate="no"
            @mouseenter=${(e: MouseEvent) =>
              this.showControlTooltip(
                "Production de Troupes",
                `Génération actuelle de +${renderTroops(this.troopRate)} troupes par seconde, produites par vos territoires et villes sous contrôle.`,
                "#22c55e",
                e,
              )}
            @mouseleave=${() => this.hideControlTooltip()}
          >
            <img
              src=${soldierIcon}
              alt=""
              aria-hidden="true"
              width="12"
              height="12"
              class="shrink-0"
              style="filter: ${this._troopRateIsIncreasing
                ? "brightness(0) saturate(100%) invert(74%) sepia(44%) saturate(500%) hue-rotate(83deg) brightness(103%)"
                : "brightness(0) saturate(100%) invert(65%) sepia(60%) saturate(600%) hue-rotate(330deg) brightness(105%)"}"
            />
            <span
              class="text-xs font-mono font-bold tabular-nums ${this
                ._troopRateIsIncreasing
                ? "text-emerald-400"
                : "text-amber-400"}"
              >+${renderTroops(this.troopRate)}/s</span
            >
          </div>
          <!-- Troop bar -->
          <div
            class="flex-1 cursor-help ${this.tutorialHighlightClass("troops")}"
            @mouseenter=${(e: MouseEvent) =>
              this.showControlTooltip(
                "Effectifs & Garnison",
                `Effectifs déployés : ${renderTroops(this._troops)} sur ${renderTroops(this._maxTroops)} de capacité maximale (${Math.round((this._troops / Math.max(1, this._maxTroops)) * 100)}%). Au-delà de 100%, la génération passive s'arrête.`,
                "#10b981",
                e,
              )}
            @mouseleave=${() => this.hideControlTooltip()}
          >
            ${this.renderDesktopTroopBar()}
          </div>
          <!-- Gold -->
          <div
            class="flex items-center justify-center gap-1.5 shrink-0 bg-[#0e1410] border-2 rounded-lg border-amber-500/40 font-mono font-bold text-amber-300 text-xs h-7 px-2.5 relative shadow-inner cursor-help ${this.tutorialHighlightClass(
              "gold",
            )}"
            translate="no"
            @mouseenter=${(e: MouseEvent) =>
              this.showControlTooltip(
                "Trésor Impérial",
                `Réserve financière de guerre : ${renderNumber(this._gold)} Or. Alimentée par vos usines, ports maritimes et dividendes de territoires.`,
                "#f59e0b",
                e,
              )}
            @mouseleave=${() => this.hideControlTooltip()}
          >
            ${this._goldGain !== null
              ? keyed(
                  this._goldGainPulseId,
                  html`<span
                    class="gold-gain-pop absolute -top-5 right-[5px] text-emerald-400 text-xs font-mono font-extrabold tabular-nums whitespace-nowrap pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                    >+${renderNumber(this._goldGain)}</span
                  >`,
                )
              : ""}
            <img src=${goldCoinIcon} width="14" height="14" class="shrink-0" />
            <span class="tabular-nums font-mono text-xs"
              >${renderNumber(this._gold)}</span
            >
          </div>
        </div>

        <div
          class="hidden min-[1180px]:block w-[1.5px] h-6 bg-[#2b3a2d] shrink-0"
        ></div>

        <!-- Attack ratio & Presets group -->
        <div
          class="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-[#0e1410]/80 border border-[#232f25] shrink-0 flex-1 min-[1180px]:flex-initial justify-between cursor-help ${this.tutorialHighlightClass(
            "attack_ratio",
          )}"
          translate="no"
          @mouseenter=${(e: MouseEvent) =>
            this.showControlTooltip(
              "Puissance d'Assaut",
              `Ratio engagé : ${(this.attackRatio * 100).toFixed(0)}% (${renderTroops(
                (this.game?.myPlayer()?.troops() ?? 0) * this.attackRatio,
              )} troupes mobilisées à chaque attaque). Utilisez le curseur ou les raccourcis rapides.`,
              "#38bdf8",
              e,
            )}
          @mouseleave=${() => this.hideControlTooltip()}
        >
          <div
            class="flex items-center justify-center gap-1.5 shrink-0 bg-[#151f17] border border-[#2b3a2d] rounded px-2 py-0.5 text-xs font-mono font-bold text-emerald-200 cursor-pointer w-[8.2rem] shadow-inner"
          >
            <img
              src=${swordIcon}
              alt=""
              aria-hidden="true"
              width="11"
              height="11"
              style="filter: brightness(0) invert(1);"
            />
            <span class="tabular-nums font-mono text-xs"
              >${(this.attackRatio * 100).toFixed(0)}%
              (${renderTroops(
                (this.game?.myPlayer()?.troops() ?? 0) * this.attackRatio,
              )})</span
            >
          </div>
          <input
            type="range"
            min="1"
            max="100"
            .value=${String(Math.round(this.attackRatio * 100))}
            @input=${(e: Event) => this.handleRatioSliderInput(e)}
            @pointerup=${(e: Event) => this.handleRatioSliderPointerUp(e)}
            class="w-28 sm:w-36 lg:w-44 h-1.5 accent-[#22c55e] cursor-pointer"
          />
          <!-- Quick Attack Presets -->
          <div class="flex items-center gap-1 shrink-0">
            ${[
              { label: "20%", val: 0.2 },
              { label: "50%", val: 0.5 },
              { label: "75%", val: 0.75 },
              { label: "MAX", val: 1.0 },
            ].map(
              (preset) => html`
                <button
                  type="button"
                  @click=${() => this.setRatioPreset(preset.val)}
                  class="retro-metal-btn px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all h-6 ${Math.abs(
                    this.attackRatio - preset.val,
                  ) < 0.03
                    ? "ring-2 ring-amber-400 text-amber-200 brightness-110 shadow-[0_0_8px_rgba(245,158,11,0.5)] scale-105"
                    : "text-[#8fa382] hover:text-white"}"
                >
                  ${preset.label}
                </button>
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }

  private getMobileAttackRatioLabel(): string {
    const percent = (this.attackRatio * 100).toFixed(0);
    const troops = renderTroops(
      (this.game?.myPlayer()?.troops() ?? 0) * this.attackRatio,
    );
    const translated = translateText("control_panel.attack_ratio", {
      percent,
      troops,
    });
    return translated !== "control_panel.attack_ratio" &&
      translated.includes(percent)
      ? translated
      : `${percent}%\n(${troops})`;
  }

  private renderMobile() {
    return html`
      ${this.renderNotification()}
      <div class="flex gap-2 items-center">
        <!-- Gold -->
        <div
          class="flex items-center justify-center p-1 gap-0.5 border rounded-md border-yellow-400 font-bold text-yellow-400 text-xs w-1/5 shrink-0 relative ${this.tutorialHighlightClass(
            "gold",
          )}"
          translate="no"
        >
          ${this._goldGain !== null
            ? keyed(
                this._goldGainPulseId,
                html`<span
                  class="gold-gain-pop absolute -top-5 right-[5px] min-[1015px]:right-[9px] text-green-400 text-xs font-extrabold tabular-nums whitespace-nowrap pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                  >+${renderNumber(this._goldGain)}</span
                >`,
              )
            : ""}
          <img src=${goldCoinIcon} width="13" height="13" />
          <span class="px-0.5">${renderNumber(this._gold)}</span>
        </div>
        <!-- Troop bar -->
        <div
          class="w-[40%] shrink-0 flex items-center ${this.tutorialHighlightClass(
            "troops",
          )}"
        >
          ${this.renderMobileTroopBar()}
        </div>
        <!-- Sword + % and troop count label -->
        <div class="flex flex-col items-center justify-center shrink-0">
          <div class="flex items-center gap-0.5">
            <img
              src=${swordIcon}
              alt=""
              aria-hidden="true"
              width="10"
              height="10"
              style="filter: brightness(0) invert(1);"
            />
            <span
              class="text-white text-[11px] font-bold tabular-nums text-center leading-tight whitespace-pre-wrap"
              >${this.getMobileAttackRatioLabel()}</span
            >
          </div>
        </div>
        <!-- Attack ratio slider & mobile presets -->
        <div
          class="flex-1 min-w-0 flex flex-col gap-1 ${this.tutorialHighlightClass(
            "attack_ratio",
          )}"
          translate="no"
        >
          <input
            type="range"
            min="1"
            max="100"
            .value=${String(Math.round(this.attackRatio * 100))}
            @input=${(e: Event) => this.handleRatioSliderInput(e)}
            @pointerup=${(e: Event) => this.handleRatioSliderPointerUp(e)}
            class="w-full h-1.5 accent-cyan-400 cursor-pointer"
          />
          <div class="flex items-center justify-between gap-1">
            ${[
              { label: "20%", val: 0.2 },
              { label: "50%", val: 0.5 },
              { label: "75%", val: 0.75 },
              { label: "MAX", val: 1.0 },
            ].map(
              (p) => html`
                <button
                  type="button"
                  @click=${() => this.setRatioPreset(p.val)}
                  class="flex-1 py-0.5 rounded text-[10px] font-black transition-all ${Math.abs(
                    this.attackRatio - p.val,
                  ) < 0.03
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black shadow-xs border border-cyan-300"
                    : "bg-slate-900/90 text-slate-300 border border-slate-700/60"}"
                >
                  ${p.label}
                </button>
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <style>
        @keyframes gold-gain-pop {
          0% {
            transform: translateY(4px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .gold-gain-pop {
          animation: gold-gain-pop 0.25s ease-out;
        }
      </style>
      <div
        class="relative pointer-events-auto ${this._isVisible
          ? "relative w-full text-sm px-2 py-1"
          : "hidden"}"
        @contextmenu=${(e: MouseEvent) => e.preventDefault()}
      >
        <div class="lg:hidden">${this.renderMobile()}</div>
        <div class="hidden lg:block">${this.renderDesktop()}</div>
      </div>
      ${this.renderFloatingControlTooltip()}
    `;
  }

  createRenderRoot() {
    return this; // Disable shadow DOM to allow Tailwind styles
  }
}
