import { EventBus } from "@openfront/shared/EventBus";
import { GameStartingModal } from "./GameStartingModal";
import type { HostLobbyModal } from "./HostLobbyModal";
import type { JoinLobbyModal } from "./JoinLobbyModal";
import { loadModal, whenModalLoaded } from "./LazyModals";
import type { MatchmakingModal, MatchmakingMode } from "./Matchmaking";

export interface OpenJoinOptions extends Record<string, unknown> {
  lobbyId: string;
  spectate?: boolean;
}

export interface OpenHostOptions extends Record<string, unknown> {
  existingLobbyId?: string;
}

export class LobbyModalManager {
  private eventBus: EventBus | null = null;
  private hostModalElement: HostLobbyModal | null = null;
  private joinModalElement: JoinLobbyModal | null = null;
  private matchmakingModalElement: MatchmakingModal | null = null;

  public init(eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.bindModals();
  }

  private bindModals(): void {
    const hostEl = document.querySelector("host-lobby-modal") as HostLobbyModal | null;
    if (hostEl && this.eventBus) {
      this.hostModalElement = hostEl;
      this.hostModalElement.eventBus = this.eventBus;
    }

    const joinEl = document.querySelector("join-lobby-modal") as JoinLobbyModal | null;
    if (joinEl && this.eventBus) {
      this.joinModalElement = joinEl;
      this.joinModalElement.eventBus = this.eventBus;
    }

    const mmEl = document.querySelector("matchmaking-modal") as MatchmakingModal | null;
    if (mmEl) {
      this.matchmakingModalElement = mmEl;
    }
  }

  public getHostModal(): HostLobbyModal | null {
    if (!this.hostModalElement) {
      this.hostModalElement = document.querySelector("host-lobby-modal") as HostLobbyModal | null;
      if (this.hostModalElement && this.eventBus) {
        this.hostModalElement.eventBus = this.eventBus;
      }
    }
    return customElements.get("host-lobby-modal") ? this.hostModalElement : null;
  }

  public getJoinModal(): JoinLobbyModal | null {
    if (!this.joinModalElement) {
      this.joinModalElement = document.querySelector("join-lobby-modal") as JoinLobbyModal | null;
      if (this.joinModalElement && this.eventBus) {
        this.joinModalElement.eventBus = this.eventBus;
      }
    }
    return customElements.get("join-lobby-modal") ? this.joinModalElement : null;
  }

  public getMatchmakingModal(): MatchmakingModal | null {
    if (!this.matchmakingModalElement) {
      this.matchmakingModalElement = document.querySelector("matchmaking-modal") as MatchmakingModal | null;
    }
    return customElements.get("matchmaking-modal") ? this.matchmakingModalElement : null;
  }

  public openHost(options?: OpenHostOptions): void {
    whenModalLoaded("host-lobby-modal", () => {
      const modal = this.getHostModal();
      if (modal) {
        if (options?.existingLobbyId) {
          modal.open({ existingLobbyId: options.existingLobbyId });
        } else {
          modal.open();
        }
      }
    });
  }

  public async openJoin(options: OpenJoinOptions): Promise<void> {
    await loadModal("join-lobby-modal").catch((err) =>
      console.error("Failed to load join-lobby-modal:", err),
    );
    const modal = this.getJoinModal();
    if (modal) {
      modal.open(options);
    }
  }

  public openMatchmaking(mode: MatchmakingMode = "1v1"): void {
    whenModalLoaded("matchmaking-modal", () => {
      const modal = this.getMatchmakingModal();
      if (modal) {
        modal.mode = mode;
        modal.open();
      }
    });
  }

  public closeMatchmaking(): void {
    const modal = this.getMatchmakingModal();
    if (modal?.isOpen()) {
      modal.close();
    }
  }

  public disarmAndClose(): void {
    const host = this.getHostModal();
    const join = this.getJoinModal();
    host?.disarmLeaveOnClose();
    join?.disarmLeaveOnClose();
    host?.closeWithoutLeaving();
    join?.closeWithoutLeaving();
  }

  public closeAll(): void {
    this.getHostModal()?.close();
    this.getJoinModal()?.close();
    this.closeMatchmaking();
  }

  public isAnyLobbyOpen(): boolean {
    return (
      (this.getHostModal()?.isOpen() ?? false) ||
      (this.getJoinModal()?.isOpen() ?? false) ||
      (this.getMatchmakingModal()?.isOpen() ?? false)
    );
  }

  public showStartingModal(): void {
    const modal = document.querySelector("game-starting-modal");
    if (modal instanceof GameStartingModal) {
      modal.show();
    }
  }

  public hideStartingModal(): void {
    const modal = document.querySelector("game-starting-modal");
    if (modal instanceof GameStartingModal) {
      modal.hide();
    }
  }
}

export const lobbyModalManager = new LobbyModalManager();
