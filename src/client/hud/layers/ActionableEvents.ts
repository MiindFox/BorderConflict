import { MessageType, Tick } from "@openfront/engine-api/game/GameTypes";
import {
  AllianceExtensionUpdate,
  AllianceRequestReplyUpdate,
  AllianceRequestUpdate,
  BrokeAllianceUpdate,
  GameUpdateType,
} from "@openfront/engine-api/game/GameUpdates";
import { EventBus } from "@openfront/shared/EventBus";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Controller } from "../../Controller";
import { PlaySoundEffectEvent } from "../../sound/Sounds";
import { GoToPlayerEvent } from "../../TransformHandler";
import {
  SendAllianceExtensionIntentEvent,
  SendAllianceRejectIntentEvent,
  SendAllianceRequestIntentEvent,
} from "../../Transport";
import { UIState } from "../../UIState";
import { getMessageTypeClasses, translateText } from "../../Utils";
import { GameView, PlayerView } from "../../view";

interface ActionableEvent {
  description: string;
  type: MessageType;
  createdAt: number;
  focusID: number;
  buttons: {
    text: string;
    className: string;
    action: () => void;
    preventClose?: boolean;
  }[];
  priority?: number;
  allianceID?: number;
  duration?: Tick;
  requestorID: number;
}

@customElement("actionable-events")
export class ActionableEvents extends LitElement implements Controller {
  public eventBus: EventBus;
  public game: GameView;
  public uiState: UIState;

  private active = false;
  private events: ActionableEvent[] = [];
  // allianceID -> last checked at tick
  private alliancesCheckedAt = new Map<number, Tick>();
  @state() private _isVisible = false;

  private updateMap = [
    [GameUpdateType.AllianceRequest, this.onAllianceRequestEvent.bind(this)],
    [
      GameUpdateType.AllianceRequestReply,
      this.onAllianceRequestReplyEvent.bind(this),
    ],
    [GameUpdateType.BrokeAlliance, this.onBrokeAllianceEvent.bind(this)],
    [
      GameUpdateType.AllianceExtension,
      this.onAllianceExtensionEvent.bind(this),
    ],
  ] as const;

  createRenderRoot() {
    return this;
  }

  private addEvent(event: ActionableEvent) {
    this.events = [...this.events, event];
    this.requestUpdate();
  }

  private removeEvent(index: number) {
    this.events = [
      ...this.events.slice(0, index),
      ...this.events.slice(index + 1),
    ];
  }

  private removeAllianceRenewalEvents(allianceID: number) {
    this.events = this.events.filter(
      (event) =>
        !(
          event.type === MessageType.RENEW_ALLIANCE &&
          event.allianceID === allianceID
        ),
    );
  }

  tick() {
    this.active = true;

    if (!this._isVisible && !this.game.inSpawnPhase()) {
      this._isVisible = true;
      this.requestUpdate();
    }

    const myPlayer = this.game.myPlayer();
    if (!myPlayer || !myPlayer.isAlive()) {
      if (this._isVisible) {
        this._isVisible = false;
        this.requestUpdate();
      }
      return;
    }

    this.checkForAllianceExpirations();

    const updates = this.game.updatesSinceLastTick();
    if (updates) {
      for (const [ut, fn] of this.updateMap) {
        updates[ut]?.forEach(fn as (event: unknown) => void);
      }
    }

    const remainingEvents = this.events.filter(
      (event) =>
        (event.duration === undefined ||
          this.game.ticks() - event.createdAt < event.duration) &&
        (event.type !== MessageType.ALLIANCE_REQUEST ||
          // We remove Alliance Requests if the requestor is dead.
          ((
            this.game.playerBySmallID(event.requestorID) as PlayerView
          ).isAlive() &&
            // We remove Alliance Requests if the requestor is no longer requesting an alliance with us.
            (
              this.game.playerBySmallID(event.requestorID) as PlayerView
            ).isRequestingAllianceWith(this.game.myPlayer() as PlayerView))),
    );

    if (this.events.length !== remainingEvents.length) {
      this.events = remainingEvents;
      this.requestUpdate();
    }
  }

  private checkForAllianceExpirations() {
    const myPlayer = this.game.myPlayer();
    if (!myPlayer?.isAlive()) return;

    const currentAllianceIds = new Set<number>();

    for (const alliance of myPlayer.alliances()) {
      currentAllianceIds.add(alliance.id);

      if (
        alliance.expiresAt >
        this.game.ticks() + this.game.config().allianceExtensionPromptOffset()
      ) {
        continue;
      }

      if (
        (this.alliancesCheckedAt.get(alliance.id) ?? 0) >=
        this.game.ticks() - this.game.config().allianceExtensionPromptOffset()
      ) {
        // Already prompted for this alliance in the current window.
        continue;
      }

      this.alliancesCheckedAt.set(alliance.id, this.game.ticks());

      const other = this.game.player(alliance.other) as PlayerView;

      this.addEvent({
        description: translateText("events_display.about_to_expire", {
          name: other.displayName(),
        }),
        type: MessageType.RENEW_ALLIANCE,
        buttons: [
          {
            text: translateText("events_display.focus"),
            className: "btn-gray",
            action: () => this.eventBus.emit(new GoToPlayerEvent(other)),
            preventClose: true,
          },
          {
            text: translateText("events_display.renew_alliance", {
              name: other.displayName(),
            }),
            className: "btn",
            action: () =>
              this.eventBus.emit(new SendAllianceExtensionIntentEvent(other)),
          },
          {
            text: translateText("events_display.ignore"),
            className: "btn-info",
            action: () => {},
          },
        ],
        createdAt: this.game.ticks(),
        focusID: other.smallID(),
        allianceID: alliance.id,
        requestorID: other.smallID(),
      });
    }

    for (const [allianceId] of this.alliancesCheckedAt) {
      if (!currentAllianceIds.has(allianceId)) {
        this.removeAllianceRenewalEvents(allianceId);
        this.alliancesCheckedAt.delete(allianceId);
        this.requestUpdate();
      }
    }
  }

  onAllianceRequestEvent(update: AllianceRequestUpdate) {
    const myPlayer = this.game.myPlayer();
    if (!myPlayer || update.recipientID !== myPlayer.smallID()) {
      return;
    }

    const requestor = this.game.playerBySmallID(
      update.requestorID,
    ) as PlayerView;
    const recipient = this.game.playerBySmallID(
      update.recipientID,
    ) as PlayerView;

    if (!requestor.isAlliedWith(recipient)) {
      this.eventBus.emit(new PlaySoundEffectEvent("alliance-suggested"));
    }
    this.addEvent({
      description: translateText("events_display.request_alliance", {
        name: requestor.displayName(),
      }),
      buttons: [
        {
          text: translateText("events_display.focus"),
          className: "btn-gray",
          action: () => this.eventBus.emit(new GoToPlayerEvent(requestor)),
          preventClose: true,
        },
        {
          text: translateText("events_display.accept_alliance"),
          className: "btn",
          action: () => {
            this.eventBus.emit(new PlaySoundEffectEvent("alliance-accepted"));
            this.eventBus.emit(
              new SendAllianceRequestIntentEvent(recipient, requestor),
            );
          },
        },
        {
          text: translateText("events_display.reject_alliance"),
          className: "btn-info",
          action: () => {
            this.eventBus.emit(new PlaySoundEffectEvent("alliance-declined"));
            this.eventBus.emit(new SendAllianceRejectIntentEvent(requestor));
          },
        },
      ],
      type: MessageType.ALLIANCE_REQUEST,
      createdAt: this.game.ticks(),
      priority: 0,
      duration: this.game.config().allianceRequestDuration(),
      focusID: update.requestorID,
      requestorID: update.requestorID,
    });
  }

  private onAllianceRequestReplyEvent(update: AllianceRequestReplyUpdate) {
    const myPlayer = this.game.myPlayer();
    if (!myPlayer || update.request.recipientID !== myPlayer.smallID()) {
      return;
    }
    // The incoming alliance request was resolved (accepted or rejected), so
    // remove any pending request card from that player.
    const requestorID = update.request.requestorID;
    const remaining = this.events.filter(
      (event) =>
        !(
          event.type === MessageType.ALLIANCE_REQUEST &&
          event.focusID === requestorID
        ),
    );
    if (remaining.length !== this.events.length) {
      this.events = remaining;
      this.requestUpdate();
    }
  }

  onBrokeAllianceEvent(update: BrokeAllianceUpdate) {
    // Cleanup-only: any open renewal prompt for this alliance is now moot.
    this.removeAllianceRenewalEvents(update.allianceID);
    this.alliancesCheckedAt.delete(update.allianceID);
    this.requestUpdate();
  }

  private onAllianceExtensionEvent(update: AllianceExtensionUpdate) {
    const myPlayer = this.game.myPlayer();
    if (!myPlayer || myPlayer.smallID() !== update.playerID) return;
    this.removeAllianceRenewalEvents(update.allianceID);
    this.requestUpdate();
  }

  private emitGoToPlayerEvent(focusID: number) {
    const target = this.game.playerBySmallID(focusID) as PlayerView;
    if (!target) return;
    this.eventBus.emit(new GoToPlayerEvent(target));
  }

  render() {
    if (!this.active || !this._isVisible || this.events.length === 0) {
      return html``;
    }

    const sorted = [...this.events].sort((a, b) => {
      const aPrior = a.priority ?? 100000;
      const bPrior = b.priority ?? 100000;
      if (aPrior === bPrior) {
        return b.createdAt - a.createdAt;
      }
      return bPrior - aPrior;
    });

    return html`
      <div
        class="flex flex-col gap-2 w-full min-[1200px]:w-96 pointer-events-auto mt-2 select-none font-mono"
      >
        ${sorted.map(
          (event) => html`
            <div
              class="bg-gradient-to-r from-[#172216]/98 via-[#0e160e]/98 to-[#172216]/98 backdrop-blur-md rounded-md border-2 border-[#3b543f] shadow-[0_6px_25px_rgba(0,0,0,0.95)] border-l-4 border-l-amber-400 p-3 lg:p-3.5 text-white"
            >
              <div
                class="flex items-center justify-between pb-1.5 mb-2 border-b border-[#253628]"
              >
                <span
                  class="text-[9px] font-pixel text-amber-400 tracking-wider uppercase flex items-center gap-1.5"
                >
                  <span class="text-xs">📨</span>
                  <span>COMMUNICATION DIPLOMATIQUE</span>
                </span>
                <span
                  class="size-2 rounded-full bg-amber-400 animate-ping"
                ></span>
              </div>
              <button
                class="text-left text-xs sm:text-sm font-bold w-full cursor-pointer hover:underline ${getMessageTypeClasses(
                  event.type,
                )}"
                @click=${() => this.emitGoToPlayerEvent(event.focusID)}
              >
                ${event.description}
              </button>
              <div class="flex flex-wrap gap-2 mt-2.5">
                ${event.buttons.map(
                  (btn) => html`
                    <button
                      class="retro-metal-btn inline-block px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-all
                        ${btn.className.includes("btn-info")
                        ? "text-cyan-300 border-cyan-500/50 bg-cyan-950/40"
                        : btn.className.includes("btn-gray")
                          ? "text-slate-300 border-slate-600/50 bg-slate-900/60"
                          : "text-emerald-300 border-emerald-500/50 bg-emerald-950/40"}"
                      @click=${() => {
                        btn.action();
                        if (!btn.preventClose) {
                          const index = this.events.findIndex(
                            (e) => e === event,
                          );
                          if (index !== -1) this.removeEvent(index);
                        }
                        this.requestUpdate();
                      }}
                    >
                      ${btn.text}
                    </button>
                  `,
                )}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }
}
