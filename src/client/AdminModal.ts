import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { commanderStore } from "./CommanderStore";
import { BaseModal } from "./components/BaseModal";
import { modalHeader } from "./components/ui/ModalHeader";
import { showToast } from "./Utils";

interface AdminPlayer {
  email: string;
  username: string;
  createdAt: number;
  level: number;
  xp: number;
  plutonium: number;
  caps: number;
  isVip: boolean;
  vipUntil: number | null;
  isBanned: boolean;
  role: string;
  isAdmin: boolean;
  victories: number;
  gamesPlayed: number;
  hasCustomSkinUnlocked: boolean;
  hasBattlePass: boolean;
  ownedFlaresCount: number;
  isOnline?: boolean;
}

interface PurchaseItem {
  id: string;
  timestamp: number;
  type: "stripe" | "crate" | "pack" | "skin_pass" | "admin_grant";
  email: string;
  username: string;
  itemId: string;
  itemName: string;
  priceEur?: number;
  pricePlutonium?: number;
  priceCaps?: number;
}

interface RotationSnapshot {
  queues: {
    ffa: string[];
    team: string[];
    specialFfa: string[];
    specialTeam: string[];
  };
  weightOverrides: Record<string, any>;
}

interface AdminGuestSession {
  sessionId: string;
  username: string;
  ip: string;
  userAgent?: string;
  state: "menu" | "lobby" | "in_game";
  currentPage: string;
  connectedDurationSeconds: number;
  lastSeenAgoSeconds: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function parseDevice(ua?: string): { icon: string; name: string } {
  if (!ua) return { icon: "🌐", name: "Web" };
  const ual = ua.toLowerCase();
  let os = "PC";
  let icon = "💻";
  if (ual.includes("iphone") || ual.includes("ipad") || ual.includes("ios")) {
    os = "iOS";
    icon = "📱";
  } else if (ual.includes("android")) {
    os = "Android";
    icon = "📱";
  } else if (ual.includes("mac os") || ual.includes("macintosh")) {
    os = "macOS";
    icon = "🍎";
  } else if (ual.includes("windows")) {
    os = "Windows";
    icon = "🪟";
  } else if (ual.includes("linux")) {
    os = "Linux";
    icon = "🐧";
  }

  let browser = "";
  if (ual.includes("firefox")) browser = "Firefox";
  else if (ual.includes("edg")) browser = "Edge";
  else if (ual.includes("chrome")) browser = "Chrome";
  else if (ual.includes("safari")) browser = "Safari";

  return { icon, name: browser ? `${os} · ${browser}` : os };
}

@customElement("admin-modal")
export class AdminModal extends BaseModal {
  protected routerName = "admin";

  @state() private currentTab:
    | "overview"
    | "rotation"
    | "players"
    | "guests"
    | "purchases"
    | "tools" = "overview";
  @state() private isLoading = false;
  @state() private errorMsg: string | null = null;

  // Overview stats
  @state() private overview: any = null;

  // Players
  @state() private players: AdminPlayer[] = [];
  @state() private playerSearch: string = "";
  @state() private selectedPlayer: AdminPlayer | null = null;
  @state() private adjustPuAmount = 1000;
  @state() private adjustCapsAmount = 10000;

  // Guests
  @state() private guests: AdminGuestSession[] = [];
  @state() private guestSearch: string = "";
  @state() private guestStateFilter: "all" | "in_game" | "lobby" | "menu" = "all";

  // Rotation
  @state() private rotation: RotationSnapshot | null = null;
  @state() private currentLobbies: {
    ffa: string | null;
    team: string | null;
    special: string | null;
  } | null = null;
  @state() private allMaps: { type: string; category: string }[] = [];
  @state() private selectedNextMap: string = "Europe";
  @state() private selectedSlot: "ffa" | "team" | "special" = "ffa";
  @state() private selectedGameMode: string = "FFA";

  // Purchases
  @state() private purchases: PurchaseItem[] = [];
  @state() private purchaseStats: any = null;

  // Broadcast
  @state() private broadcastText = "";
  @state() private broadcastLevel: "info" | "warning" | "alert" = "alert";
  @state() private broadcastDuration = 60;
  @state() private filterOnlineOnly = false;
  private pollInterval: number | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.refreshAllData();
    if (typeof window !== "undefined") {
      this.pollInterval = window.setInterval(() => {
        if (this.isOpen()) {
          this.refreshAllData(true);
        }
      }, 10_000);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  protected override onOpen() {
    this.refreshAllData();
  }

  private getAuthHeaders(): Record<string, string> {
    const creds = commanderStore.getCredentials();
    return {
      "Content-Type": "application/json",
      "x-admin-email": creds.email || "darkgdooo@gmail.com",
      "x-admin-pass": creds.password || "",
    };
  }

  public async refreshAllData(silent = false) {
    if (!commanderStore.isAdmin()) return;
    if (!silent) this.isLoading = true;
    this.errorMsg = null;
    const headers = this.getAuthHeaders();

    try {
      const [resOverview, resPlayers, resGuests, resRotation, resPurchases] =
        await Promise.all([
          fetch("/api/admin/overview", { headers }).then((r) => r.json()),
          fetch("/api/admin/players", { headers }).then((r) => r.json()),
          fetch("/api/admin/guests", { headers }).then((r) => r.json()),
          fetch("/api/admin/rotation", { headers }).then((r) => r.json()),
          fetch("/api/admin/purchases", { headers }).then((r) => r.json()),
        ]);

      if (resOverview?.ok) this.overview = resOverview.overview;
      if (resPlayers?.ok) this.players = resPlayers.players;
      if (resGuests?.ok) this.guests = resGuests.guests || [];
      if (resRotation?.ok) {
        this.rotation = resRotation.rotation;
        this.currentLobbies = resRotation.currentLobbies || null;
        this.allMaps = resRotation.allMaps || [];
        if (this.allMaps.length > 0 && !this.selectedNextMap) {
          this.selectedNextMap = this.allMaps[0].type;
        }
      }
      if (resPurchases?.ok) {
        this.purchases = resPurchases.purchases || [];
        this.purchaseStats = resPurchases.stats || null;
      }
    } catch (err: any) {
      this.errorMsg = "Erreur de connexion au serveur d'administration.";
    } finally {
      this.isLoading = false;
    }
  }

  private async handleKickGuest(guest: AdminGuestSession) {
    if (
      !confirm(
        `Éjecter immédiatement la session de l'invité ${guest.username} (${guest.ip}) ?`,
      )
    ) {
      return;
    }
    this.isLoading = true;
    try {
      const res = await fetch("/api/admin/guests/action", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ action: "kick", sessionId: guest.sessionId }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast(`Session invité ${guest.username} éjectée.`, "green", 2500);
        this.refreshAllData(true);
      } else {
        showToast("Erreur: " + (data?.error || "Échec"), "red", 2500);
      }
    } catch {
      showToast("Erreur réseau", "red", 2500);
    } finally {
      this.isLoading = false;
    }
  }

  private async executePlayerAction(
    action: string,
    targetEmail: string,
    payload: any = {},
  ) {
    this.isLoading = true;
    try {
      const res = await fetch("/api/admin/players/action", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ action, targetEmail, payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(`❌ ${data.error || "Échec de l'action"}`, "red", 3000);
      } else {
        showToast("✅ Action exécutée avec succès !", "green", 2000);
        this.players = data.players || [];
        if (this.selectedPlayer?.email === targetEmail) {
          this.selectedPlayer =
            this.players.find((p) => p.email === targetEmail) || null;
        }
      }
    } catch (err: any) {
      showToast("❌ Erreur réseau", "red", 3000);
    } finally {
      this.isLoading = false;
    }
  }

  private async handleSetNextMap() {
    this.isLoading = true;
    try {
      const res = await fetch("/api/admin/rotation/set-next", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          slot: this.selectedSlot,
          mapType: this.selectedNextMap,
          mode: this.selectedGameMode,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          data.message ||
            `🗺️ Map ${this.selectedNextMap} appliquée (${this.selectedSlot.toUpperCase()}) !`,
          "green",
          4000,
        );
        this.rotation = data.rotation;
        if (data.currentLobbies) this.currentLobbies = data.currentLobbies;
      } else {
        showToast(`❌ ${data.error || "Erreur"}`, "red", 3000);
      }
    } catch (e: any) {
      showToast("❌ Erreur réseau", "red", 3000);
    } finally {
      this.isLoading = false;
    }
  }

  private async handleSpawnLobby() {
    this.isLoading = true;
    try {
      const res = await fetch("/api/admin/rotation/spawn-lobby", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          type: this.selectedSlot,
          map: this.selectedNextMap,
          mode: this.selectedGameMode,
          maxPlayers: 50,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          `🚀 Salon lancé avec succès sur ${this.selectedNextMap} !`,
          "green",
          4000,
        );
        this.refreshAllData();
      } else {
        showToast(`❌ ${data.error || "Erreur"}`, "red", 3000);
      }
    } catch (e: any) {
      showToast("❌ Erreur réseau", "red", 3000);
    } finally {
      this.isLoading = false;
    }
  }

  private async handleSendBroadcast() {
    if (!this.broadcastText) {
      showToast("Veuillez saisir un texte d'annonce.", "red", 2000);
      return;
    }
    this.isLoading = true;
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          text: this.broadcastText,
          level: this.broadcastLevel,
          durationMinutes: this.broadcastDuration,
          adminEmail: commanderStore.getProfile().email,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("📢 Annonce globale envoyée à tous les joueurs !", "green", 3000);
        this.broadcastText = "";
        this.refreshAllData();
      }
    } catch (e) {
      showToast("❌ Erreur réseau", "red", 2000);
    } finally {
      this.isLoading = false;
    }
  }

  private async handleDownloadBackup() {
    try {
      const res = await fetch("/api/admin/backup", {
        headers: this.getAuthHeaders(),
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `borderconflict_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("📥 Sauvegarde téléchargée avec succès !", "green", 3000);
    } catch (e) {
      showToast("❌ Échec du téléchargement du backup", "red", 2500);
    }
  }

  protected override renderHeaderSlot() {
    return modalHeader({
      title: "🛡️ QG D'ADMINISTRATION STRATÉGIQUE (ACCÈS RÉSERVÉ)",
      onBack: () => this.close(),
      ariaLabel: "Fermer la console admin",
    });
  }

  protected override renderBody() {
    if (!commanderStore.isAdmin()) {
      return html`
        <div class="p-8 text-center space-y-4">
          <div class="text-6xl animate-bounce">🚫</div>
          <h2 class="text-2xl font-black text-red-500 font-mono tracking-wider">
            ACCÈS STRICTEMENT INTERDIT
          </h2>
          <p class="text-slate-300 max-w-md mx-auto text-sm">
            Cette zone de commandement est réservée aux administrateurs de BorderConflict.
            Votre tentative a été journalisée.
          </p>
          <button
            type="button"
            @click=${() => this.close()}
            class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-mono rounded-xl border border-slate-600 cursor-pointer"
          >
            Retour au Quartier Général
          </button>
        </div>
      `;
    }

    const filteredPlayers = this.players.filter((p) => {
      const q = this.playerSearch.toLowerCase();
      const matchesQuery =
        p.username.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (this.filterOnlineOnly) {
        return Boolean(p.isOnline);
      }
      return true;
    });

    const liveTotal = this.overview?.livePlayers?.totalOnline ?? 1;
    const onlineRegisteredCount = this.players.filter((p) => p.isOnline).length;
    const onlineGuestsCount = this.guests.length;
    const inGameGuestsCount = this.guests.filter((g) => g.state === "in_game").length;
    const inLobbyGuestsCount = this.guests.filter((g) => g.state === "lobby").length;
    const inMenuGuestsCount = this.guests.filter((g) => g.state === "menu").length;

    const filteredGuests = this.guests.filter((g) => {
      const q = this.guestSearch.toLowerCase();
      const matchesQuery =
        !q ||
        g.username.toLowerCase().includes(q) ||
        g.sessionId.toLowerCase().includes(q) ||
        g.ip.toLowerCase().includes(q) ||
        g.currentPage.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (this.guestStateFilter !== "all") {
        return g.state === this.guestStateFilter;
      }
      return true;
    });

    return html`
      <div class="p-4 sm:p-6 space-y-5 text-slate-100 max-w-7xl mx-auto">
        <!-- TOP STATUS STRIP -->
        <div
          class="rounded-2xl border-2 border-red-500/40 bg-gradient-to-r from-red-950/60 via-slate-900/90 to-red-950/60 p-4 shadow-[0_0_25px_rgba(239,68,68,0.25)] flex flex-wrap items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <span class="text-3xl animate-pulse">🛡️</span>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg font-black tracking-wider text-red-400 font-mono">
                  TERMINAL OPÉRATEUR MAÎTRE
                </h1>
                <span class="bg-red-500/30 text-red-300 border border-red-400/50 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  ROOT ADMIN
                </span>
                <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-[10px] font-black px-2.5 py-0.5 rounded uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(34,197,94,0.4)]">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>${liveTotal} JOUEUR(S) EN DIRECT</span>
                </span>
              </div>
              <p class="text-xs text-slate-400">
                Connecté en tant que
                <strong class="text-white">${commanderStore.getProfile().username || "darkgdooo"}</strong>
                (${commanderStore.getProfile().email || "darkgdooo@gmail.com"})
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click=${() => this.refreshAllData()}
              ?disabled=${this.isLoading}
              class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-red-500/40 text-xs font-mono font-bold text-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow active:scale-95"
            >
              <span>🔄</span>
              <span>${this.isLoading ? "Chargement..." : "Actualiser en Direct"}</span>
            </button>
          </div>
        </div>

        <!-- NAVIGATION TABS -->
        <div class="flex flex-wrap gap-2 border-b border-slate-700/80 pb-3">
          <button
            type="button"
            @click=${() => (this.currentTab = "overview")}
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider cursor-pointer transition-all ${this.currentTab === "overview"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400"
              : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700"}"
          >
            📊 VUE D'ENSEMBLE
          </button>
          <button
            type="button"
            @click=${() => (this.currentTab = "rotation")}
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider cursor-pointer transition-all ${this.currentTab === "rotation"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400"
              : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700"}"
          >
            🗺️ ROTATION DES MAPS & MODES
          </button>
          <button
            type="button"
            @click=${() => (this.currentTab = "players")}
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider cursor-pointer transition-all ${this.currentTab === "players"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400"
              : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700"}"
          >
            👥 COMPTES INSCRITS (${this.players.length})
            ${onlineRegisteredCount > 0
              ? html`<span class="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400 text-[10px]">🟢 ${onlineRegisteredCount}</span>`
              : nothing}
          </button>
          <button
            type="button"
            @click=${() => (this.currentTab = "guests")}
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${this.currentTab === "guests"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400"
              : "bg-slate-900/80 text-purple-300 hover:bg-slate-800 border border-purple-800/60"}"
          >
            <span>👾 INVITÉS EN DIRECT (${onlineGuestsCount})</span>
            ${onlineGuestsCount > 0
              ? html`<span class="ml-1 px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400 text-[10px]">🟢 ${onlineGuestsCount}</span>`
              : nothing}
          </button>
          <button
            type="button"
            @click=${() => (this.currentTab = "purchases")}
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider cursor-pointer transition-all ${this.currentTab === "purchases"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400"
              : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700"}"
          >
            🛒 ACHATS BOUTIQUE EN DIRECT
          </button>
          <button
            type="button"
            @click=${() => (this.currentTab = "tools")}
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider cursor-pointer transition-all ${this.currentTab === "tools"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400"
              : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700"}"
          >
            💡 OUTILS & SUGGESTIONS
          </button>
        </div>

        <!-- TAB CONTENT: OVERVIEW -->
        ${this.currentTab === "overview"
          ? html`
              <div class="space-y-5">
                <!-- LIVE PLAYERS RADAR SPOTLIGHT -->
                <div class="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-emerald-950/40 p-5 shadow-[0_0_30px_rgba(16,185,129,0.2)] space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <span class="relative flex h-4 w-4">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                      </span>
                      <div>
                        <h3 class="text-base font-black font-mono uppercase text-emerald-300 tracking-wider flex items-center gap-2">
                          <span>RADAR TACTIQUE : COMMANDANTS EN DIRECT</span>
                          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black">
                            LIVE MONITOR
                          </span>
                        </h3>
                        <p class="text-xs text-slate-400">
                          Surveillance temps réel de tous les joueurs (inscrits et invités) sur BorderConflict
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="px-5 py-2.5 rounded-2xl bg-slate-950 border-2 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <div class="text-3xl font-black text-emerald-400 font-mono flex items-center gap-2.5">
                          <span class="text-base">🟢</span>
                          <span>${liveTotal}</span>
                          <span class="text-xs font-normal text-slate-300 uppercase tracking-widest">Connecté(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- LIVE STATS BREAKDOWN -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between">
                      <div class="flex items-center gap-2.5">
                        <span class="text-xl">👥</span>
                        <div>
                          <span class="text-xs font-mono font-bold text-slate-200 block">Comptes Inscrits</span>
                          <span class="text-[10px] text-slate-400">Commandants identifiés</span>
                        </div>
                      </div>
                      <span class="text-xl font-mono font-black text-emerald-400">
                        ${onlineRegisteredCount}
                      </span>
                    </div>

                    <div
                      @click=${() => (this.currentTab = "guests")}
                      class="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 hover:bg-purple-900/50 flex items-center justify-between cursor-pointer transition-all shadow"
                      title="Cliquer pour voir la liste détaillée des invités"
                    >
                      <div class="flex items-center gap-2.5">
                        <span class="text-xl">👾</span>
                        <div>
                          <span class="text-xs font-mono font-bold text-purple-200 block flex items-center gap-1">
                            <span>Invités en Direct</span>
                            <span class="text-[9px] text-purple-400">➔</span>
                          </span>
                          <span class="text-[10px] text-purple-300/70">Joueurs sans compte</span>
                        </div>
                      </div>
                      <span class="text-xl font-mono font-black text-purple-300">
                        ${onlineGuestsCount}
                      </span>
                    </div>

                    <div class="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between">
                      <div class="flex items-center gap-2.5">
                        <span class="text-xl">🎮</span>
                        <div>
                          <span class="text-xs font-mono font-bold text-slate-200 block">En Partie / Salons</span>
                          <span class="text-[10px] text-slate-400">Dans les arènes</span>
                        </div>
                      </div>
                      <span class="text-xl font-mono font-black text-emerald-400">
                        ${this.overview?.livePlayers?.inLobbies ?? 0}
                      </span>
                    </div>

                    <div class="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between">
                      <div class="flex items-center gap-2.5">
                        <span class="text-xl">🏠</span>
                        <div>
                          <span class="text-xs font-mono font-bold text-slate-200 block">Menus & Quartier Général</span>
                          <span class="text-[10px] text-slate-400">Accueil, boutique, talents</span>
                        </div>
                      </div>
                      <span class="text-xl font-mono font-black text-cyan-400">
                        ${this.overview?.livePlayers?.inMenus ?? 1}
                      </span>
                    </div>
                  </div>

                  <!-- GUEST SPOTLIGHT ALERT IF ANY ONLINE GUESTS -->
                  ${onlineGuestsCount > 0
                    ? html`
                        <div class="p-3 rounded-xl bg-purple-950/60 border border-purple-500/50 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                          <div class="flex items-center gap-3">
                            <span class="text-2xl animate-pulse">👾</span>
                            <div>
                              <div class="text-xs font-mono font-bold text-purple-200 flex items-center gap-2">
                                <span>${onlineGuestsCount} JOUEUR(S) INVITÉ(S) EN DIRECT SUR LE JEU</span>
                                <span class="px-2 py-0.2 rounded-full bg-purple-500/30 text-purple-300 text-[10px] border border-purple-400 font-mono">
                                  ${inGameGuestsCount} en combat · ${inLobbyGuestsCount} en salon · ${inMenuGuestsCount} au QG
                                </span>
                              </div>
                              <span class="text-[11px] text-purple-300/80 font-mono">
                                Vous pouvez consulter leur session, adresse IP, page consultée et durée de session.
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            @click=${() => (this.currentTab = "guests")}
                            class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer shadow active:scale-95 flex items-center gap-1.5"
                          >
                            <span>Inspecter les Invités ➔</span>
                          </button>
                        </div>
                      `
                    : nothing}

                  ${(this.overview?.livePlayers?.sessions || []).length > 0
                    ? html`
                        <div class="pt-3 border-t border-emerald-500/20">
                          <span class="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-2 flex items-center gap-2">
                            <span>📡 SESSIONS ACTIVES GLOBALES DÉTECTÉES (${(this.overview.livePlayers.sessions as any[]).length}) :</span>
                          </span>
                          <div class="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                            ${(this.overview.livePlayers.sessions as any[]).map(
                              (sess) => html`
                                <div class="px-3 py-1.5 rounded-lg ${sess.isGuest ? "bg-purple-950/80 border-purple-500/40" : "bg-slate-950/90 border-emerald-500/40"} border text-xs font-mono flex items-center gap-2 shadow">
                                  <span class="w-2 h-2 rounded-full ${sess.isGuest ? "bg-purple-400" : "bg-emerald-400"} animate-pulse"></span>
                                  <span class="font-bold text-white flex items-center gap-1">
                                    <span>${sess.username}</span>
                                    ${sess.isGuest ? html`<span class="text-[9px] px-1 rounded bg-purple-900/60 text-purple-300">Invité</span>` : nothing}
                                  </span>
                                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                    ${sess.state === "in_game" ? "En combat" : sess.currentPage || "QG"}
                                  </span>
                                  <span class="text-[9px] text-emerald-400/80 font-mono">il y a ${sess.lastSeenAgoSeconds}s</span>
                                </div>
                              `,
                            )}
                          </div>
                        </div>
                      `
                    : nothing}
                </div>

                <!-- KPI CARDS -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow flex flex-col justify-between">
                    <span class="text-xs font-mono text-slate-400 uppercase">Comptes Inscrits</span>
                    <div class="mt-2 text-2xl font-black text-cyan-400 font-mono">
                      ${this.overview?.totalAccounts ?? this.players.length}
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1">
                      ${this.overview?.vipCount ?? 0} VIP · ${this.overview?.bannedCount ?? 0} Bannis
                    </span>
                  </div>

                  <div
                    @click=${() => (this.currentTab = "guests")}
                    class="p-4 rounded-2xl bg-purple-950/40 border border-purple-700/60 shadow flex flex-col justify-between hover:bg-purple-900/40 cursor-pointer transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-mono text-purple-300 uppercase">Invités en Direct</span>
                      <span class="text-xs text-purple-400">➔</span>
                    </div>
                    <div class="mt-2 text-2xl font-black text-purple-300 font-mono flex items-center gap-2">
                      <span>👾 ${onlineGuestsCount}</span>
                      <span class="text-xs px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 font-normal">Sans compte</span>
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1">
                      ${inGameGuestsCount} en jeu · ${inMenuGuestsCount} en menu
                    </span>
                  </div>
                    <span class="text-xs font-mono text-slate-400 uppercase">Comptes Inscrits</span>
                    <div class="mt-2 text-2xl font-black text-cyan-400 font-mono">
                      ${this.overview?.totalAccounts ?? this.players.length}
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1">
                      ${this.overview?.vipCount ?? 0} VIP · ${this.overview?.bannedCount ?? 0} Bannis
                    </span>
                  </div>

                  <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow flex flex-col justify-between">
                    <span class="text-xs font-mono text-slate-400 uppercase">Chiffre d'Affaires Brut</span>
                    <div class="mt-2 text-2xl font-black text-emerald-400 font-mono">
                      ${this.overview?.totalRevenueEur ?? 0} €
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1">Stripe Checkout</span>
                  </div>

                  <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow flex flex-col justify-between">
                    <span class="text-xs font-mono text-slate-400 uppercase">Plutonium Dépensé</span>
                    <div class="mt-2 text-2xl font-black text-purple-400 font-mono">
                      ☢️ ${this.overview?.totalPlutoniumSpent?.toLocaleString() ?? 0}
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1">En coffres et packs</span>
                  </div>

                  <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow flex flex-col justify-between">
                    <span class="text-xs font-mono text-slate-400 uppercase">Uptime & Serveur</span>
                    <div class="mt-2 text-2xl font-black text-amber-400 font-mono">
                      ${Math.floor((this.overview?.uptimeSeconds ?? 0) / 3600)}h ${Math.floor(((this.overview?.uptimeSeconds ?? 0) % 3600) / 60)}m
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1">RAM: ${this.overview?.memoryMb ?? 0} MB</span>
                  </div>
                </div>

                <!-- BROADCAST STRIP -->
                <div class="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 p-5 shadow-lg space-y-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">📢</span>
                    <h3 class="text-sm font-black font-mono uppercase text-amber-300 tracking-wider">
                      Diffuser un Message Global en Direct (Tous les Joueurs)
                    </h3>
                  </div>
                  <p class="text-xs text-slate-300">
                    Affiche instantanément une bannière d'alerte tactique sur l'écran de tous les joueurs connectés.
                  </p>
                  <div class="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      .value=${this.broadcastText}
                      @input=${(e: any) => (this.broadcastText = e.target.value)}
                      placeholder="Ex: Tournoi spécial dans 15 minutes ! Rejoignez le salon..."
                      class="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <select
                      .value=${this.broadcastLevel}
                      @change=${(e: any) => (this.broadcastLevel = e.target.value)}
                      class="px-3 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value="alert">Alerte Rouge (Urgent)</option>
                      <option value="warning">Avertissement Jaune</option>
                      <option value="info">Info Bleue (Événement)</option>
                    </select>
                    <button
                      type="button"
                      @click=${() => this.handleSendBroadcast()}
                      class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black font-mono text-xs uppercase tracking-wider cursor-pointer shadow"
                    >
                      Diffuser l'Alerte
                    </button>
                  </div>
                </div>
              </div>
            `
          : nothing}

        <!-- TAB CONTENT: ROTATION -->
        ${this.currentTab === "rotation"
          ? html`
              <div class="space-y-6">
                <!-- LIVE LOBBIES STATUS (ACCUEIL) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    class="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 shadow flex items-center justify-between"
                  >
                    <div>
                      <span
                        class="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block"
                      >
                        Salon Ouvert Actuel (Accueil FFA)
                      </span>
                      <span
                        class="text-sm font-black font-mono text-white flex items-center gap-1.5 mt-0.5"
                      >
                        <span
                          class="size-2 rounded-full bg-cyan-400 animate-pulse"
                        ></span>
                        <span
                          >${this.currentLobbies?.ffa || "Chargement..."}</span
                        >
                      </span>
                    </div>
                    <span
                      class="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono font-bold uppercase"
                    >
                      En Ligne
                    </span>
                  </div>

                  <div
                    class="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 shadow flex items-center justify-between"
                  >
                    <div>
                      <span
                        class="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block"
                      >
                        Salon Ouvert Actuel (Accueil Équipes)
                      </span>
                      <span
                        class="text-sm font-black font-mono text-white flex items-center gap-1.5 mt-0.5"
                      >
                        <span
                          class="size-2 rounded-full bg-purple-400 animate-pulse"
                        ></span>
                        <span
                          >${this.currentLobbies?.team || "Chargement..."}</span
                        >
                      </span>
                    </div>
                    <span
                      class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-mono font-bold uppercase"
                    >
                      En Ligne
                    </span>
                  </div>
                </div>

                <!-- CONTROLLER BOX -->
                <div
                  class="p-5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-xl space-y-4"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">🗺️</span>
                    <div>
                      <h3
                        class="text-base font-black font-mono text-white uppercase"
                      >
                        Contrôle de la Rotation en Temps Réel
                      </h3>
                      <p class="text-xs text-slate-400">
                        Choisissez la carte et le mode de jeu exacts pour changer
                        immédiatement le salon en direct sur la page d'accueil ou
                        générer un nouveau salon public.
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <!-- SLOT SELECTION -->
                    <div>
                      <label
                        class="block text-xs font-mono text-slate-400 uppercase mb-1"
                      >
                        File de Rotation
                      </label>
                      <select
                        .value=${this.selectedSlot}
                        @change=${(e: any) =>
                          (this.selectedSlot = e.target.value)}
                        class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none"
                      >
                        <option value="ffa">Solo FFA (Chacun pour soi)</option>
                        <option value="team">Matchs en Équipe</option>
                        <option value="special">
                          Événement Spécial / Modifié
                        </option>
                      </select>
                    </div>

                    <!-- MAP SELECTION -->
                    <div>
                      <label
                        class="block text-xs font-mono text-slate-400 uppercase mb-1"
                      >
                        Carte Sélectionnée
                      </label>
                      <select
                        .value=${this.selectedNextMap}
                        @change=${(e: any) =>
                          (this.selectedNextMap = e.target.value)}
                        class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none"
                      >
                        ${this.allMaps.map(
                          (m) =>
                            html`<option value=${m.type}>
                              ${m.type} (${m.category})
                            </option>`,
                        )}
                      </select>
                    </div>

                    <!-- MODE SELECTION -->
                    <div>
                      <label
                        class="block text-xs font-mono text-slate-400 uppercase mb-1"
                      >
                        Mode de Jeu
                      </label>
                      <select
                        .value=${this.selectedGameMode}
                        @change=${(e: any) =>
                          (this.selectedGameMode = e.target.value)}
                        class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none"
                      >
                        <option value="FFA">Chacun pour soi (FFA)</option>
                        <option value="Team">2 Équipes</option>
                        <option value="Duos">Duos (2 par équipe)</option>
                        <option value="Trios">Trios (3 par équipe)</option>
                        <option value="HumansVsNations">
                          Humains vs IA Fédérées
                        </option>
                      </select>
                    </div>
                  </div>

                  <div
                    class="pt-2 flex flex-wrap items-center justify-end gap-3"
                  >
                    <button
                      type="button"
                      @click=${() => this.handleSpawnLobby()}
                      class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-mono font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5"
                      title="Génère un nouveau salon public immédiat avec cette carte"
                    >
                      <span>🚀</span>
                      <span>Spawner un Salon Public</span>
                    </button>
                    <button
                      type="button"
                      @click=${() => this.handleSetNextMap()}
                      class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5"
                      title="Met à jour immédiatement le salon en direct actuellement ouvert aux joueurs"
                    >
                      <span>⚡</span>
                      <span>Changer le Salon Actuel (En Direct)</span>
                    </button>
                  </div>
                </div>

                <!-- QUEUES DISPLAY -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 shadow space-y-3">
                    <h4 class="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center justify-between">
                      <span>Prochaines Cartes : Solo FFA</span>
                      <span class="text-[10px] text-slate-400">En direct</span>
                    </h4>
                    <div class="space-y-1.5">
                      ${(this.rotation?.queues?.ffa || []).map(
                        (mapName, i) => html`
                          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono">
                            <span class="text-slate-400">#${i + 1}</span>
                            <span class="font-bold text-white">${mapName}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">FFA</span>
                          </div>
                        `,
                      )}
                    </div>
                  </div>

                  <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 shadow space-y-3">
                    <h4 class="text-xs font-mono font-bold text-purple-300 uppercase flex items-center justify-between">
                      <span>Prochaines Cartes : Équipes</span>
                      <span class="text-[10px] text-slate-400">En direct</span>
                    </h4>
                    <div class="space-y-1.5">
                      ${(this.rotation?.queues?.team || []).map(
                        (mapName, i) => html`
                          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono">
                            <span class="text-slate-400">#${i + 1}</span>
                            <span class="font-bold text-white">${mapName}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">ÉQUIPES</span>
                          </div>
                        `,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            `
          : nothing}

        <!-- TAB CONTENT: PLAYERS -->
        ${this.currentTab === "players"
          ? html`
              <div class="space-y-4">
                <!-- SEARCH & FILTER BAR -->
                <div class="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    .value=${this.playerSearch}
                    @input=${(e: any) => (this.playerSearch = e.target.value)}
                    placeholder="🔍 Rechercher un joueur par pseudo ou adresse email..."
                    class="flex-1 min-w-[240px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-red-500"
                  />
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      @click=${() => (this.filterOnlineOnly = false)}
                      class="px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${!this.filterOnlineOnly
                        ? "bg-slate-700 text-white border border-slate-500"
                        : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white"}"
                    >
                      Tous (${this.players.length})
                    </button>
                    <button
                      type="button"
                      @click=${() => (this.filterOnlineOnly = true)}
                      class="px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5 ${this.filterOnlineOnly
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400"
                        : "bg-emerald-950/40 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-950/80"}"
                    >
                      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>En Ligne (${onlineRegisteredCount})</span>
                    </button>
                  </div>
                  <span class="text-xs font-mono text-slate-400">
                    ${filteredPlayers.length} affiché(s)
                  </span>
                </div>

                <!-- PLAYERS TABLE -->
                <div class="rounded-2xl border border-slate-700 overflow-x-auto bg-slate-900/90 shadow-xl">
                  <table class="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr class="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                        <th class="p-3">Joueur / Email</th>
                        <th class="p-3">Présence</th>
                        <th class="p-3">Rôle</th>
                        <th class="p-3">Niveau & XP</th>
                        <th class="p-3">Plutonium ☢️</th>
                        <th class="p-3">Caps 🪙</th>
                        <th class="p-3">VIP</th>
                        <th class="p-3">Statut</th>
                        <th class="p-3 text-right">Actions Administrateur</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                      ${filteredPlayers.map(
                        (p) => html`
                          <tr class="hover:bg-slate-800/50 transition-colors">
                            <td class="p-3">
                              <div class="font-bold text-white text-sm">${p.username}</div>
                              <div class="text-[10px] text-slate-400">${p.email}</div>
                            </td>
                            <td class="p-3">
                              ${p.isOnline
                                ? html`<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold shadow-[0_0_10px_rgba(34,197,94,0.35)]">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                    <span>EN DIRECT</span>
                                  </span>`
                                : html`<span class="text-slate-500 text-[10px]">Hors-ligne</span>`}
                            </td>
                            <td class="p-3">
                              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.role === "admin"
                                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                : p.role === "moderator"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                  : "bg-slate-800 text-slate-300"}">
                                ${p.role}
                              </span>
                            </td>
                            <td class="p-3">
                              <div class="text-white font-bold">Niv. ${p.level}</div>
                              <div class="text-[10px] text-slate-400">${p.xp} XP</div>
                            </td>
                            <td class="p-3 text-purple-300 font-bold">
                              ☢️ ${p.plutonium.toLocaleString()}
                            </td>
                            <td class="p-3 text-amber-300 font-bold">
                              🪙 ${p.caps.toLocaleString()}
                            </td>
                            <td class="p-3">
                              ${p.isVip
                                ? html`<span class="text-amber-400 font-bold">★ VIP</span>`
                                : html`<span class="text-slate-500">-</span>`}
                            </td>
                            <td class="p-3">
                              ${p.isBanned
                                ? html`<span class="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-black uppercase">BANNI</span>`
                                : html`<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-black uppercase">ACTIF</span>`}
                            </td>
                            <td class="p-3 text-right">
                              <button
                                type="button"
                                @click=${() => (this.selectedPlayer = p)}
                                class="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-bold text-[11px] cursor-pointer shadow active:scale-95"
                              >
                                Gérer ⚙️
                              </button>
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                </div>

                <!-- PLAYER MANAGEMENT MODAL / DRAWER -->
                ${this.selectedPlayer
                  ? html`
                      <div class="p-5 rounded-2xl border-2 border-red-500/50 bg-slate-900/95 shadow-2xl space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-700 pb-3">
                          <div class="flex items-center gap-2">
                            <span class="text-2xl">👤</span>
                            <div>
                              <h3 class="text-base font-black font-mono text-white uppercase">
                                Gestion du Joueur : ${this.selectedPlayer.username}
                              </h3>
                              <span class="text-xs text-slate-400">${this.selectedPlayer.email}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            @click=${() => (this.selectedPlayer = null)}
                            class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 cursor-pointer"
                          >
                            ✕ Fermer le Panneau
                          </button>
                        </div>

                        <!-- ACTIONS GRID -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                          <!-- CRÉDITER DEVISES -->
                          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <span class="text-xs font-mono font-bold text-slate-300">Créditer Devises</span>
                            <div class="flex gap-2">
                              <button
                                type="button"
                                @click=${() =>
                                  this.executePlayerAction("set_currency", this.selectedPlayer!.email, {
                                    plutonium: this.selectedPlayer!.plutonium + 1000,
                                    caps: this.selectedPlayer!.caps + 10000,
                                  })}
                                class="flex-1 py-1.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[10px] font-bold cursor-pointer"
                              >
                                +1 000 ☢️ & +10k 🪙
                              </button>
                              <button
                                type="button"
                                @click=${() =>
                                  this.executePlayerAction("set_currency", this.selectedPlayer!.email, {
                                    plutonium: this.selectedPlayer!.plutonium + 10000,
                                    caps: this.selectedPlayer!.caps + 100000,
                                  })}
                                class="flex-1 py-1.5 rounded bg-purple-700/60 hover:bg-purple-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                +10k ☢️ & +100k 🪙
                              </button>
                            </div>
                          </div>

                          <!-- STATUT VIP -->
                          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <span class="text-xs font-mono font-bold text-slate-300">Statut VIP</span>
                            <div class="flex gap-2">
                              <button
                                type="button"
                                @click=${() =>
                                  this.executePlayerAction("set_vip", this.selectedPlayer!.email, {
                                    isVip: true,
                                    durationDays: 30,
                                  })}
                                class="flex-1 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-bold cursor-pointer"
                              >
                                VIP +30 Jours
                              </button>
                              <button
                                type="button"
                                @click=${() =>
                                  this.executePlayerAction("set_vip", this.selectedPlayer!.email, {
                                    isVip: false,
                                  })}
                                class="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                              >
                                Retirer VIP
                              </button>
                            </div>
                          </div>

                          <!-- DÉBLOQUER TOUT -->
                          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <span class="text-xs font-mono font-bold text-slate-300">God Mode Cosmétique</span>
                            <button
                              type="button"
                              @click=${() =>
                                this.executePlayerAction("unlock_all", this.selectedPlayer!.email)}
                              class="w-full py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              🎨 Débloquer Tous les Cosmétiques
                            </button>
                          </div>

                          <!-- BANNISSEMENT -->
                          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <span class="text-xs font-mono font-bold text-slate-300">Bannissement</span>
                            <button
                              type="button"
                              @click=${() =>
                                this.executePlayerAction(
                                  this.selectedPlayer!.isBanned ? "unban" : "ban",
                                  this.selectedPlayer!.email,
                                )}
                              class="w-full py-1.5 rounded text-[10px] font-bold cursor-pointer ${this.selectedPlayer.isBanned
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "bg-red-600 hover:bg-red-500 text-white"}"
                            >
                              ${this.selectedPlayer.isBanned ? "✅ Débannir le Compte" : "🚫 Bannir Définitivement"}
                            </button>
                          </div>
                        </div>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}

        <!-- TAB CONTENT: GUESTS -->
        ${this.currentTab === "guests"
          ? html`
              <div class="space-y-4">
                <!-- TOP HEADER HERO BANNER -->
                <div class="rounded-2xl border-2 border-purple-500/50 bg-gradient-to-r from-purple-950/60 via-slate-900/90 to-purple-950/60 p-5 shadow-[0_0_30px_rgba(168,85,247,0.25)] space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <span class="text-3xl animate-bounce">👾</span>
                      <div>
                        <h3 class="text-base font-black font-mono uppercase text-purple-300 tracking-wider flex items-center gap-2">
                          <span>JOUEURS INVITÉS EN DIRECT (SANS COMPTE)</span>
                          <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-black">
                            GUEST RADAR
                          </span>
                        </h3>
                        <p class="text-xs text-slate-300">
                          Surveillance en temps réel de tous les joueurs non-inscrits naviguant sur le site ou en cours de partie multijoueur.
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="px-5 py-2.5 rounded-2xl bg-slate-950 border-2 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <div class="text-3xl font-black text-purple-400 font-mono flex items-center gap-2.5">
                          <span>👾</span>
                          <span>${onlineGuestsCount}</span>
                          <span class="text-xs font-normal text-slate-300 uppercase tracking-widest">Invité(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- GUESTS QUICK STATS -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div class="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 flex items-center justify-between">
                      <span class="text-xs font-mono text-slate-300">Total Connectés</span>
                      <span class="text-lg font-mono font-black text-purple-400">${onlineGuestsCount}</span>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between">
                      <span class="text-xs font-mono text-slate-300">🎮 En Combat</span>
                      <span class="text-lg font-mono font-black text-emerald-400">${inGameGuestsCount}</span>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between">
                      <span class="text-xs font-mono text-slate-300">🟡 En Salons</span>
                      <span class="text-lg font-mono font-black text-amber-400">${inLobbyGuestsCount}</span>
                    </div>
                    <div class="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between">
                      <span class="text-xs font-mono text-slate-300">🏠 Dans les Menus</span>
                      <span class="text-lg font-mono font-black text-cyan-400">${inMenuGuestsCount}</span>
                    </div>
                  </div>
                </div>

                <!-- SEARCH & FILTER BAR -->
                <div class="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    .value=${this.guestSearch}
                    @input=${(e: any) => (this.guestSearch = e.target.value)}
                    placeholder="🔍 Filtrer les invités par pseudo, IP, page ou session..."
                    class="flex-1 min-w-[240px] px-4 py-2.5 rounded-xl bg-slate-950 border border-purple-900/60 text-sm font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      @click=${() => (this.guestStateFilter = "all")}
                      class="px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${this.guestStateFilter === "all"
                        ? "bg-purple-600 text-white border border-purple-400 shadow"
                        : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white"}"
                    >
                      Tous (${onlineGuestsCount})
                    </button>
                    <button
                      type="button"
                      @click=${() => (this.guestStateFilter = "in_game")}
                      class="px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${this.guestStateFilter === "in_game"
                        ? "bg-emerald-600 text-white border border-emerald-400 shadow"
                        : "bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-950/60"}"
                    >
                      🎮 Combat (${inGameGuestsCount})
                    </button>
                    <button
                      type="button"
                      @click=${() => (this.guestStateFilter = "lobby")}
                      class="px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${this.guestStateFilter === "lobby"
                        ? "bg-amber-600 text-slate-950 border border-amber-400 shadow"
                        : "bg-amber-950/30 text-amber-400 border border-amber-900/50 hover:bg-amber-950/60"}"
                    >
                      🟡 Salons (${inLobbyGuestsCount})
                    </button>
                    <button
                      type="button"
                      @click=${() => (this.guestStateFilter = "menu")}
                      class="px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${this.guestStateFilter === "menu"
                        ? "bg-cyan-600 text-white border border-cyan-400 shadow"
                        : "bg-cyan-950/30 text-cyan-400 border border-cyan-900/50 hover:bg-cyan-950/60"}"
                    >
                      🏠 Menus (${inMenuGuestsCount})
                    </button>
                  </div>
                  <span class="text-xs font-mono text-slate-400">
                    ${filteredGuests.length} invité(s) affiché(s)
                  </span>
                </div>

                <!-- GUESTS TABLE -->
                <div class="rounded-2xl border border-purple-900/60 overflow-x-auto bg-slate-900/95 shadow-xl">
                  <table class="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr class="bg-slate-950 border-b border-purple-900/40 text-slate-400 uppercase text-[11px]">
                        <th class="p-3">Invité / Session</th>
                        <th class="p-3">Statut Live</th>
                        <th class="p-3">Page Consultée</th>
                        <th class="p-3">Adresse IP</th>
                        <th class="p-3">Appareil & Navigateur</th>
                        <th class="p-3">Durée Session</th>
                        <th class="p-3">Dernière Activité</th>
                        <th class="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/80">
                      ${filteredGuests.length === 0
                        ? html`
                            <tr>
                              <td colspan="8" class="p-8 text-center text-slate-400">
                                <div class="text-3xl mb-2">👾</div>
                                <div class="text-sm font-bold text-slate-300">
                                  ${onlineGuestsCount === 0
                                    ? "Aucun joueur invité non-inscrit n'est connecté pour le moment."
                                    : "Aucun invité ne correspond à vos filtres de recherche."}
                                </div>
                                <p class="text-xs text-slate-500 mt-1">
                                  Les nouveaux visiteurs et invités apparaîtront ici dès leur arrivée en direct.
                                </p>
                              </td>
                            </tr>
                          `
                        : filteredGuests.map((guest) => {
                            const dev = parseDevice(guest.userAgent);
                            return html`
                              <tr class="hover:bg-slate-800/50 transition-colors">
                                <td class="p-3">
                                  <div class="flex items-center gap-2">
                                    <span class="w-7 h-7 rounded-lg bg-purple-950 border border-purple-500/50 flex items-center justify-center text-sm shadow">
                                      👾
                                    </span>
                                    <div>
                                      <div class="font-bold text-white flex items-center gap-1.5">
                                        <span>${guest.username}</span>
                                        <span class="px-1.5 py-0.2 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50 text-[9px] uppercase font-bold">
                                          Invité
                                        </span>
                                      </div>
                                      <div class="text-[10px] text-slate-400 font-mono" title="${guest.sessionId}">
                                        ${guest.sessionId.slice(0, 18)}...
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td class="p-3">
                                  ${guest.state === "in_game"
                                    ? html`
                                        <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1.5 w-fit">
                                          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                          <span>En Combat</span>
                                        </span>
                                      `
                                    : guest.state === "lobby"
                                      ? html`
                                          <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1.5 w-fit">
                                            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                            <span>En Salon</span>
                                          </span>
                                        `
                                      : html`
                                          <span class="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1.5 w-fit">
                                            <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                                            <span>Au QG / Menus</span>
                                          </span>
                                        `}
                                </td>
                                <td class="p-3">
                                  <span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[11px] font-mono">
                                    ${guest.currentPage === "play" || guest.currentPage === "page-play"
                                      ? "🎮 Accueil / Jeu"
                                      : guest.currentPage === "store" || guest.currentPage === "page-store"
                                        ? "🛒 Boutique"
                                        : guest.currentPage === "profile" || guest.currentPage === "page-profile"
                                          ? "👤 Profil"
                                          : guest.currentPage === "combat" || guest.currentPage === "match"
                                            ? "⚔️ Champ de Bataille"
                                            : guest.currentPage}
                                  </span>
                                </td>
                                <td class="p-3 font-mono text-slate-300">
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-xs">🌐</span>
                                    <span>${guest.ip || "Inconnue"}</span>
                                  </div>
                                </td>
                                <td class="p-3 text-slate-300">
                                  <div class="flex items-center gap-1.5" title="${guest.userAgent || ""}">
                                    <span>${dev.icon}</span>
                                    <span class="text-[11px]">${dev.name}</span>
                                  </div>
                                </td>
                                <td class="p-3 text-slate-300 text-[11px] font-mono">
                                  ${formatDuration(guest.connectedDurationSeconds || 0)}
                                </td>
                                <td class="p-3 font-mono">
                                  <span class="text-[11px] ${guest.lastSeenAgoSeconds < 10 ? "text-emerald-400 font-bold" : "text-slate-400"}">
                                    il y a ${guest.lastSeenAgoSeconds}s
                                  </span>
                                </td>
                                <td class="p-3 text-right">
                                  <button
                                    type="button"
                                    @click=${() => this.handleKickGuest(guest)}
                                    class="px-2.5 py-1 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700/60 font-bold text-[10px] uppercase cursor-pointer shadow active:scale-95 transition-all"
                                    title="Fermer la session invité"
                                  >
                                    Éjecter 🚫
                                  </button>
                                </td>
                              </tr>
                            `;
                          })}
                    </tbody>
                  </table>
                </div>
              </div>
            `
          : nothing}

        <!-- TAB CONTENT: PURCHASES -->
        ${this.currentTab === "purchases"
          ? html`
              <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 class="text-sm font-black font-mono text-white uppercase">
                      Journal des Transactions en Temps Réel
                    </h3>
                    <p class="text-xs text-slate-400">
                      Suivi instantané de tous les achats Stripe (€), ouvertures de coffres et packs acquis.
                    </p>
                  </div>
                  <div class="flex items-center gap-4 text-xs font-mono">
                    <span class="text-emerald-400 font-bold">
                      ${this.purchaseStats?.stripeTransactions ?? 0} Achat(s) Stripe
                    </span>
                    <span class="text-purple-400 font-bold">
                      ${this.purchaseStats?.crateTransactions ?? 0} Coffre(s)
                    </span>
                    <span class="text-cyan-400 font-bold">
                      ${this.purchaseStats?.packTransactions ?? 0} Pack(s)
                    </span>
                  </div>
                </div>

                <!-- PURCHASES TABLE -->
                <div class="rounded-2xl border border-slate-700 overflow-x-auto bg-slate-900/90 shadow">
                  <table class="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr class="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                        <th class="p-3">Date & Heure</th>
                        <th class="p-3">Joueur</th>
                        <th class="p-3">Type</th>
                        <th class="p-3">Article / Bundle</th>
                        <th class="p-3 text-right">Montant Réglé</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                      ${this.purchases.length === 0
                        ? html`
                            <tr>
                              <td colspan="5" class="p-6 text-center text-slate-500">
                                Aucun achat enregistré pour le moment.
                              </td>
                            </tr>
                          `
                        : this.purchases.map(
                            (pur) => html`
                              <tr class="hover:bg-slate-800/40">
                                <td class="p-3 text-slate-400 text-[11px]">
                                  ${new Date(pur.timestamp).toLocaleString("fr-FR")}
                                </td>
                                <td class="p-3">
                                  <div class="font-bold text-white">${pur.username}</div>
                                  <div class="text-[10px] text-slate-400">${pur.email}</div>
                                </td>
                                <td class="p-3">
                                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${pur.type === "stripe"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : "bg-purple-500/20 text-purple-300 border border-purple-500/40"}">
                                    ${pur.type}
                                  </span>
                                </td>
                                <td class="p-3 text-white font-bold">
                                  ${pur.itemName}
                                </td>
                                <td class="p-3 text-right font-bold ${pur.priceEur ? "text-emerald-400 text-sm" : "text-purple-300"}">
                                  ${pur.priceEur
                                    ? `${pur.priceEur.toFixed(2)} €`
                                    : pur.pricePlutonium
                                      ? `☢️ ${pur.pricePlutonium}`
                                      : pur.priceCaps
                                        ? `🪙 ${pur.priceCaps}`
                                        : "Offert"}
                                </td>
                              </tr>
                            `,
                          )}
                    </tbody>
                  </table>
                </div>
              </div>
            `
          : nothing}

        <!-- TAB CONTENT: TOOLS & SUGGESTIONS -->
        ${this.currentTab === "tools"
          ? html`
              <div class="space-y-6">
                <!-- SUGGESTIONS CARD -->
                <div class="p-5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow space-y-4">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">💡</span>
                    <h3 class="text-base font-black font-mono text-white uppercase">
                      Recommandations & Améliorations Stratégiques pour BorderConflict
                    </h3>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono leading-relaxed">
                    <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div class="font-bold text-amber-300">1. Webhook Discord Automatique</div>
                      <p class="text-slate-400">
                        Recevez chaque achat Stripe (€) et chaque nouveau compte directement sur un salon privé de votre serveur Discord.
                      </p>
                    </div>

                    <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div class="font-bold text-cyan-300">2. Mode Tournoi à Inscription</div>
                      <p class="text-slate-400">
                        Possibilité de bloquer un salon public avec mot de passe et tickets d'entrée en Plutonium pour organiser des tournois de clans.
                      </p>
                    </div>

                    <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div class="font-bold text-rose-300">3. Anti-Cheat Radar & Surveillance</div>
                      <p class="text-slate-400">
                        Journalisation des joueurs qui dépassent un seuil anormal d'actions par seconde (APM) ou de victoires consécutives.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- BACKUP & MAINTENANCE BOX -->
                <div class="p-5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-black font-mono text-white uppercase">
                        Sauvegarde & Exportation Complète des Données
                      </h4>
                      <p class="text-xs text-slate-400">
                        Téléchargez une archive JSON intégrale contenant tous les comptes, clans, inventaires et historiques d'achats.
                      </p>
                    </div>
                    <button
                      type="button"
                      @click=${() => this.handleDownloadBackup()}
                      class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/50 text-cyan-300 font-mono font-bold text-xs uppercase cursor-pointer shadow active:scale-95 flex items-center gap-2"
                    >
                      <span>💾</span>
                      <span>Télécharger le Backup JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}
