import { TileRef } from "@openfront/engine-api/game/GameMap";
import {
  AllPlayers,
  GameType,
  PlayerActions,
  PlayerProfile,
  PlayerType,
  Relation,
} from "@openfront/engine-api/game/GameTypes";
import { Emoji, flattenedEmojiTable } from "@openfront/engine-api/Schemas";
import { renderNumber, renderTroops } from "@openfront/engine-lib/Format";
import type { UserMeResponse } from "@openfront/shared/ApiSchemas";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { EventBus } from "@openfront/shared/EventBus";
import {
  type LevelBadge,
  packLevelBadge,
} from "@openfront/shared/LevelBadgeWire";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import Countries from "resources/countries.json" with { type: "json" };
import { fetchLobbyListed, getUserMe } from "../../Api";
import { commanderStore } from "../../CommanderStore";
import "../../components/EquippedCosmeticsRow";
import "../../components/LevelBadge";
import { actionButton } from "../../components/ui/ActionButton";
import "../../components/ui/Divider";
import { Controller } from "../../Controller";
import {
  CloseViewEvent,
  MouseUpEvent,
  SwapRocketDirectionEvent,
} from "../../InputHandler";
import { lobbyLevelBadge } from "../../LobbyRosterLevels";
import { tacticalInteractions } from "../../TacticalInteractionManager";
import {
  PlayerReportedEvent,
  SendAllianceRequestIntentEvent,
  SendBreakAllianceIntentEvent,
  SendEmbargoAllIntentEvent,
  SendEmbargoIntentEvent,
  SendEmojiIntentEvent,
  SendTargetPlayerIntentEvent,
} from "../../Transport";
import { UIState } from "../../UIState";
import { UserSettings } from "../../UserSettings";
import { renderDuration, showToast, translateText } from "../../Utils";
import { GameView, PlayerView } from "../../view";
import { ChatModal } from "./ChatModal";
import { EmojiTable } from "./EmojiTable";
import "./PlayerModerationModal";
import "./PlayerReportModal";
import "./SendResourceModal";
const allianceIcon = assetUrl("images/AllianceIconWhite.svg");
const chatIcon = assetUrl("images/ChatIconWhite.svg");
const donateGoldIcon = assetUrl("images/DonateGoldIconWhite.svg");
const donateTroopIcon = assetUrl("images/DonateTroopIconWhite.svg");
const emojiIcon = assetUrl("images/EmojiIconWhite.svg");
const reportIcon = assetUrl("images/SirenIconWhite.svg");
const shieldIcon = assetUrl("images/ShieldIconWhite.svg");
const stopTradingIcon = assetUrl("images/StopIconWhite.svg");
const targetIcon = assetUrl("images/TargetIconWhite.svg");
const startTradingIcon = assetUrl("images/TradingIconWhite.svg");
const traitorIcon = assetUrl("images/TraitorIconLightRed.svg");
const breakAllianceIcon = assetUrl("images/TraitorIconWhite.svg");

// The viewer's own badge from their /users/@me progress. Shown even when they
// hide their level from others, as their profile does.
export function ownLevelBadgeFrom(
  me: UserMeResponse | false,
): LevelBadge | undefined {
  const progress = me === false ? undefined : me.player.progress;
  if (progress === undefined) return undefined;
  const { level, prestige, legend } = progress;
  const badge = { level, prestige, legend };
  return packLevelBadge(badge) === undefined ? undefined : badge;
}

@customElement("player-panel")
export class PlayerPanel extends LitElement implements Controller {
  public g: GameView;
  public eventBus: EventBus;
  public emojiTable: EmojiTable;
  public uiState: UIState;

  private actions: PlayerActions | null = null;
  private tile: TileRef | null = null;
  private _profileForPlayerId: number | null = null;
  private kickedPlayerIDs = new Set<string>();
  private userSettings = new UserSettings();

  @state() private sendTarget: PlayerView | null = null;
  @state() private sendMode: "troops" | "gold" | "none" = "none";
  @state() public isVisible: boolean = false;
  @state() private allianceExpiryText: string | null = null;
  @state() private allianceExpirySeconds: number | null = null;
  @state() private otherProfile: PlayerProfile | null = null;
  @state() private suppressNextHide: boolean = false;
  @state() private moderationTarget: PlayerView | null = null;
  @state() private reportTarget: PlayerView | null = null;
  @state() private bountySelectorOpen: boolean = false;
  // clientIDs this client has reported this game (confirmed sent by
  // Transport); the button locks after one.
  private reportedClientIDs = new Set<string>();
  @state() private playerRole: string | null = null;
  // Whether this game is a publicly listed lobby. Kept out of
  // GameStartInfo (never touches records), so it's fetched from the worker.
  @state() private gameListed = false;
  // Fallback for the viewer's own badge when this tab never saw the lobby
  // roster (a refresh or late join goes straight into the game).
  private ownLevelBadge: LevelBadge | undefined;

  setRole(role: string | null): void {
    this.playerRole = role;
  }

  private get isAdminRole(): boolean {
    return this.playerRole === "admin" || this.playerRole === "root";
  }

  private ctModal: ChatModal;

  createRenderRoot() {
    return this;
  }

  initEventBus(eventBus: EventBus) {
    this.eventBus = eventBus;
    eventBus.on(CloseViewEvent, (e) => {
      if (this.isVisible) {
        this.hide();
      }
    });
    eventBus.on(SwapRocketDirectionEvent, (event) => {
      this.uiState.rocketDirectionUp = event.rocketDirectionUp;
      this.requestUpdate();
    });
    eventBus.on(PlayerReportedEvent, (event) => {
      this.reportedClientIDs.add(event.reported);
      this.requestUpdate();
      showToast(translateText("player_panel.report_sent"), "green");
    });
  }
  init() {
    this.eventBus.on(MouseUpEvent, () => {
      if (this.suppressNextHide) {
        this.suppressNextHide = false;
        return;
      }
      this.hide();
    });

    this.ctModal = document.querySelector("chat-modal") as ChatModal;
    if (!this.ctModal) {
      console.warn("ChatModal element not found in DOM");
    }

    // Only private games can be listed.
    if (this.g.config().gameConfig().gameType === GameType.Private) {
      void fetchLobbyListed(this.g.gameID()).then((listed) => {
        this.gameListed = listed;
      });
    }

    // Memoised: normally answered from the profile loaded at sign-in.
    void getUserMe().then((me) => {
      this.ownLevelBadge = ownLevelBadgeFrom(me);
    });
  }

  async tick() {
    if (this.isVisible && this.tile) {
      const owner = this.g.owner(this.tile);
      if (owner && owner.isPlayer()) {
        const pv = owner as PlayerView;
        const id = pv.id();
        // fetch only if we don't have it or the player changed
        if (this._profileForPlayerId !== Number(id)) {
          this.otherProfile = await pv.profile();
          this._profileForPlayerId = Number(id);
        }
      }

      // Refresh actions & alliance expiry
      const myPlayer = this.g.myPlayer();
      if (myPlayer !== null && myPlayer.isAlive()) {
        try {
          this.actions = await myPlayer.actions(this.tile, null);
        } catch (error) {
          console.warn("Failed to refresh player panel actions:", error);
        }
        if (this.actions?.interaction?.allianceInfo?.expiresAt !== undefined) {
          const expiresAt = this.actions.interaction.allianceInfo.expiresAt;
          const remainingTicks = expiresAt - this.g.ticks();
          const remainingSeconds = Math.max(0, Math.floor(remainingTicks / 10)); // 10 ticks per second

          if (remainingTicks > 0) {
            this.allianceExpirySeconds = remainingSeconds;
            this.allianceExpiryText = renderDuration(remainingSeconds);
          } else {
            this.allianceExpirySeconds = null;
            this.allianceExpiryText = null;
          }
        } else {
          this.allianceExpirySeconds = null;
          this.allianceExpiryText = null;
        }
      }
      // Keep repainting while the panel is visible so live values (e.g. the
      // alliance countdowns) keep updating even after the local player dies.
      this.requestUpdate();
    }
  }

  public show(actions: PlayerActions, tile: TileRef) {
    this.actions = actions;
    this.tile = tile;
    this.moderationTarget = null;
    this.reportTarget = null;
    this.isVisible = true;
    this.requestUpdate();
  }

  public openSendGoldModal(
    actions: PlayerActions,
    tile: TileRef,
    target: PlayerView,
  ) {
    this.suppressNextHide = true;
    this.actions = actions;
    this.tile = tile;
    this.sendTarget = target;
    this.sendMode = "gold";
    this.moderationTarget = null;
    this.reportTarget = null;
    this.isVisible = true;
    this.requestUpdate();
  }

  public hide() {
    this.isVisible = false;
    this.sendMode = "none";
    this.sendTarget = null;
    this.moderationTarget = null;
    this.reportTarget = null;
    this.bountySelectorOpen = false;
    this.requestUpdate();
  }

  private handleClose(e: Event) {
    e.stopPropagation();
    this.hide();
  }

  private handleAllianceClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendAllianceRequestIntentEvent(myPlayer, other));
    this.hide();
  }

  private handleBreakAllianceClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendBreakAllianceIntentEvent(myPlayer, other));
    this.hide();
  }

  private openSendTroops(target: PlayerView) {
    this.suppressNextHide = true;
    this.sendTarget = target;
    this.sendMode = "troops";
  }

  private openSendGold(target: PlayerView) {
    this.suppressNextHide = true;
    this.sendTarget = target;
    this.sendMode = "gold";
  }

  private handleDonateTroopClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.openSendTroops(other);
  }

  private handleDonateGoldClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.openSendGold(other);
  }

  private closeSend = () => {
    this.sendTarget = null;
    this.sendMode = "none";
  };

  private confirmSend = (
    e: CustomEvent<{ amount: number; closePanel?: boolean }>,
  ) => {
    this.closeSend();
    if (e.detail?.closePanel) this.hide();
  };

  private handleEmbargoClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendEmbargoIntentEvent(other, "start"));
    this.hide();
  }

  private handleStopEmbargoClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendEmbargoIntentEvent(other, "stop"));
    this.hide();
  }

  private onStopTradingEnemiesClick(e: Event) {
    e.stopPropagation();
    this.eventBus.emit(new SendEmbargoAllIntentEvent("start"));
  }

  private onStartTradingEnemiesClick(e: Event) {
    e.stopPropagation();
    this.eventBus.emit(new SendEmbargoAllIntentEvent("stop"));
  }

  private handleEmojiClick(e: Event, myPlayer: PlayerView, other: PlayerView) {
    e.stopPropagation();
    this.emojiTable.showTable((emoji: string) => {
      if (myPlayer === other) {
        this.eventBus.emit(
          new SendEmojiIntentEvent(
            AllPlayers,
            flattenedEmojiTable.indexOf(emoji as Emoji),
          ),
        );
      } else {
        this.eventBus.emit(
          new SendEmojiIntentEvent(
            other,
            flattenedEmojiTable.indexOf(emoji as Emoji),
          ),
        );
      }
      this.emojiTable.hideTable();
      this.hide();
    });
  }

  private handleChat(e: Event, sender: PlayerView, other: PlayerView) {
    e.stopPropagation();

    if (!this.ctModal) {
      console.warn("ChatModal element not found in DOM");
      return;
    }

    this.ctModal.open(sender, other);
    this.hide();
  }

  private handleTargetClick(e: Event, other: PlayerView) {
    e.stopPropagation();
    this.eventBus.emit(new SendTargetPlayerIntentEvent(other.id()));
    this.hide();
  }

  private openModeration(e: MouseEvent, other: PlayerView) {
    e.stopPropagation();
    this.suppressNextHide = true;
    this.moderationTarget = other;
  }

  private closeModeration = () => {
    this.moderationTarget = null;
  };

  private handleModerationKicked = (e: CustomEvent<{ playerId?: string }>) => {
    const playerId = e.detail?.playerId;
    if (playerId) this.kickedPlayerIDs.add(String(playerId));
    this.closeModeration();
    this.hide();
  };

  private openReport(e: MouseEvent, other: PlayerView) {
    e.stopPropagation();
    this.suppressNextHide = true;
    this.reportTarget = other;
  }

  private closeReport = () => {
    this.reportTarget = null;
  };

  // Anyone may report another human of a multiplayer game. Singleplayer
  // records are client-authored and the API ignores their reports; once the
  // game is decided the record has been archived and the server refuses.
  private canReport(my: PlayerView, other: PlayerView): boolean {
    return (
      this.g.config().gameConfig().gameType !== GameType.Singleplayer &&
      !this.g.config().isReplay() &&
      !this.g.gameOver() &&
      other !== my &&
      other.type() === PlayerType.Human &&
      !!other.clientID()
    );
  }

  private handleToggleRocketDirection(e: Event) {
    e.stopPropagation();
    const next = !this.uiState.rocketDirectionUp;
    this.eventBus.emit(new SwapRocketDirectionEvent(next));
  }

  private identityChipProps(type: PlayerType) {
    switch (type) {
      case PlayerType.Nation:
        return {
          labelKey: "player_type.nation",
          classes: "border-indigo-400/25 bg-indigo-500/10 text-indigo-200",
          icon: "🏛️",
        };
      case PlayerType.Bot:
        return {
          labelKey: "player_type.bot",
          classes: "border-purple-400/25 bg-purple-500/10 text-purple-200",
          icon: "⚔️",
        };
      case PlayerType.Human:
      default:
        return {
          labelKey: "player_type.player",
          classes: "border-zinc-400/20 bg-zinc-500/5 text-zinc-300",
          icon: "👤",
        };
    }
  }

  private getRelationClass(relation: Relation): string {
    const base =
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 " +
      "shadow-[inset_0_0_8px_rgba(255,255,255,0.04)]";

    switch (relation) {
      case Relation.Hostile:
        return `${base} border-red-400/30 bg-red-500/10 text-red-200`;
      case Relation.Distrustful:
        return `${base} border-red-300/40 bg-red-300/10 text-red-300`;
      case Relation.Friendly:
        return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`;
      case Relation.Neutral:
      default:
        return `${base} border-zinc-400/30 bg-zinc-500/10 text-zinc-200`;
    }
  }

  private getRelationName(relation: Relation): string {
    switch (relation) {
      case Relation.Hostile:
        return translateText("relation.hostile");
      case Relation.Distrustful:
        return translateText("relation.distrustful");
      case Relation.Friendly:
        return translateText("relation.friendly");
      case Relation.Neutral:
      default:
        return translateText("relation.neutral");
    }
  }

  private getExpiryColorClass(seconds: number | null): string {
    if (seconds === null) return "text-white"; // Default color

    if (seconds <= 30) return "text-red-400"; // Last 30 seconds: Red
    if (seconds <= 60) return "text-yellow-400"; // Last 60 seconds: Yellow
    return "text-emerald-400"; // More than 60 seconds: Green
  }

  private getTraitorRemainingSeconds(player: PlayerView): number | null {
    const ticksLeft = player.getTraitorRemainingTicks();
    if (!player.isTraitor() || ticksLeft <= 0) return null;
    return Math.ceil(ticksLeft / 10); // 10 ticks = 1 second
  }

  private renderTraitorBadge(other: PlayerView) {
    if (!other.isTraitor()) return html``;

    const secs = this.getTraitorRemainingSeconds(other);
    const label = secs !== null ? renderDuration(secs) : null;
    const dotCls =
      secs !== null
        ? `mx-1 size-1 rounded-full bg-red-400/70 ${secs <= 10 ? "animate-pulse" : ""}`
        : "";

    return html`
      <div class="mt-1" role="status" aria-live="polite" aria-atomic="true">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-red-400/30
            bg-red-500/10 px-2.5 py-0.5 text-sm font-semibold text-red-200
            shadow-[inset_0_0_8px_rgba(239,68,68,0.12)]"
          title=${translateText("player_panel.traitor")}
        >
          <img src=${traitorIcon} alt="" aria-hidden="true" class="size-4.5" />
          <span class="tracking-tight"
            >${translateText("player_panel.traitor")}</span
          >
          ${label
            ? html`<span class=${dotCls}></span>
                <span
                  class="tabular-nums font-bold text-red-100 whitespace-nowrap text-sm"
                >
                  ${label}
                </span>`
            : ""}
        </span>
      </div>
    `;
  }

  private renderModeration(
    my: PlayerView,
    other: PlayerView,
    isAdmin: boolean,
  ) {
    const canReport = this.canReport(my, other);
    // The host of a publicly listed game cannot kick (server-enforced), so
    // don't offer the panel; admins keep it for moderation.
    const canModerate =
      (my.isLobbyCreator() || isAdmin) && (!this.gameListed || isAdmin);
    if (!canReport && !canModerate) return html``;
    const reported = this.reportedClientIDs.has(other.clientID() ?? "");
    const reportTitle = reported
      ? translateText("player_panel.reported")
      : translateText("player_panel.report");
    const moderationTitle = translateText("player_panel.moderation");

    return html`
      <ui-divider></ui-divider>
      <div class="grid auto-cols-fr grid-flow-col gap-1">
        ${canReport
          ? actionButton({
              onClick: (e: MouseEvent) => this.openReport(e, other),
              icon: reportIcon,
              iconAlt: "Report",
              title: reportTitle,
              label: reportTitle,
              type: "red",
              disabled: reported,
            })
          : ""}
        ${canModerate
          ? actionButton({
              onClick: (e: MouseEvent) => this.openModeration(e, other),
              icon: shieldIcon,
              iconAlt: "Moderation",
              title: moderationTitle,
              label: moderationTitle,
              type: "red",
            })
          : ""}
      </div>
    `;
  }

  private renderRelationPillIfNation(other: PlayerView, my: PlayerView) {
    if (other.type() !== PlayerType.Nation) return html``;
    if (other.isTraitor()) return html``;
    if (my?.isAlliedWith && my.isAlliedWith(other)) return html``;
    if (!this.otherProfile || !my) return html``;

    const relation =
      this.otherProfile.relations?.[my.smallID()] ?? Relation.Neutral;
    const cls = this.getRelationClass(relation);
    const name = this.getRelationName(relation);

    return html`
      <div class="mt-1">
        <span class="text-sm font-semibold ${cls}">${name}</span>
      </div>
    `;
  }

  // The level badge from the lobby roster, for human players only; the
  // viewer's own falls back to their /users/@me. Hidden for anyone but the
  // viewer's own player while anonymous names are on: their name is
  // anonymized then (PlayerView.displayName), and the badge belongs to the
  // real one.
  private levelBadgeFor(other: PlayerView): LevelBadge | undefined {
    if (other.type() !== PlayerType.Human) return undefined;
    const clientID = other.clientID();
    const isSelf = clientID !== null && clientID === this.g.myClientID();
    if (!isSelf && this.userSettings.anonymousNames()) return undefined;
    return (
      lobbyLevelBadge(this.g.gameID(), clientID) ??
      (isSelf ? this.ownLevelBadge : undefined)
    );
  }

  private renderIdentityRow(other: PlayerView, my: PlayerView) {
    const flagPath = other.cosmetics.flag;
    const flagCode = flagPath?.match(/\/flags\/(.+)\.svg$/)?.[1];
    const country =
      typeof flagCode === "string"
        ? Countries.find((c) => c.code === flagCode)
        : undefined;

    const chip =
      other.type() === PlayerType.Human
        ? null
        : this.identityChipProps(other.type());
    const levelBadge = this.levelBadgeFor(other);

    return html`
      <div class="flex items-center gap-2.5 flex-wrap">
        ${flagPath
          ? html`<img
              src=${assetUrl(flagPath)}
              alt=${country?.name ?? translateText("cosmetics.type_flag")}
              title=${country?.name ?? translateText("cosmetics.type_flag")}
              class="h-10 w-10 rounded-full object-cover"
              @error=${(e: Event) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />`
          : ""}

        <div class="flex-1 min-w-0 flex items-center gap-2">
          ${levelBadge
            ? html`<level-badge
                class="shrink-0"
                .level=${levelBadge.level}
                .prestige=${levelBadge.prestige}
                ?legend=${levelBadge.legend}
                size="28"
              ></level-badge>`
            : ""}
          <h2
            class="min-w-0 text-xl font-bold tracking-[-0.01em] text-zinc-50 truncate"
            title=${other.displayName()}
          >
            ${other.displayName()}
          </h2>
        </div>
        ${chip
          ? html`<span
              class=${`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${chip.classes}`}
              role="status"
              aria-label=${translateText(chip.labelKey)}
              title=${translateText(chip.labelKey)}
            >
              <span aria-hidden="true" class="leading-none">${chip.icon}</span>
              <span class="tracking-tight"
                >${translateText(chip.labelKey)}</span
              >
            </span>`
          : html``}
      </div>
      ${this.renderTraitorBadge(other)}
      ${this.renderRelationPillIfNation(other, my)}
      ${this.renderTacticalStatus(other, my)}
    `;
  }

  private renderTacticalStatus(other: PlayerView, my: PlayerView) {
    const otherId = String(other.id());
    const bounty = tacticalInteractions.getBounty(otherId);
    const pna = tacticalInteractions.isPnaActive(otherId);
    const hasRoute = tacticalInteractions.hasTradeRoute(otherId);
    const hasRadar = tacticalInteractions.hasSharedRadar(otherId);

    if (!bounty && !pna.active && !hasRoute && !hasRadar) {
      return html``;
    }

    return html`
      <div class="flex flex-wrap items-center gap-1.5 mt-2">
        ${bounty
          ? html`
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/60 px-2.5 py-0.5 text-xs font-bold text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              >
                <span class="animate-pulse">🎯</span>
                <span
                  >PRIME :
                  <span class="text-yellow-400 font-mono font-black"
                    >${bounty.amount} 🪙</span
                  ></span
                >
                <span class="text-[10px] text-red-300"
                  >(${bounty.sponsorName})</span
                >
              </span>
            `
          : ""}
        ${pna.active
          ? html`
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              >
                <span>📜</span>
                <span
                  >TRÊVE (PNA) :
                  <span class="text-white font-mono font-bold"
                    >${pna.formatted}</span
                  ></span
                >
              </span>
            `
          : ""}
        ${hasRoute
          ? html`
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-2.5 py-0.5 text-xs font-bold text-cyan-200"
              >
                <span>🚢</span>
                <span>Route Commerciale (+15% 🪙)</span>
              </span>
            `
          : ""}
        ${hasRadar
          ? html`
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-950/60 px-2.5 py-0.5 text-xs font-bold text-indigo-200"
              >
                <span>🛰️</span>
                <span>Radar Partagé Actif</span>
              </span>
            `
          : ""}
      </div>
    `;
  }

  private renderResources(other: PlayerView) {
    return html`
      <div class="mb-1 flex justify-between gap-2">
        <div
          class="inline-flex items-center gap-1.5 rounded-lg bg-white/4 px-3 py-1.5 shrink-0
                    text-white w-35"
        >
          <span class="mr-0.5">💰</span>
          <span translate="no" class="tabular-nums w-[5ch] font-semibold">
            ${renderNumber(other.gold() || 0)}
          </span>
          <span class="text-zinc-200 whitespace-nowrap">
            ${translateText("player_panel.gold")}</span
          >
        </div>

        <div
          class="inline-flex items-center gap-1.5 rounded-lg bg-white/4 px-3 py-1.5
                    text-white w-35 shrink-0"
        >
          <span class="mr-0.5">🛡️</span>
          <span translate="no" class="tabular-nums w-[5ch] font-semibold">
            ${renderTroops(other.troops() || 0)}
          </span>
          <span class="text-zinc-200 whitespace-nowrap">
            ${translateText("player_panel.troops")}</span
          >
        </div>
      </div>
    `;
  }

  private renderRocketDirectionToggle() {
    return html`
      <ui-divider></ui-divider>
      <button
        class="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left text-white hover:bg-white/8 active:scale-[0.995] transition"
        @click=${(e: Event) => this.handleToggleRocketDirection(e)}
      >
        <div class="flex flex-col">
          <span class="text-sm font-semibold tracking-tight">
            ${translateText("player_panel.flip_rocket_trajectory")}
          </span>
          <span class="text-xs text-zinc-300" translate="no">
            ${this.uiState.rocketDirectionUp
              ? translateText("player_panel.arc_up")
              : translateText("player_panel.arc_down")}
          </span>
        </div>
        <span class="text-lg" aria-hidden="true">🔀</span>
      </button>
    `;
  }

  private renderStats(other: PlayerView, my: PlayerView) {
    return html`
      <!-- Betrayals -->
      <div class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <div
          class="flex items-center gap-2 text-[15px] font-medium text-zinc-100 leading-snug"
        >
          <span aria-hidden="true">⚠️</span>
          <span>${translateText("player_panel.betrayals")}</span>
        </div>
        <div class="text-right text-[14px] font-semibold text-zinc-200">
          ${other.betrayals()}
        </div>
      </div>

      <!-- Trading / Embargo -->
      <div class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <div
          class="flex items-center gap-2 text-[15px] font-medium text-zinc-100 leading-snug"
        >
          <span aria-hidden="true">⚓</span>
          <span>${translateText("player_panel.trading")}</span>
        </div>
        <div
          class="flex items-center justify-end gap-2 text-[14px] font-semibold"
        >
          ${other.hasEmbargoAgainst(my)
            ? html`<span class="text-amber-400"
                >${translateText("player_panel.stopped")}</span
              >`
            : html`<span class="text-blue-400"
                >${translateText("player_panel.active")}</span
              >`}
        </div>
      </div>
    `;
  }

  private renderAlliances(other: PlayerView) {
    const allies = other.allies();

    // Map ally PlayerID → expiry tick so each ally shows its own remaining time.
    const expiryByAlly = new Map<string, number>();
    for (const alliance of other.alliances()) {
      expiryByAlly.set(alliance.other, alliance.expiresAt);
    }
    const remainingSecondsFor = (ally: PlayerView): number | null => {
      const expiresAt = expiryByAlly.get(ally.id());
      if (expiresAt === undefined) return null;
      const remainingTicks = expiresAt - this.g.ticks();
      return Math.max(0, Math.floor(remainingTicks / 10)); // 10 ticks per second
    };

    // Soonest-expiring alliances first; ties (and no-expiry allies) by name.
    const nameCollator = new Intl.Collator(undefined, { sensitivity: "base" });
    const alliesSorted = [...allies].sort((a, b) => {
      const remainingA = remainingSecondsFor(a) ?? Infinity;
      const remainingB = remainingSecondsFor(b) ?? Infinity;
      if (remainingA !== remainingB) return remainingA - remainingB;
      return nameCollator.compare(a.displayName(), b.displayName());
    });

    return html`
      <div class="select-none">
        <div class="flex items-center justify-between mb-2">
          <div
            id="alliances-title"
            class="text-[15px] font-medium text-zinc-200"
          >
            ${translateText("player_panel.alliances")}
          </div>
          <span
            aria-labelledby="alliances-title"
            class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-[10px]
                 text-[12px] text-zinc-100 bg-white/10 border border-white/20"
          >
            ${allies.length}
          </span>
        </div>

        <div
          class="rounded-lg bg-zinc-800/70 ring-1 ring-zinc-700/60 w-full min-w-0"
        >
          <ul
            class="max-h-48 overflow-y-auto p-2
                 flex flex-wrap gap-1.5
                 scrollbar-thin scrollbar-thumb-zinc-600 hover:scrollbar-thumb-zinc-500 scrollbar-track-zinc-800"
            role="list"
            aria-labelledby="alliances-title"
            translate="no"
          >
            ${alliesSorted.length === 0
              ? html`<li class="text-zinc-400 text-[14px] px-1">
                  ${translateText("common.none")}
                </li>`
              : alliesSorted.map((p) => {
                  const remainingSeconds = remainingSecondsFor(p);
                  return html`<li
                    class="max-w-full inline-flex items-center gap-1.5
                           rounded-md border border-white/10 bg-white/5
                           px-2.5 py-1 text-[14px] text-zinc-100
                           hover:bg-white/8 active:scale-[0.99] transition"
                    title=${p.displayName()}
                  >
                    <span class="truncate">${p.displayName()}</span>
                    ${remainingSeconds !== null
                      ? html`<span
                          class="text-[11px] font-semibold leading-none tabular-nums ${this.getExpiryColorClass(
                            remainingSeconds,
                          )}"
                          >${renderDuration(remainingSeconds)}</span
                        >`
                      : ""}
                  </li>`;
                })}
          </ul>
        </div>
      </div>
    `;
  }

  private renderAllianceExpiry() {
    if (this.allianceExpiryText === null) return html``;
    return html`
      <div class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-base">
        <div class="font-semibold text-zinc-300">
          ${translateText("player_panel.alliance_time_remaining")}
        </div>
        <div class="text-right font-semibold">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[14px] font-bold ${this.getExpiryColorClass(
              this.allianceExpirySeconds,
            )}"
            >${this.allianceExpiryText}</span
          >
        </div>
      </div>
    `;
  }

  private renderActions(my: PlayerView, other: PlayerView) {
    const myPlayer = this.g.myPlayer();
    const canDonateGold = this.actions?.interaction?.canDonateGold;
    const canDonateTroops = this.actions?.interaction?.canDonateTroops;
    const canSendAllianceRequest =
      this.actions?.interaction?.canSendAllianceRequest;
    const canSendEmoji =
      other === myPlayer
        ? this.actions?.canSendEmojiAllPlayers
        : this.actions?.interaction?.canSendEmoji;
    const canBreakAlliance = this.actions?.interaction?.canBreakAlliance;
    const canTarget = this.actions?.interaction?.canTarget;
    const canEmbargo = this.actions?.interaction?.canEmbargo;

    return html`
      <div class="flex flex-col gap-2.5">
        <div class="grid auto-cols-fr grid-flow-col gap-1">
          ${actionButton({
            onClick: (e: MouseEvent) => this.handleChat(e, my, other),
            icon: chatIcon,
            iconAlt: "Chat",
            title: translateText("player_panel.chat"),
            label: translateText("player_panel.chat"),
          })}
          ${canSendEmoji
            ? actionButton({
                onClick: (e: MouseEvent) => this.handleEmojiClick(e, my, other),
                icon: emojiIcon,
                iconAlt: "Emoji",
                title: translateText("player_panel.emotes"),
                label: translateText("player_panel.emotes"),
                type: "normal",
              })
            : ""}
          ${canTarget
            ? actionButton({
                onClick: (e: MouseEvent) => this.handleTargetClick(e, other),
                icon: targetIcon,
                iconAlt: "Target",
                title: translateText("player_panel.target"),
                label: translateText("player_panel.target"),
                type: "normal",
              })
            : ""}
          ${canDonateTroops
            ? actionButton({
                onClick: (e: MouseEvent) =>
                  this.handleDonateTroopClick(e, my, other),
                icon: donateTroopIcon,
                iconAlt: "Troops",
                title: translateText("player_panel.send_troops"),
                label: translateText("player_panel.troops"),
                type: "normal",
              })
            : ""}
          ${canDonateGold
            ? actionButton({
                onClick: (e: MouseEvent) =>
                  this.handleDonateGoldClick(e, my, other),
                icon: donateGoldIcon,
                iconAlt: "Gold",
                title: translateText("player_panel.send_gold"),
                label: translateText("player_panel.gold"),
                type: "normal",
              })
            : ""}
        </div>
        <ui-divider></ui-divider>
        ${other === my
          ? html``
          : html`
              <div class="grid auto-cols-fr grid-flow-col gap-1">
                ${canEmbargo
                  ? actionButton({
                      onClick: (e: MouseEvent) =>
                        this.handleEmbargoClick(e, my, other),
                      icon: stopTradingIcon,
                      iconAlt: "Stop Trading",
                      title: translateText("player_panel.stop_trade"),
                      label: translateText("player_panel.stop_trade"),
                      type: "yellow",
                    })
                  : actionButton({
                      onClick: (e: MouseEvent) =>
                        this.handleStopEmbargoClick(e, my, other),
                      icon: startTradingIcon,
                      iconAlt: "Start Trading",
                      title: translateText("player_panel.start_trade"),
                      label: translateText("player_panel.start_trade"),
                      type: "green",
                    })}
                ${canBreakAlliance
                  ? actionButton({
                      onClick: (e: MouseEvent) =>
                        this.handleBreakAllianceClick(e, my, other),
                      icon: breakAllianceIcon,
                      iconAlt: "Break Alliance",
                      title: translateText("player_panel.break_alliance"),
                      label: translateText("player_panel.break_alliance"),
                      type: "red",
                    })
                  : ""}
                ${canSendAllianceRequest
                  ? actionButton({
                      onClick: (e: MouseEvent) =>
                        this.handleAllianceClick(e, my, other),
                      icon: allianceIcon,
                      iconAlt: "Alliance",
                      title: translateText("player_panel.send_alliance"),
                      label: translateText("player_panel.send_alliance"),
                      type: "indigo",
                    })
                  : ""}
              </div>
            `}
        ${other === my
          ? html`<div class="grid auto-cols-fr grid-flow-col gap-1">
              ${actionButton({
                onClick: (e: MouseEvent) => this.onStopTradingEnemiesClick(e),
                icon: stopTradingIcon,
                iconAlt: "Stop Trading With Enemies",
                title: !this.actions?.canEmbargoAll
                  ? `${translateText("player_panel.stop_trade_enemies")} - ${translateText("cooldown")}`
                  : translateText("player_panel.stop_trade_enemies"),
                label: !this.actions?.canEmbargoAll
                  ? `${translateText("player_panel.stop_trade_enemies")} ⏳`
                  : translateText("player_panel.stop_trade_enemies"),
                type: "yellow",
                disabled: !this.actions?.canEmbargoAll,
              })}
              ${actionButton({
                onClick: (e: MouseEvent) => this.onStartTradingEnemiesClick(e),
                icon: startTradingIcon,
                iconAlt: "Start Trading With Enemies",
                title: !this.actions?.canEmbargoAll
                  ? `${translateText("player_panel.start_trade_enemies")} - ${translateText("cooldown")}`
                  : translateText("player_panel.start_trade_enemies"),
                label: !this.actions?.canEmbargoAll
                  ? `${translateText("player_panel.start_trade_enemies")} ⏳`
                  : translateText("player_panel.start_trade_enemies"),
                type: "green",
                disabled: !this.actions?.canEmbargoAll,
              })}
            </div>`
          : ""}
        ${this.renderTacticalOperations(my, other)}
        ${this.renderModeration(my, other, this.isAdminRole)}
      </div>
    `;
  }

  private renderTacticalOperations(my: PlayerView, other: PlayerView) {
    if (other === my) return html``;

    const otherId = String(other.id());
    const isAllied =
      (my?.isAlliedWith ? my.isAlliedWith(other) : false) ||
      Boolean(this.actions?.interaction?.canBreakAlliance);
    const bounty = tacticalInteractions.getBounty(otherId);
    const pna = tacticalInteractions.isPnaActive(otherId);
    const hasRoute = tacticalInteractions.hasTradeRoute(otherId);
    const hasRadar = tacticalInteractions.hasSharedRadar(otherId);
    const myCaps = commanderStore.getProfile().caps;

    return html`
      <ui-divider></ui-divider>
      <div class="flex flex-col gap-2">
        <div
          class="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400/90"
        >
          <span class="flex items-center gap-1.5">
            <span class="text-sm">⚡</span>
            <span>Interactions Tactiques</span>
          </span>
          <span class="text-[11px] font-mono font-medium text-zinc-400">
            Capsules :
            <span class="text-amber-300 font-bold"
              >${renderNumber(myCaps)} 🪙</span
            >
          </span>
        </div>

        ${isAllied
          ? html`
              <!-- Allié: Route Commerciale & Partage de Radar -->
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click=${(e: MouseEvent) => {
                    e.stopPropagation();
                    tacticalInteractions.toggleTradeRoute(
                      other,
                      my,
                      this.eventBus,
                    );
                    this.requestUpdate();
                  }}
                  class="group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-150 ${hasRoute
                    ? "bg-cyan-950/70 border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "bg-white/4 border-white/10 hover:bg-white/10 text-zinc-200"}"
                >
                  <div class="flex items-center gap-1.5 font-bold text-xs">
                    <span
                      class="text-base group-hover:scale-110 transition-transform"
                      >🚢</span
                    >
                    <span
                      >${hasRoute ? "Route Active" : "Route Commerciale"}</span
                    >
                  </div>
                  <span class="text-[10px] text-zinc-400 mt-0.5">
                    ${hasRoute ? "Revenu +15% Or actif" : "+15% Or partagé"}
                  </span>
                </button>

                <button
                  type="button"
                  @click=${(e: MouseEvent) => {
                    e.stopPropagation();
                    tacticalInteractions.toggleSharedRadar(
                      other,
                      this.eventBus,
                    );
                    this.requestUpdate();
                  }}
                  class="group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-150 ${hasRadar
                    ? "bg-indigo-950/70 border-indigo-400/60 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                    : "bg-white/4 border-white/10 hover:bg-white/10 text-zinc-200"}"
                >
                  <div class="flex items-center gap-1.5 font-bold text-xs">
                    <span
                      class="text-base group-hover:scale-110 transition-transform"
                      >🛰️</span
                    >
                    <span
                      >${hasRadar ? "Radar Connecté" : "Partage de Radar"}</span
                    >
                  </div>
                  <span class="text-[10px] text-zinc-400 mt-0.5">
                    ${hasRadar ? "Détection active" : "Vision partagée"}
                  </span>
                </button>
              </div>
            `
          : html`
              <!-- Non-allié / Ennemi: Assaut Coordonné, Prime, Trêve PNA -->
              <div class="grid grid-cols-3 gap-1.5">
                <!-- 1. Assaut Coordonné -->
                <button
                  type="button"
                  @click=${(e: MouseEvent) => {
                    e.stopPropagation();
                    tacticalInteractions.startAssaultCountdown(
                      other.displayName(),
                      my.displayName(),
                      this.eventBus,
                      other.id(),
                    );
                    this.hide();
                  }}
                  class="group flex flex-col items-center justify-center p-2 rounded-xl bg-red-950/40 border border-red-500/40 hover:bg-red-900/50 hover:border-red-400 text-red-200 transition-all duration-150 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                  title="Lancer un compte à rebours sonore et visuel de 5s pour coordonner l'attaque de vos alliés"
                >
                  <span
                    class="text-base group-hover:scale-110 transition-transform"
                    >⏱️</span
                  >
                  <span class="text-xs font-bold leading-tight mt-0.5"
                    >Assaut (5s)</span
                  >
                  <span class="text-[9px] text-red-300/80">Coordonné</span>
                </button>

                <!-- 2. Placer une prime -->
                <button
                  type="button"
                  @click=${(e: MouseEvent) => {
                    e.stopPropagation();
                    this.bountySelectorOpen = !this.bountySelectorOpen;
                    this.requestUpdate();
                  }}
                  class="group flex flex-col items-center justify-center p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/50 hover:border-amber-400 text-amber-200 transition-all duration-150 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                  title="Mettre une prime en Capsules sur la tête de ce joueur"
                >
                  <span
                    class="text-base group-hover:scale-110 transition-transform"
                    >🎯</span
                  >
                  <span class="text-xs font-bold leading-tight mt-0.5">
                    ${bounty ? `Prime: ${bounty.amount}🪙` : "Prime (Caps)"}
                  </span>
                  <span class="text-[9px] text-amber-300/80">
                    ${bounty ? "+ Augmenter" : "Mettre à prix"}
                  </span>
                </button>

                <!-- 3. Pacte de Non-Agression (PNA) -->
                ${pna.active
                  ? html`
                      <button
                        type="button"
                        @click=${(e: MouseEvent) => {
                          e.stopPropagation();
                          tacticalInteractions.breakPna(otherId, this.eventBus);
                          this.requestUpdate();
                        }}
                        class="group flex flex-col items-center justify-center p-2 rounded-xl bg-rose-950/50 border border-rose-500/60 hover:bg-rose-900/70 text-rose-200 transition-all duration-150 animate-pulse"
                        title="Rompre la trêve immédiatement"
                      >
                        <span
                          class="text-base group-hover:scale-110 transition-transform"
                          >🚨</span
                        >
                        <span class="text-xs font-bold leading-tight mt-0.5"
                          >Rompre PNA</span
                        >
                        <span class="text-[9px] text-rose-300 font-mono"
                          >${pna.formatted}</span
                        >
                      </button>
                    `
                  : html`
                      <button
                        type="button"
                        @click=${(e: MouseEvent) => {
                          e.stopPropagation();
                          tacticalInteractions.proposePna(
                            other,
                            my,
                            this.eventBus,
                            180,
                          );
                          this.requestUpdate();
                        }}
                        class="group flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/50 hover:border-emerald-400 text-emerald-200 transition-all duration-150 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        title="Proposer une trêve diplomatique temporaire de 3 minutes"
                      >
                        <span
                          class="text-base group-hover:scale-110 transition-transform"
                          >📜</span
                        >
                        <span class="text-xs font-bold leading-tight mt-0.5"
                          >Trêve (PNA)</span
                        >
                        <span class="text-[9px] text-emerald-300/80"
                          >3 minutes</span
                        >
                      </button>
                    `}
              </div>

              <!-- Bounty Quick Selector Drawer -->
              ${this.bountySelectorOpen
                ? html`
                    <div
                      class="mt-1 p-3 rounded-xl bg-zinc-800/95 border border-amber-500/50 shadow-xl flex flex-col gap-2"
                    >
                      <div
                        class="flex items-center justify-between text-xs font-bold text-amber-300"
                      >
                        <span class="flex items-center gap-1">
                          <span>🎯</span>
                          <span
                            >CONTRAT DE CHASSE : ${other.displayName()}</span
                          >
                        </span>
                        <span class="text-[11px] text-zinc-300 font-mono">
                          Dispo :
                          <span class="text-yellow-400 font-bold"
                            >${myCaps} 🪙</span
                          >
                        </span>
                      </div>
                      <p class="text-[11.5px] text-zinc-300 leading-snug">
                        Sélectionnez le montant de Capsules à placer sur sa
                        tête. Le commandant qui le terrassera empochera la prime
                        !
                      </p>
                      <div class="grid grid-cols-4 gap-1.5 mt-0.5">
                        ${[100, 250, 500, 1000].map(
                          (amt) => html`
                            <button
                              type="button"
                              ?disabled=${myCaps < amt}
                              @click=${(e: MouseEvent) => {
                                e.stopPropagation();
                                const ok = tacticalInteractions.placeBounty(
                                  other,
                                  my,
                                  amt,
                                  this.eventBus,
                                );
                                if (ok) {
                                  this.bountySelectorOpen = false;
                                  this.requestUpdate();
                                }
                              }}
                              class="py-2 px-1 rounded-lg border font-bold text-xs flex flex-col items-center transition-all ${myCaps >=
                              amt
                                ? "bg-amber-500/20 hover:bg-amber-500/35 border-amber-500/50 text-amber-200 active:scale-95"
                                : "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60"}"
                            >
                              <span>+${amt}</span>
                              <span class="text-[10px] text-yellow-400"
                                >🪙 Caps</span
                              >
                            </button>
                          `,
                        )}
                      </div>
                      <div class="flex justify-end mt-1">
                        <button
                          type="button"
                          @click=${(e: MouseEvent) => {
                            e.stopPropagation();
                            this.bountySelectorOpen = false;
                            this.requestUpdate();
                          }}
                          class="text-[11px] text-zinc-400 hover:text-white px-2 py-1"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  `
                : ""}
            `}
      </div>
    `;
  }

  render() {
    if (!this.isVisible) return html``;

    const my = this.g.myPlayer();
    const isSpectator = this.g.isSpectator();
    if (!my && !isSpectator) return html``;
    if (!this.tile) return html``;

    const owner = this.g.owner(this.tile);
    if (!owner || !owner.isPlayer()) {
      this.hide();
      console.warn("Tile is not owned by a player");
      return html``;
    }
    const other = owner as PlayerView;
    // Spectators (replay viewers, dead, or pre-spawn) have no live player; use other as a read-only stand-in
    const viewer = my ?? other;
    const myGoldNum = viewer.gold();
    const myTroopsNum = Number(viewer.troops());

    return html`
      <style>
        /* Soft glowing ring animation for traitors */
        .traitor-ring {
          border-radius: 1rem;
          box-shadow:
            0 0 0 2px rgba(239, 68, 68, 0.34),
            0 0 12px 4px rgba(239, 68, 68, 0.22),
            inset 0 0 14px rgba(239, 68, 68, 0.13);
          animation: glowPulse 2.4s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%,
          100% {
            box-shadow:
              0 0 0 2px rgba(239, 68, 68, 0.22),
              0 0 8px 2px rgba(239, 68, 68, 0.15),
              inset 0 0 8px rgba(239, 68, 68, 0.07);
          }
          50% {
            box-shadow:
              0 0 0 4px rgba(239, 68, 68, 0.38),
              0 0 18px 6px rgba(239, 68, 68, 0.26),
              inset 0 0 18px rgba(239, 68, 68, 0.15);
          }
        }
      </style>

      <div
        class="fixed inset-0 z-10001 flex items-center justify-center overflow-auto
               bg-black/15 backdrop-brightness-110 pointer-events-auto"
        @contextmenu=${(e: MouseEvent) => e.preventDefault()}
        @wheel=${(e: MouseEvent) => e.stopPropagation()}
        @click=${() => this.hide()}
      >
        <div
          class="pointer-events-auto max-h-[90vh] min-w-75 max-w-100 px-4 py-2"
          @click=${(e: MouseEvent) => e.stopPropagation()}
        >
          <div class="relative">
            <div
              class="absolute inset-2 -z-10 rounded-2xl bg-black/25 backdrop-blur-[2px]"
            ></div>
            <div
              class=${`relative w-full bg-[#121813]/98 border-2 border-[#2b3a2d] rounded-2xl text-slate-100 shadow-2xl shadow-black/80 font-mono overflow-hidden
                 ${other.isTraitor() ? "traitor-ring" : ""}`}
            >
              <div class="crt-screw crt-screw-tl hidden sm:block"></div>
              <div class="crt-screw crt-screw-tr hidden sm:block"></div>
              <div class="crt-screw crt-screw-bl hidden sm:block"></div>
              <div class="crt-screw crt-screw-br hidden sm:block"></div>
              <div class="overflow-visible">
                <div
                  class="overflow-auto [-webkit-overflow-scrolling:touch] resize-y max-h-[calc(100vh-120px-env(safe-area-inset-bottom))]"
                >
                  <div class="sticky top-0 z-20 flex justify-end p-2">
                    <button
                      @click=${this.handleClose}
                      class="retro-metal-btn absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-[#18231a] text-slate-300 border border-[#2b3a2d] shadow-sm hover:text-red-400 hover:border-red-500 transition-colors font-mono font-bold"
                      aria-label=${translateText("common.close") || "Close"}
                      title=${translateText("common.close") || "Close"}
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    class="p-6 flex flex-col gap-2 font-sans antialiased text-[14.5px] leading-relaxed"
                  >
                    <!-- Identity (flag, name, type, traitor, relation) -->
                    <div class="mb-1">
                      ${this.renderIdentityRow(other, viewer)}
                    </div>

                    <!-- Cosmetics the player has equipped -->
                    <equipped-cosmetics-row
                      .cosmetics=${other.cosmetics}
                    ></equipped-cosmetics-row>

                    ${this.sendTarget && !isSpectator
                      ? html`
                          <send-resource-modal
                            .open=${this.sendMode !== "none"}
                            .mode=${this.sendMode}
                            .total=${this.sendMode === "troops"
                              ? myTroopsNum
                              : myGoldNum}
                            .uiState=${this.uiState}
                            .myPlayer=${viewer}
                            .target=${this.sendTarget}
                            .gameView=${this.g}
                            .eventBus=${this.eventBus}
                            .format=${this.sendMode === "troops"
                              ? renderTroops
                              : renderNumber}
                            @confirm=${this.confirmSend}
                            @close=${this.closeSend}
                          ></send-resource-modal>
                        `
                      : ""}
                    ${this.moderationTarget
                      ? html`
                          <player-moderation-modal
                            .open=${true}
                            .myPlayer=${viewer}
                            .target=${this.moderationTarget}
                            .eventBus=${this.eventBus}
                            .isAdmin=${this.isAdminRole}
                            .alreadyKicked=${this.kickedPlayerIDs.has(
                              String(this.moderationTarget.id()),
                            )}
                            @close=${this.closeModeration}
                            @kicked=${this.handleModerationKicked}
                          ></player-moderation-modal>
                        `
                      : ""}
                    ${this.reportTarget
                      ? html`
                          <player-report-modal
                            .open=${true}
                            .target=${this.reportTarget}
                            .eventBus=${this.eventBus}
                            @close=${this.closeReport}
                          ></player-report-modal>
                        `
                      : ""}

                    <ui-divider></ui-divider>

                    <!-- Resources -->
                    ${this.renderResources(other)}

                    <!-- Rocket direction toggle -->
                    ${other === viewer && !isSpectator
                      ? this.renderRocketDirectionToggle()
                      : ""}

                    <ui-divider></ui-divider>

                    <!-- Stats: betrayals / trading -->
                    ${this.renderStats(other, viewer)}

                    <ui-divider></ui-divider>

                    <!-- Alliances list -->
                    ${this.renderAlliances(other)}

                    <!-- Alliance time remaining -->
                    ${this.renderAllianceExpiry()}
                    ${!isSpectator
                      ? html`
                          <ui-divider></ui-divider>
                          <!-- Actions -->
                          ${this.renderActions(viewer, other)}
                        `
                      : my
                        ? // Dead (or not yet spawned) players still get to
                          // report and, as host/admin, moderate.
                          this.renderModeration(my, other, this.isAdminRole)
                        : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
