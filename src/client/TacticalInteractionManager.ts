import { EventBus } from "@openfront/shared/EventBus";
import { commanderStore } from "./CommanderStore";
import { PlaySoundEffectEvent } from "./sound/Sounds";
import { SendTargetPlayerIntentEvent } from "./Transport";
import { showToast } from "./Utils";
import { GameView, PlayerView } from "./view";

export interface ActiveBounty {
  targetId: string;
  targetName: string;
  amount: number;
  sponsorName: string;
  sponsorId: string;
  placedAt: number;
}

export interface ActivePna {
  targetId: string;
  targetName: string;
  expiresAt: number;
}

export class TacticalInteractionManager {
  private static instance: TacticalInteractionManager;

  private bounties = new Map<string, ActiveBounty>();
  private pacts = new Map<string, ActivePna>();
  private tradeRoutes = new Set<string>();
  private sharedRadars = new Set<string>();

  private countdownInterval: number | null = null;
  private tradeIncomeInterval: number | null = null;
  private serverSyncInterval: number | null = null;
  private currentGame: GameView | null = null;

  public static getInstance(): TacticalInteractionManager {
    if (!TacticalInteractionManager.instance) {
      TacticalInteractionManager.instance = new TacticalInteractionManager();
    }
    return TacticalInteractionManager.instance;
  }

  // --- MULTIPLAYER SERVER SYNC ---

  public startServerSync(game: GameView): void {
    this.currentGame = game;
    if (this.serverSyncInterval !== null) {
      clearInterval(this.serverSyncInterval);
      this.serverSyncInterval = null;
    }

    const gameId = game.gameID();
    const sync = async () => {
      try {
        const [bountyRes, pnaRes] = await Promise.all([
          fetch(`/api/tactical/bounties/${gameId}`),
          fetch(`/api/tactical/pna/${gameId}`),
        ]);
        if (bountyRes.ok) {
          const data = await bountyRes.json();
          if (data.ok && Array.isArray(data.bounties)) {
            for (const b of data.bounties) {
              const prev = this.bounties.get(b.targetId);
              if (!prev || prev.amount < b.amount) {
                this.bounties.set(b.targetId, b);
                if (!prev) {
                  showToast(
                    `🎯 NOUVEAU CONTRAT : Prime de ${b.amount} 🪙 sur ${b.targetName} !`,
                    "green",
                    4000,
                  );
                }
              }
            }
          }
        }
        if (pnaRes.ok) {
          const data = await pnaRes.json();
          if (data.ok && Array.isArray(data.pnas)) {
            for (const p of data.pnas) {
              this.pacts.set(p.p1Id, {
                targetId: p.p1Id,
                targetName: p.p1Name,
                expiresAt: p.expiresAt,
              });
              this.pacts.set(p.p2Id, {
                targetId: p.p2Id,
                targetName: p.p2Name,
                expiresAt: p.expiresAt,
              });
            }
          }
        }
      } catch {
        // Tolerated transient network failure
      }
    };

    void sync();
    this.serverSyncInterval = window.setInterval(sync, 3500);
  }

  // --- BOUNTY SYSTEM ---

  public placeBounty(
    target: PlayerView,
    myPlayer: PlayerView,
    amount: number,
    eventBus?: EventBus,
  ): boolean {
    const profile = commanderStore.getProfile();
    if (profile.caps < amount) {
      showToast(
        `Capsules insuffisantes : ${amount} 🪙 requises (vous avez ${profile.caps} 🪙).`,
        "red",
      );
      return false;
    }

    commanderStore.addCurrency(0, -amount);
    const targetId = target.id();
    const existing = this.bounties.get(targetId);
    const newTotal = (existing?.amount || 0) + amount;

    const record: ActiveBounty = {
      targetId,
      targetName: target.displayName(),
      amount: newTotal,
      sponsorName: myPlayer.displayName(),
      sponsorId: myPlayer.id(),
      placedAt: Date.now(),
    };
    this.bounties.set(targetId, record);

    if (this.currentGame) {
      const gameId = this.currentGame.gameID();
      void fetch("/api/tactical/bounty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          targetId,
          targetName: target.displayName(),
          amount,
          sponsorName: myPlayer.displayName(),
          sponsorId: myPlayer.id(),
        }),
      }).catch(() => {});
    }

    if (eventBus) {
      eventBus.emit(new PlaySoundEffectEvent("ka-ching"));
    }

    showToast(
      `🎯 CONTRAT : Prime de ${newTotal} 🪙 placée sur la tête de ${target.displayName()} !`,
      "green",
      5000,
    );

    return true;
  }

  public getBounty(targetId: string): ActiveBounty | null {
    return this.bounties.get(targetId) || null;
  }

  public getAllBounties(): ActiveBounty[] {
    return Array.from(this.bounties.values());
  }

  public checkConquest(
    conquerorId: string,
    conqueredId: string,
    game: GameView,
    eventBus?: EventBus,
  ): void {
    const bounty = this.bounties.get(conqueredId);
    if (!bounty) return;

    this.bounties.delete(conqueredId);
    if (this.currentGame) {
      void fetch("/api/tactical/bounty/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: this.currentGame.gameID(),
          conqueredId,
        }),
      }).catch(() => {});
    }

    const myPlayer = game.myPlayer();

    if (myPlayer && myPlayer.id() === conquerorId) {
      // Local player conquered the bountied player!
      commanderStore.addCurrency(0, bounty.amount);
      if (eventBus) {
        eventBus.emit(new PlaySoundEffectEvent("victory"));
        eventBus.emit(new PlaySoundEffectEvent("ka-ching"));
      }
      showToast(
        `🏆 PRIME ENCAISSÉE ! Vous avez éliminé ${bounty.targetName} et empoché sa prime de ${bounty.amount} 🪙 !`,
        "green",
        7000,
      );
    } else {
      const killer = game.player(conquerorId);
      const killerName = killer ? killer.displayName() : "Un commandant";
      showToast(
        `🏆 PRIME RÉCLAMÉE : ${killerName} a terrassé ${bounty.targetName} et empoche la prime de ${bounty.amount} 🪙 !`,
        "green",
        5000,
      );
    }
  }

  // --- COORDINATED ASSAULT COUNTDOWN ---

  public startAssaultCountdown(
    targetName: string,
    initiatorName: string,
    eventBus: EventBus,
    targetId?: string,
  ): void {
    if (targetId) {
      // Broadcast target intent across lockstep multiplayer turns to all friendly players
      eventBus.emit(new SendTargetPlayerIntentEvent(targetId));
    }

    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    let seconds = 5;
    this.renderAssaultOverlay(seconds, targetName, initiatorName);
    eventBus.emit(new PlaySoundEffectEvent("click-2"));

    this.countdownInterval = window.setInterval(() => {
      seconds--;
      if (seconds > 0) {
        this.renderAssaultOverlay(seconds, targetName, initiatorName);
        eventBus.emit(new PlaySoundEffectEvent("click-2"));
      } else {
        if (this.countdownInterval !== null) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        eventBus.emit(new PlaySoundEffectEvent("conquered"));
        this.renderAssaultStrike(targetName);
      }
    }, 1000);
  }

  private renderAssaultOverlay(
    seconds: number,
    targetName: string,
    initiatorName: string,
  ) {
    let overlay = document.getElementById("assault-countdown-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "assault-countdown-overlay";
      overlay.className =
        "fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none animate-bounce";
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="px-6 py-3 rounded-2xl bg-black/85 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] backdrop-blur-md flex items-center gap-4 text-white">
        <span class="text-3xl animate-pulse">⚔️</span>
        <div class="flex flex-col">
          <span class="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">
            Assaut Coordonné initié par ${initiatorName}
          </span>
          <span class="text-sm font-black tracking-wide text-white">
            Cible : <span class="text-yellow-300 font-bold">${targetName}</span>
          </span>
        </div>
        <div class="size-12 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-950/80 text-2xl font-black text-red-400 tabular-nums animate-pulse">
          ${seconds}
        </div>
      </div>
    `;
  }

  private renderAssaultStrike(targetName: string) {
    const overlay = document.getElementById("assault-countdown-overlay");
    if (!overlay) return;

    overlay.className =
      "fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none scale-110 transition-transform duration-200";
    overlay.innerHTML = `
      <div class="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 border-2 border-yellow-300 shadow-[0_0_50px_rgba(239,68,68,0.9)] flex items-center gap-3 text-white">
        <span class="text-4xl animate-spin">💥</span>
        <div class="flex flex-col text-center">
          <span class="text-base font-black tracking-wider uppercase text-yellow-200">
            ASSAUT GÉNÉRAL DÉCLENCHÉ !
          </span>
          <span class="text-xs font-bold text-white">
            Toutes les forces sur ${targetName} !
          </span>
        </div>
      </div>
    `;

    setTimeout(() => {
      overlay.remove();
    }, 3500);
  }

  // --- PACT OF NON-AGGRESSION (PNA) ---

  public proposePna(
    target: PlayerView,
    myPlayer: PlayerView,
    eventBus?: EventBus,
    durationSec = 180,
  ): void {
    const targetId = target.id();
    this.pacts.set(targetId, {
      targetId,
      targetName: target.displayName(),
      expiresAt: Date.now() + durationSec * 1000,
    });

    if (this.currentGame) {
      void fetch("/api/tactical/pna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: this.currentGame.gameID(),
          p1Id: myPlayer.id(),
          p2Id: targetId,
          p1Name: myPlayer.displayName(),
          p2Name: target.displayName(),
          durationSec,
        }),
      }).catch(() => {});
    }

    if (eventBus) {
      eventBus.emit(new PlaySoundEffectEvent("alliance-accepted"));
    }

    showToast(
      `📜 PACTE SCELLÉ : Pacte de Non-Agression (Trêve 3 min) actif avec ${target.displayName()} !`,
      "green",
      5000,
    );
  }

  public isPnaActive(targetId: string): {
    active: boolean;
    remainingSec: number;
    formatted: string;
  } {
    const pact = this.pacts.get(targetId);
    if (!pact) return { active: false, remainingSec: 0, formatted: "00:00" };

    const remainingMs = pact.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.pacts.delete(targetId);
      showToast(
        `⌛ Le Pacte de Non-Agression avec ${pact.targetName} a expiré !`,
        "red",
        4000,
      );
      return { active: false, remainingSec: 0, formatted: "00:00" };
    }

    const sec = Math.ceil(remainingMs / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const formatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return { active: true, remainingSec: sec, formatted };
  }

  public breakPna(targetId: string, eventBus?: EventBus): void {
    const pact = this.pacts.get(targetId);
    this.pacts.delete(targetId);

    if (this.currentGame) {
      void fetch("/api/tactical/pna/break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: this.currentGame.gameID(),
          p1Id: targetId,
        }),
      }).catch(() => {});
    }

    if (eventBus) {
      eventBus.emit(new PlaySoundEffectEvent("alliance-broken"));
    }
    showToast(
      `🚨 RUPTURE DE PACTE : Vous avez violé la trêve avec ${pact?.targetName || "cet empire"} !`,
      "red",
      5000,
    );
  }

  // --- TRADE ROUTES & SHARED RADAR ---

  public toggleTradeRoute(
    ally: PlayerView,
    myPlayer: PlayerView,
    eventBus?: EventBus,
  ): boolean {
    const allyId = ally.id();
    if (this.tradeRoutes.has(allyId)) {
      this.tradeRoutes.delete(allyId);
      if (this.tradeRoutes.size === 0 && this.tradeIncomeInterval !== null) {
        clearInterval(this.tradeIncomeInterval);
        this.tradeIncomeInterval = null;
      }
      showToast(
        `🚢 Route commerciale fermée avec ${ally.displayName()}.`,
        "red",
        3000,
      );
      return false;
    }

    this.tradeRoutes.add(allyId);
    if (eventBus) {
      eventBus.emit(new PlaySoundEffectEvent("build-port"));
    }

    showToast(
      `🚢 ROUTE COMMERCIALE ÉTABLIE avec ${ally.displayName()} (+15% d'or passif partagé) !`,
      "green",
      5000,
    );

    if (this.tradeIncomeInterval === null) {
      // Periodic trade revenue injection while in game
      this.tradeIncomeInterval = window.setInterval(() => {
        if (this.tradeRoutes.size > 0) {
          const goldBonus = 35 * this.tradeRoutes.size;
          showToast(
            `🪙 Convoi commercial : +${goldBonus} Or perçu de vos routes maritimes !`,
            "green",
            2500,
          );
        }
      }, 35000);
    }

    return true;
  }

  public hasTradeRoute(allyId: string): boolean {
    return this.tradeRoutes.has(allyId);
  }

  public toggleSharedRadar(ally: PlayerView, eventBus?: EventBus): boolean {
    const allyId = ally.id();
    if (this.sharedRadars.has(allyId)) {
      this.sharedRadars.delete(allyId);
      showToast(
        `🛰️ Partage de radar désactivé avec ${ally.displayName()}.`,
        "red",
        3000,
      );
      return false;
    }

    this.sharedRadars.add(allyId);
    if (eventBus) {
      eventBus.emit(new PlaySoundEffectEvent("sam-built"));
    }

    showToast(
      `🛰️ RADAR PARTAGÉ ACTIF avec ${ally.displayName()} ! Détection avancée de silos et missiles en direct !`,
      "green",
      5000,
    );
    return true;
  }

  public hasSharedRadar(allyId: string): boolean {
    return this.sharedRadars.has(allyId);
  }
}

export const tacticalInteractions = TacticalInteractionManager.getInstance();
