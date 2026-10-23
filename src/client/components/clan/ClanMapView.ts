import { html, LitElement, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { getAudience } from "../../Api";
import { fetchClanConquestMap } from "../../ClanApi";
import { translateText } from "../../Utils";

export function clanMapOrigin(): string {
  const aud = getAudience();
  return aud === "localhost"
    ? "http://clanmap.localhost:8787"
    : `https://clanmap.${aud}`;
}

export interface TacticalSector {
  id: string;
  name: string;
  code: string;
  coords: { x: number; y: number };
  controllingClan: {
    tag: string;
    name: string;
    color: string;
    membersCount?: number;
    leader?: string;
  };
  influence: number;
  contestedWith?: string;
  status: "secure" | "fortified" | "contested";
  statusLabel: string;
  perk: string;
  dailyReward: string;
  defenseLevel: number;
  garrison: string;
  lastEvent: string;
  description: string;
}

export interface ConquestMapData {
  season: string;
  cycleEndsIn: string;
  sectors: TacticalSector[];
  dominationSummary: {
    tag: string;
    name: string;
    color: string;
    count: number;
  }[];
  recentActivity: {
    id: number;
    time: string;
    clanTag: string;
    type: string;
    text: string;
  }[];
}

const DEFAULT_CONQUEST_DATA: ConquestMapData = {
  season: "Saison 1 : Tempête Nucléaire",
  cycleEndsIn: "13 jours, 18 heures",
  sectors: [
    {
      id: "eu_west",
      name: "Secteur Europe Occidentale",
      code: "EUR-01",
      coords: { x: 50, y: 31 },
      controllingClan: {
        tag: "FOX",
        name: "Fox Vanguard",
        color: "#38bdf8",
        membersCount: 12,
        leader: "CommanderAlpha",
      },
      influence: 78,
      contestedWith: "APEX",
      status: "secure",
      statusLabel: "Sécurisé",
      perk: "+15% Caps en fin de partie",
      dailyReward: "250 Caps / 24h",
      defenseLevel: 4,
      garrison: "14 200 Troupes Tactiques",
      lastEvent: "Victoire écrasante de [FOX] face aux assauts de [APEX]",
      description:
        "Centre névralgique de commandement européen. Contrôle les carrefours de télécommunications et les usines de blindés.",
    },
    {
      id: "na_east",
      name: "Secteur Silos Nord-Américains",
      code: "USA-02",
      coords: { x: 23, y: 34 },
      controllingClan: {
        tag: "APEX",
        name: "Apex Predators",
        color: "#f59e0b",
        membersCount: 9,
        leader: "ApexGeneral",
      },
      influence: 85,
      contestedWith: "IRON",
      status: "fortified",
      statusLabel: "Forteresse Silo",
      perk: "+2 XP par victoire tactique",
      dailyReward: "15 Plutonium / 24h",
      defenseLevel: 5,
      garrison: "19 500 Troupes de Choc",
      lastEvent: "Infiltration repoussée par la garnison d'élite de [APEX]",
      description:
        "Complexe de lancement balistique et usines lourdes. Assure l'enrichissement en isotopes et la supériorité technologique.",
    },
    {
      id: "asia_east",
      name: "Secteur Eurasie & Forteresses Est",
      code: "RUS-03",
      coords: { x: 74, y: 26 },
      controllingClan: {
        tag: "IRON",
        name: "Iron Fortress",
        color: "#a855f7",
        membersCount: 8,
        leader: "IronWarden",
      },
      influence: 72,
      contestedWith: "FOX",
      status: "fortified",
      statusLabel: "Blindage Lourd",
      perk: "+20% Portée radar & vision",
      dailyReward: "300 Caps / 24h",
      defenseLevel: 4,
      garrison: "16 800 Troupes Blindées",
      lastEvent: "Barrage d'artillerie lourde soutenu par [IRON]",
      description:
        "Bunkers souterrains fortifiés à l'épreuve des frappes orbitales. Déploie des systèmes radar avancés sur tout le continent.",
    },
    {
      id: "mea_south",
      name: "Secteur Gisements & Désert Sud",
      code: "MEA-04",
      coords: { x: 56, y: 54 },
      controllingClan: {
        tag: "FOX",
        name: "Fox Vanguard",
        color: "#38bdf8",
        membersCount: 12,
        leader: "CommanderAlpha",
      },
      influence: 64,
      contestedWith: "IRON",
      status: "contested",
      statusLabel: "Zone Contestée",
      perk: "+10% Revenu d'or par seconde",
      dailyReward: "200 Caps / 24h",
      defenseLevel: 3,
      garrison: "9 400 Combattants",
      lastEvent:
        "Offensive majeure lancée par [IRON] pour contester le puits pétrolier",
      description:
        "Bassin de réserves stratégiques et oléoducs clés. Les revenus d'or générés ici permettent des réapprovisionnements militaires continus.",
    },
    {
      id: "pac_oceania",
      name: "Secteur Archipels & Bases Pacifique",
      code: "PAC-05",
      coords: { x: 84, y: 68 },
      controllingClan: {
        tag: "APEX",
        name: "Apex Predators",
        color: "#f59e0b",
        membersCount: 9,
        leader: "ApexGeneral",
      },
      influence: 91,
      contestedWith: "FOX",
      status: "secure",
      statusLabel: "Domination Totale",
      perk: "+15% Vitesse navale & débarquements",
      dailyReward: "20 Plutonium / 24h",
      defenseLevel: 5,
      garrison: "23 000 Forces Maritimes",
      lastEvent: "Flotte de débarquement déployée avec succès par [APEX]",
      description:
        "Réseau insulaire ultra-sécurisé garantissant la mobilité rapide et des attaques côtières foudroyantes sur toutes les côtes.",
    },
    {
      id: "sa_south",
      name: "Secteur Silos Amazonie & Andes",
      code: "SAM-06",
      coords: { x: 31, y: 66 },
      controllingClan: {
        tag: "IRON",
        name: "Iron Fortress",
        color: "#a855f7",
        membersCount: 8,
        leader: "IronWarden",
      },
      influence: 59,
      contestedWith: "APEX",
      status: "contested",
      statusLabel: "Zone Contestée",
      perk: "+10% Régénération d'infanterie",
      dailyReward: "180 Caps / 24h",
      defenseLevel: 3,
      garrison: "8 200 Gardes Frontières",
      lastEvent: "Ermitage tactique : embuscade menée par [IRON]",
      description:
        "Relais satellitaires dissimulés dans les massifs montagneux et laboratoires de bio-stimulation accélérant les renforts.",
    },
  ],
  dominationSummary: [
    { tag: "FOX", name: "Fox Vanguard", color: "#38bdf8", count: 2 },
    { tag: "APEX", name: "Apex Predators", color: "#f59e0b", count: 2 },
    { tag: "IRON", name: "Iron Fortress", color: "#a855f7", count: 2 },
  ],
  recentActivity: [
    {
      id: 1,
      time: "Il y a 4 min",
      clanTag: "FOX",
      type: "defense",
      text: "[FOX] a consolidé la défense de Secteur Europe Occidentale (+450 Influence)",
    },
    {
      id: 2,
      time: "Il y a 12 min",
      clanTag: "APEX",
      type: "conquest",
      text: "[APEX] a écrasé une rébellion dans Secteur Archipels & Bases Pacifique (Domination 91%)",
    },
    {
      id: 3,
      time: "Il y a 28 min",
      clanTag: "IRON",
      type: "assault",
      text: "[IRON] a lancé un raid éclair sur Secteur Gisements & Désert Sud",
    },
  ],
};

@customElement("clan-map-view")
export class ClanMapView extends LitElement {
  @state() private mapData: ConquestMapData = DEFAULT_CONQUEST_DATA;
  @state() private selectedSectorId: string = "eu_west";
  @state() private selectedClanFilter: string = "ALL";
  @state() private isFullscreen = false;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadConquestData();
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
  }

  disconnectedCallback() {
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    super.disconnectedCallback();
  }

  private onFullscreenChange = () => {
    this.isFullscreen = document.fullscreenElement === this;
  };

  private async loadConquestData() {
    try {
      const data = await fetchClanConquestMap();
      if (data && Array.isArray(data.sectors) && data.sectors.length > 0) {
        this.mapData = data;
      }
    } catch {
      // Use fallback data
    }
  }

  public enterFullscreen(): void {
    if (!document.fullscreenElement) {
      void this.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  }

  private get selectedSector(): TacticalSector {
    return (
      this.mapData.sectors.find((s) => s.id === this.selectedSectorId) ||
      this.mapData.sectors[0]
    );
  }

  private handleDeploy() {
    // Closes the clan modal so the player can jump straight into the fight
    this.dispatchEvent(
      new CustomEvent("close-clan-modal", { bubbles: true, composed: true }),
    );
    // Find closest modal if any
    const modal = this.closest("clan-modal, o-modal") as
      | (HTMLElement & { close?: () => void })
      | null;
    if (modal && typeof modal.close === "function") {
      modal.close();
    }
  }

  render() {
    const sector = this.selectedSector;
    const filter = this.selectedClanFilter;
    const visibleSectors =
      filter === "ALL"
        ? this.mapData.sectors
        : this.mapData.sectors.filter((s) => s.controllingClan.tag === filter);

    return html`
      <div
        class="w-full h-full min-h-[580px] flex flex-col bg-[#070a10] text-slate-100 font-sans select-none overflow-hidden relative border border-cyan-500/20 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.08)]"
      >
        <!-- Top Command Header -->
        <div
          class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/90 border-b border-cyan-500/20 backdrop-blur-md z-10"
        >
          <div class="flex items-center gap-3">
            <div class="relative flex items-center justify-center">
              <span
                class="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
              ></span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span
                  class="text-xs font-black tracking-widest uppercase text-cyan-400 font-mono"
                >
                  CARTE TACTIQUE DES CONQUÊTES
                </span>
                <span
                  class="rounded bg-cyan-950 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 uppercase tracking-widest"
                >
                  LIVE SAT-OPS
                </span>
              </div>
              <p class="text-[11px] text-slate-400 font-medium">
                ${this.mapData.season} ·
                <span class="text-amber-400 font-bold"
                  >Fin du cycle dans ${this.mapData.cycleEndsIn}</span
                >
              </p>
            </div>
          </div>

          <!-- Clan Domination Summary Badges -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              @click=${() => (this.selectedClanFilter = "ALL")}
              class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${filter ===
              'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white'}"
            >
              Tous les Secteurs (${this.mapData.sectors.length})
            </button>
            ${this.mapData.dominationSummary.map(
              (c) => html`
                <button
                  type="button"
                  @click=${() => (this.selectedClanFilter = c.tag)}
                  style="border-color: ${filter === c.tag
                    ? c.color
                    : 'rgba(255,255,255,0.1)'}; color: ${c.color};"
                  class="px-2.5 py-1 rounded-lg text-xs font-black tracking-wider transition-all border flex items-center gap-1.5 ${filter ===
                  c.tag
                    ? 'bg-white/10 shadow-lg scale-105'
                    : 'bg-slate-900/80 hover:bg-white/5 opacity-80'}"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    style="background-color: ${c.color}; box-shadow: 0 0 6px ${c.color}"
                  ></span>
                  <span>[${c.tag}]</span>
                  <span
                    class="rounded bg-black/40 px-1 py-0.2 text-[10px] text-slate-200"
                    >${c.count} zones</span
                  >
                </button>
              `,
            )}
            <button
              type="button"
              @click=${() => this.enterFullscreen()}
              title=${translateText("fullscreen.enter")}
              class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all ml-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Center Workspace: Map Canvas + Tactical Intelligence Briefing -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 relative">
          <!-- Left: Vector Tactical World Map -->
          <div
            class="lg:col-span-8 flex flex-col items-center justify-center relative p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#070b12] to-[#04060a] overflow-hidden"
          >
            <!-- Radar Grid Lines & Coordinates Overlay -->
            <div
              class="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#06b6d415_1px,transparent_1px),linear-gradient(to_bottom,#06b6d415_1px,transparent_1px)] bg-[size:32px_32px]"
            ></div>
            <div
              class="absolute top-2 left-4 text-[9px] font-mono text-cyan-500/40 tracking-widest pointer-events-none uppercase"
            >
              GRID: WGS-84 / ORBITAL SCAN ACTIVE · 46.105°N · DEFCON 2
            </div>

            <!-- Stylized Tactical SVG World Map Canvas -->
            <div
              class="w-full h-full max-h-[500px] aspect-[16/9] relative flex items-center justify-center"
            >
              <svg
                viewBox="0 0 1000 560"
                class="w-full h-full drop-shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <!-- Radar Sweep Animation Glow -->
                  <radialGradient
                    id="radarGlow"
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fx="50%"
                    fy="50%"
                  >
                    <stop
                      offset="0%"
                      stop-color="#06b6d4"
                      stop-opacity="0.25"
                    />
                    <stop
                      offset="70%"
                      stop-color="#06b6d4"
                      stop-opacity="0.05"
                    />
                    <stop
                      offset="100%"
                      stop-color="#06b6d4"
                      stop-opacity="0"
                    />
                  </radialGradient>
                  <filter
                    id="glow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <!-- Polar Concentric Tactical Rings -->
                <circle
                  cx="500"
                  cy="280"
                  r="240"
                  stroke="#0891b2"
                  stroke-opacity="0.12"
                  stroke-dasharray="6 6"
                  stroke-width="1.5"
                />
                <circle
                  cx="500"
                  cy="280"
                  r="140"
                  stroke="#0891b2"
                  stroke-opacity="0.18"
                  stroke-dasharray="4 4"
                  stroke-width="1"
                />
                <circle
                  cx="500"
                  cy="280"
                  r="40"
                  stroke="#06b6d4"
                  stroke-opacity="0.25"
                  stroke-width="1"
                />

                <!-- Continents Vector Outlines (Stylized Dark Sci-Fi Polygons) -->
                <!-- North America -->
                <path
                  d="M130 90 L270 80 L320 120 L280 180 L250 250 L200 280 L180 250 L140 220 L110 160 Z"
                  fill="#111c2e"
                  stroke="#0284c7"
                  stroke-width="1.5"
                  stroke-opacity="0.4"
                />
                <!-- Greenland -->
                <path
                  d="M360 50 L430 40 L450 90 L400 110 L370 80 Z"
                  fill="#111c2e"
                  stroke="#0284c7"
                  stroke-width="1"
                  stroke-opacity="0.3"
                />
                <!-- South America -->
                <path
                  d="M240 285 L320 290 L380 340 L350 430 L290 490 L270 470 L250 370 Z"
                  fill="#111c2e"
                  stroke="#0284c7"
                  stroke-width="1.5"
                  stroke-opacity="0.4"
                />
                <!-- Europe -->
                <path
                  d="M460 110 L560 100 L580 160 L520 210 L470 200 L450 150 Z"
                  fill="#111c2e"
                  stroke="#0284c7"
                  stroke-width="1.5"
                  stroke-opacity="0.4"
                />
                <!-- Africa -->
                <path
                  d="M460 220 L570 210 L610 280 L590 380 L540 450 L490 420 L450 300 Z"
                  fill="#111c2e"
                  stroke="#0284c7"
                  stroke-width="1.5"
                  stroke-opacity="0.4"
                />
                <!-- Eurasia / Asia -->
                <path
                  d="M580 90 L850 70 L910 130 L870 240 L790 310 L710 300 L680 230 L590 190 Z"
                  fill="#111c2e"
                  stroke="#0284c7"
                  stroke-width="1.5"
                  stroke-opacity="0.4"
                />
                <!-- Australia / Oceania -->
                <path
                  d="M780 360 L890 350 L910 430 L840 470 L770 420 Z"
                  fill="#111c2e"
                  stroke="#0284c7"
                  stroke-width="1.5"
                  stroke-opacity="0.4"
                />

                <!-- Tactical Interconnection Supply Vectors -->
                <line
                  x1="230"
                  y1="190"
                  x2="500"
                  y2="174"
                  stroke="#38bdf8"
                  stroke-opacity="0.25"
                  stroke-dasharray="5 5"
                  stroke-width="1.5"
                />
                <line
                  x1="500"
                  y1="174"
                  x2="740"
                  y2="145"
                  stroke="#38bdf8"
                  stroke-opacity="0.25"
                  stroke-dasharray="5 5"
                  stroke-width="1.5"
                />
                <line
                  x1="500"
                  y1="174"
                  x2="560"
                  y2="302"
                  stroke="#f59e0b"
                  stroke-opacity="0.25"
                  stroke-dasharray="5 5"
                  stroke-width="1.5"
                />
                <line
                  x1="230"
                  y1="190"
                  x2="310"
                  y2="370"
                  stroke="#a855f7"
                  stroke-opacity="0.25"
                  stroke-dasharray="5 5"
                  stroke-width="1.5"
                />
                <line
                  x1="740"
                  y1="145"
                  x2="840"
                  y2="380"
                  stroke="#f59e0b"
                  stroke-opacity="0.25"
                  stroke-dasharray="5 5"
                  stroke-width="1.5"
                />
              </svg>

              <!-- Interactive Sector Node Overlays -->
              ${visibleSectors.map((s) => {
                const isSelected = s.id === this.selectedSectorId;
                const clan = s.controllingClan;
                return html`
                  <button
                    type="button"
                    @click=${() => (this.selectedSectorId = s.id)}
                    style="left: ${s.coords.x}%; top: ${s.coords.y}%;"
                    class="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none transition-all duration-300 z-20 cursor-pointer"
                  >
                    <!-- Pulse Halo when Selected -->
                    ${isSelected
                      ? html`
                          <span
                            class="absolute -inset-3 rounded-full animate-ping opacity-60"
                            style="background-color: ${clan.color};"
                          ></span>
                        `
                      : ""}

                    <!-- Main Beacon Pin -->
                    <div
                      class="relative flex flex-col items-center gap-1 transition-transform group-hover:scale-110 ${isSelected
                        ? "scale-110"
                        : ""}"
                    >
                      <div
                        class="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase text-slate-950 flex items-center gap-1 shadow-xl border"
                        style="background-color: ${clan.color}; border-color: ${clan.color}; box-shadow: 0 0 16px ${clan.color}80;"
                      >
                        <span>[${clan.tag}]</span>
                        <span class="text-[9px] opacity-80"
                          >${s.influence}%</span
                        >
                      </div>

                      <div
                        class="w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-md"
                        style="background-color: ${clan.color};"
                      >
                        <div class="w-1 h-1 rounded-full bg-white"></div>
                      </div>

                      <div
                        class="rounded bg-black/85 backdrop-blur px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-slate-300 border border-white/10 group-hover:border-cyan-400/50"
                      >
                        ${s.code}
                      </div>
                    </div>
                  </button>
                `;
              })}
            </div>
          </div>

          <!-- Right: Tactical Intelligence Dossier Panel -->
          <div
            class="lg:col-span-4 flex flex-col justify-between p-5 bg-slate-950/80 border-t lg:border-t-0 lg:border-l border-cyan-500/20 backdrop-blur-md overflow-y-auto"
          >
            <div class="space-y-4">
              <!-- Sector Header -->
              <div>
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-mono font-black text-cyan-400 tracking-widest uppercase"
                  >
                    DOSSIER TACTIQUE · ${sector.code}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${sector.status ===
                    'secure'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : sector.status === 'fortified'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}"
                  >
                    ${sector.statusLabel}
                  </span>
                </div>
                <h3 class="mt-1 text-lg font-black text-white tracking-wide">
                  ${sector.name}
                </h3>
                <p class="mt-1 text-xs text-slate-300 leading-relaxed">
                  ${sector.description}
                </p>
              </div>

              <!-- Controlling Clan Card -->
              <div
                class="rounded-xl border p-3.5 bg-slate-900/90 shadow-md relative overflow-hidden"
                style="border-color: ${sector.controllingClan.color}40;"
              >
                <div
                  class="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none"
                  style="background-color: ${sector.controllingClan.color};"
                ></div>
                <div class="text-[10px] font-mono text-slate-400 uppercase">
                  Faction en Contrôle
                </div>
                <div class="mt-1 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span
                      class="px-2 py-0.5 rounded text-xs font-black uppercase text-slate-950"
                      style="background-color: ${sector.controllingClan.color};"
                    >
                      [${sector.controllingClan.tag}]
                    </span>
                    <span class="text-sm font-bold text-white"
                      >${sector.controllingClan.name}</span
                    >
                  </div>
                  <span class="text-xs text-slate-400"
                    >Chef :
                    <strong class="text-slate-200"
                      >${sector.controllingClan.leader}</strong
                    ></span
                  >
                </div>

                <!-- Influence Gauge -->
                <div class="mt-3">
                  <div
                    class="flex items-center justify-between text-[11px] mb-1 font-mono"
                  >
                    <span class="text-slate-300"
                      >Niveau de Domination du Secteur</span
                    >
                    <span
                      class="font-black"
                      style="color: ${sector.controllingClan.color};"
                      >${sector.influence}%</span
                    >
                  </div>
                  <div
                    class="w-full h-2 rounded-full bg-slate-800 overflow-hidden"
                  >
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      style="width: ${sector.influence}%; background-color: ${sector
                        .controllingClan.color};"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Strategic Perks & Bounties -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  class="rounded-xl bg-slate-900/80 border border-white/10 p-3"
                >
                  <div
                    class="text-[10px] font-mono text-cyan-400 uppercase flex items-center gap-1 font-bold"
                  >
                    <span>⚡ BONUS STRATÉGIQUE</span>
                  </div>
                  <div class="mt-1 text-xs font-extrabold text-white">
                    ${sector.perk}
                  </div>
                </div>

                <div
                  class="rounded-xl bg-slate-900/80 border border-white/10 p-3"
                >
                  <div
                    class="text-[10px] font-mono text-amber-400 uppercase flex items-center gap-1 font-bold"
                  >
                    <span>💰 RENTE DE GUERRE</span>
                  </div>
                  <div class="mt-1 text-xs font-extrabold text-white">
                    ${sector.dailyReward}
                  </div>
                </div>
              </div>

              <!-- Defense & Garrison Info -->
              <div
                class="rounded-xl bg-slate-900/60 border border-white/5 p-3 space-y-1.5"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Garnison Active :</span>
                  <span class="font-bold text-slate-200"
                    >${sector.garrison}</span
                  >
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400">Niveau de Fortification :</span>
                  <div class="flex gap-1">
                    ${[1, 2, 3, 4, 5].map(
                      (lvl) => html`
                        <span
                          class="w-3.5 h-1.5 rounded-sm ${lvl <=
                          sector.defenseLevel
                            ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                            : 'bg-slate-800'}"
                        ></span>
                      `,
                    )}
                  </div>
                </div>
                <div class="pt-1 border-t border-white/5">
                  <p class="text-[11px] text-slate-400 italic">
                    🛰️ ${sector.lastEvent}
                  </p>
                </div>
              </div>
            </div>

            <!-- Action Button: Deploy to frontline -->
            <div class="mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                @click=${() => this.handleDeploy()}
                class="w-full cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 py-3 text-xs font-black uppercase tracking-wider text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-2"
              >
                <span>⚔️ SE DÉPLOYER SUR CE SECTEUR</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Running Operational Feed Ticker -->
        <div
          class="px-5 py-2.5 bg-slate-950 border-t border-cyan-500/20 flex items-center gap-4 text-xs z-10 overflow-hidden"
        >
          <div
            class="shrink-0 flex items-center gap-2 text-cyan-400 font-mono font-black text-[11px] uppercase tracking-wider"
          >
            <span class="animate-pulse">📡</span>
            <span>FLUX OPÉRATIONNEL :</span>
          </div>

          <div
            class="flex-1 flex items-center gap-6 overflow-x-auto no-scrollbar whitespace-nowrap text-slate-300 text-[11px]"
          >
            ${this.mapData.recentActivity.map(
              (act) => html`
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-slate-500 font-mono">[${act.time}]</span>
                  <span class="text-slate-200 font-medium">${act.text}</span>
                  <span class="text-white/20">·</span>
                </div>
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }
}
