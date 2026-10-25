const fs = require("fs");

console.log(
  "Generating expanded catalog with +100 cosmetics and animated SVGs for legendaries...",
);

// Helper to generate animated SVG crowns
function generateAnimatedCrown(name, label, rarity, colors, animType) {
  const { c1, c2, c3, stroke } = colors;
  let animSnippet = "";
  if (animType === "pulse") {
    animSnippet = `<animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>`;
  } else if (animType === "glow") {
    animSnippet = `<animate attributeName="stroke-width" values="2;4.5;2" dur="1.8s" repeatCount="indefinite"/>`;
  } else if (animType === "orb") {
    animSnippet = `<animate attributeName="r" values="3.5;6.5;3.5" dur="1.5s" repeatCount="indefinite"/>`;
  } else if (animType === "rotate") {
    animSnippet = `<animateTransform attributeName="transform" type="rotate" from="0 32 30" to="360 32 30" dur="8s" repeatCount="indefinite"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-${name}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-${name})">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="${c1}" stroke="${stroke}" stroke-width="3">
      ${animSnippet}
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="${c2}">
      <animate attributeName="fill" values="${c2};${c3};${c2}" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="${c3}">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="${c3}">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="${c3}">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="${c2}" stroke="${stroke}" stroke-width="1.5"/>
  </g>
</svg>`;

  return { name, label, rarity, svg };
}

// 25 New Crowns (total 20 + 25 = 45 crowns, of which 10 are animated legendaries)
const extraCrowns = [
  // 10 Legendaries ANIMATED
  generateAnimatedCrown(
    "hyperion_nova_crown",
    "Couronne Nova d'Hypérion",
    "legendary",
    { c1: "#f59e0b", c2: "#dc2626", c3: "#fef08a", stroke: "#ffffff" },
    "orb",
  ),
  generateAnimatedCrown(
    "void_singularity_diadem",
    "Diadème du Vortex Stellaire",
    "legendary",
    { c1: "#6366f1", c2: "#1e1b4b", c3: "#c084fc", stroke: "#38bdf8" },
    "pulse",
  ),
  generateAnimatedCrown(
    "chono_master_halo",
    "Halo Astral de Chronos",
    "legendary",
    { c1: "#06b6d4", c2: "#082f49", c3: "#67e8f9", stroke: "#ffffff" },
    "rotate",
  ),
  generateAnimatedCrown(
    "plasma_dragon_crest",
    "Cimier du Dragon Éthéré",
    "legendary",
    { c1: "#ec4899", c2: "#831843", c3: "#fbcfe8", stroke: "#f43f5e" },
    "glow",
  ),
  generateAnimatedCrown(
    "titan_oblivion_crown",
    "Couronne d'Oblivion Titan",
    "legendary",
    { c1: "#10b981", c2: "#022c22", c3: "#a7f3d0", stroke: "#34d399" },
    "orb",
  ),
  generateAnimatedCrown(
    "solar_monarch_radiance",
    "Rayonnement du Monarque Solaire",
    "legendary",
    { c1: "#ea580c", c2: "#7c2d12", c3: "#fed7aa", stroke: "#fde047" },
    "pulse",
  ),
  generateAnimatedCrown(
    "arcane_emperor_crown",
    "Couronne de l'Empereur Arcanique",
    "legendary",
    { c1: "#8b5cf6", c2: "#2e1065", c3: "#ddd6fe", stroke: "#a855f7" },
    "glow",
  ),
  generateAnimatedCrown(
    "cryo_god_coronet",
    "Diadème du Seigneur Cryo",
    "legendary",
    { c1: "#0284c7", c2: "#082f49", c3: "#bae6fd", stroke: "#ffffff" },
    "pulse",
  ),
  generateAnimatedCrown(
    "apocalypse_sovereign",
    "Souveraineté de l'Apocalypse",
    "legendary",
    { c1: "#e11d48", c2: "#4c0519", c3: "#ffe4e6", stroke: "#fb7185" },
    "orb",
  ),
  generateAnimatedCrown(
    "cyber_overlord_apex",
    "Apex du Cyber-Overlord",
    "legendary",
    { c1: "#14b8a6", c2: "#042f2e", c3: "#5eead4", stroke: "#22d3ee" },
    "glow",
  ),

  // 6 Epics
  generateAnimatedCrown(
    "storm_bringer_helm",
    "Casque du Faiseur d'Orages",
    "epic",
    { c1: "#3b82f6", c2: "#1e3a8a", c3: "#93c5fd", stroke: "#60a5fa" },
    "pulse",
  ),
  generateAnimatedCrown(
    "vulcan_forge_crown",
    "Couronne de Vulcain",
    "epic",
    { c1: "#c2410c", c2: "#431407", c3: "#fdba74", stroke: "#ea580c" },
    "pulse",
  ),
  generateAnimatedCrown(
    "nebula_queen_tiara",
    "Tiare de la Reine des Nébuleuses",
    "epic",
    { c1: "#d946ef", c2: "#4a044e", c3: "#f5d0fe", stroke: "#e879f9" },
    "pulse",
  ),
  generateAnimatedCrown(
    "iron_bastion_diadem",
    "Diadème du Bastion de Fer",
    "epic",
    { c1: "#475569", c2: "#0f172a", c3: "#cbd5e1", stroke: "#94a3b8" },
    "pulse",
  ),
  generateAnimatedCrown(
    "emerald_archdruid",
    "Couronne de l'Archidruide",
    "epic",
    { c1: "#059669", c2: "#064e3b", c3: "#6ee7b7", stroke: "#10b981" },
    "pulse",
  ),
  generateAnimatedCrown(
    "gold_valkyrie_wings",
    "Ailes d'Or des Valkyries",
    "epic",
    { c1: "#eab308", c2: "#713f12", c3: "#fef08a", stroke: "#facc15" },
    "pulse",
  ),

  // 5 Rares
  generateAnimatedCrown(
    "phantom_assassin_cowl",
    "Couronne de l'Assassin Spectral",
    "rare",
    { c1: "#64748b", c2: "#1e293b", c3: "#e2e8f0", stroke: "#94a3b8" },
    "pulse",
  ),
  generateAnimatedCrown(
    "toxic_viper_crown",
    "Couronne de la Vipère Toxique",
    "rare",
    { c1: "#65a30d", c2: "#1a2e05", c3: "#bef264", stroke: "#84cc16" },
    "pulse",
  ),
  generateAnimatedCrown(
    "blood_vampire_circlet",
    "Diadème Écarlate Sanguin",
    "rare",
    { c1: "#b91c1c", c2: "#450a0a", c3: "#fca5a5", stroke: "#ef4444" },
    "pulse",
  ),
  generateAnimatedCrown(
    "glacier_shard_crest",
    "Cimier d'Éclat Glaciaire",
    "rare",
    { c1: "#0284c7", c2: "#0c4a6e", c3: "#7dd3fc", stroke: "#38bdf8" },
    "pulse",
  ),
  generateAnimatedCrown(
    "desert_sultan_crown",
    "Couronne du Sultan des Dunes",
    "rare",
    { c1: "#d97706", c2: "#451a03", c3: "#fde68a", stroke: "#fbbf24" },
    "pulse",
  ),

  // 4 Uncommons
  generateAnimatedCrown(
    "scout_bronze_circlet",
    "Cercle de Bronze d'Éclaireur",
    "uncommon",
    { c1: "#b45309", c2: "#78350f", c3: "#fcd34d", stroke: "#d97706" },
    "pulse",
  ),
  generateAnimatedCrown(
    "steel_legionnaire_crest",
    "Cimier du Légionnaire d'Acier",
    "uncommon",
    { c1: "#475569", c2: "#1e293b", c3: "#cbd5e1", stroke: "#64748b" },
    "pulse",
  ),
  generateAnimatedCrown(
    "sapphire_officer",
    "Diadème de l'Officier Saphir",
    "uncommon",
    { c1: "#2563eb", c2: "#1e3a8a", c3: "#93c5fd", stroke: "#3b82f6" },
    "pulse",
  ),
  generateAnimatedCrown(
    "copper_vanguard",
    "Couronne de Cuivre de l'Avant-Garde",
    "uncommon",
    { c1: "#c2410c", c2: "#7c2d12", c3: "#fdba74", stroke: "#ea580c" },
    "pulse",
  ),
];

// Helper to generate animated Flags
function generateAnimatedFlag(name, label, rarity, colors, shape) {
  return {
    name,
    label,
    rarity,
    bg: colors.bg,
    accent: colors.accent,
    emblemColor: colors.emblemColor,
    shape,
  };
}

// 25 New Faction Flags
const extraFlags = [
  // 10 Legendaries
  generateAnimatedFlag(
    "stellar_imperium",
    "Imperium Stellaire",
    "legendary",
    { bg: "#030712", accent: "#fbbf24", emblemColor: "#38bdf8" },
    "star",
  ),
  generateAnimatedFlag(
    "hyper_void_dominion",
    "Dominion du Néant Absolu",
    "legendary",
    { bg: "#0f0728", accent: "#c084fc", emblemColor: "#f43f5e" },
    "hex",
  ),
  generateAnimatedFlag(
    "celestial_valkyries",
    "Légion Céleste",
    "legendary",
    { bg: "#1e1b4b", accent: "#fde047", emblemColor: "#ffffff" },
    "eagle",
  ),
  generateAnimatedFlag(
    "solar_sovereignty",
    "Souveraineté Phénix",
    "legendary",
    { bg: "#431407", accent: "#ea580c", emblemColor: "#fde047" },
    "sun",
  ),
  generateAnimatedFlag(
    "quantum_vanguard",
    "Avant-Garde Quantique",
    "legendary",
    { bg: "#022c22", accent: "#22d3ee", emblemColor: "#34d399" },
    "diamond",
  ),
  generateAnimatedFlag(
    "apocalypse_legion",
    "Légion de l'Apocalypse",
    "legendary",
    { bg: "#260505", accent: "#f43f5e", emblemColor: "#ffffff" },
    "cross",
  ),
  generateAnimatedFlag(
    "archangel_crusade",
    "Croisade des Archanges",
    "legendary",
    { bg: "#1c1917", accent: "#fbbf24", emblemColor: "#e0f2fe" },
    "shield",
  ),
  generateAnimatedFlag(
    "cyber_dynasty",
    "Dynastie Cybernétique",
    "legendary",
    { bg: "#030712", accent: "#06b6d4", emblemColor: "#ec4899" },
    "chevron",
  ),
  generateAnimatedFlag(
    "abyssal_leviathan",
    "Pacte du Léviathan",
    "legendary",
    { bg: "#021c24", accent: "#14b8a6", emblemColor: "#67e8f9" },
    "hex",
  ),
  generateAnimatedFlag(
    "omega_order",
    "Ordre Souverain Oméga",
    "legendary",
    { bg: "#090d16", accent: "#f59e0b", emblemColor: "#a855f7" },
    "star",
  ),

  // 6 Epics
  generateAnimatedFlag(
    "vulcan_syndicate",
    "Syndicat de Vulcain",
    "epic",
    { bg: "#2a0a05", accent: "#f97316", emblemColor: "#fde047" },
    "hex",
  ),
  generateAnimatedFlag(
    "aurora_covenant",
    "Pacte Boréal",
    "epic",
    { bg: "#082f49", accent: "#38bdf8", emblemColor: "#a7f3d0" },
    "diamond",
  ),
  generateAnimatedFlag(
    "crimson_vanguard",
    "Avant-Garde Pourpre",
    "epic",
    { bg: "#3f0713", accent: "#f43f5e", emblemColor: "#fecdd3" },
    "chevron",
  ),
  generateAnimatedFlag(
    "storm_federation",
    "Fédération des Tempêtes",
    "epic",
    { bg: "#0f172a", accent: "#60a5fa", emblemColor: "#ffffff" },
    "cross",
  ),
  generateAnimatedFlag(
    "emerald_dominion",
    "Dominion d'Émeraude",
    "epic",
    { bg: "#064e3b", accent: "#10b981", emblemColor: "#d1fae5" },
    "shield",
  ),
  generateAnimatedFlag(
    "obsidian_phantom",
    "Ordre de l'Obsidienne",
    "epic",
    { bg: "#09090b", accent: "#71717a", emblemColor: "#e4e4e7" },
    "eagle",
  ),

  // 5 Rares
  generateAnimatedFlag(
    "desert_nomads",
    "Union des Nomades",
    "rare",
    { bg: "#451a03", accent: "#d97706", emblemColor: "#fef3c7" },
    "sun",
  ),
  generateAnimatedFlag(
    "glacier_front",
    "Front des Glaciers",
    "rare",
    { bg: "#0c4a6e", accent: "#0284c7", emblemColor: "#e0f2fe" },
    "shield",
  ),
  generateAnimatedFlag(
    "toxic_rebellion",
    "Front Bio-Rebelle",
    "rare",
    { bg: "#14532d", accent: "#84cc16", emblemColor: "#d9f99d" },
    "diamond",
  ),
  generateAnimatedFlag(
    "plasma_syndicate",
    "Syndicat Plasma",
    "rare",
    { bg: "#4c0519", accent: "#db2777", emblemColor: "#fbcfe8" },
    "chevron",
  ),
  generateAnimatedFlag(
    "iron_coalition",
    "Coalition du Fer",
    "rare",
    { bg: "#1e293b", accent: "#64748b", emblemColor: "#f1f5f9" },
    "cross",
  ),

  // 4 Uncommons
  generateAnimatedFlag(
    "frontier_scouts",
    "Éclaireurs de Frontière",
    "uncommon",
    { bg: "#1c1917", accent: "#78716c", emblemColor: "#e7e5e4" },
    "chevron",
  ),
  generateAnimatedFlag(
    "coastal_guard",
    "Garde Côtière",
    "uncommon",
    { bg: "#172554", accent: "#3b82f6", emblemColor: "#bfdbfe" },
    "shield",
  ),
  generateAnimatedFlag(
    "militia_corps",
    "Corps des Milices",
    "uncommon",
    { bg: "#1e1b4b", accent: "#6366f1", emblemColor: "#c7d2fe" },
    "diamond",
  ),
  generateAnimatedFlag(
    "dust_patrol",
    "Patrouille des Sables",
    "uncommon",
    { bg: "#292524", accent: "#b45309", emblemColor: "#fed7aa" },
    "star",
  ),
];

// 30 New Procedural Patterns
const extraPatterns = [
  // 10 Legendaries
  {
    name: "hypercube_tesseract",
    label: "Tesseract Hypercube",
    rarity: "legendary",
    fn: "(x, y) => { const dx = Math.abs(x - 7.5); const dy = Math.abs(y - 7.5); return (dx <= 5 && dy <= 5 && (dx === 5 || dy === 5)) || (dx <= 2 && dy <= 2 && (dx === 2 || dy === 2)) || Math.abs(dx - dy) < 0.8; }",
  },
  {
    name: "supernova_blast",
    label: "Souffle de Supernova",
    rarity: "legendary",
    fn: "(x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); const a = Math.atan2(y - 7.5, x - 7.5); return d < 2.0 || Math.sin(a * 10 - d * 0.8) > 0.45; }",
  },
  {
    name: "chono_warp_weave",
    label: "Tissage Chrono-Warp",
    rarity: "legendary",
    fn: "(x, y) => Math.sin(x * 0.9 + y * 0.4) * Math.cos(x * 0.4 - y * 0.9) > 0.25",
  },
  {
    name: "quantum_fractal_tree",
    label: "Arbre Fractal Quantique",
    rarity: "legendary",
    fn: "(x, y) => ((x ^ y) % 5 === 0) || ((x + y * 3) % 7 === 0)",
  },
  {
    name: "seraph_sacred_wings",
    label: "Ailes Séraphiques Sacrées",
    rarity: "legendary",
    fn: "(x, y) => { const dx = Math.abs(x - 7.5); return (dx < 1.2 && y >= 1) || Math.abs(y - (14 - dx * 1.2)) < 1.2 || (dx >= 3 && Math.abs(y - (10 - dx * 0.8)) < 1.0); }",
  },
  {
    name: "singularity_accretion",
    label: "Disque d'Accrétion",
    rarity: "legendary",
    fn: "(x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return (d >= 2 && d <= 3.2) || (d >= 4.5 && d <= 5.8) || (d >= 6.8 && d <= 7.4); }",
  },
  {
    name: "omega_monolith_seal",
    label: "Sceau du Monolithe Oméga",
    rarity: "legendary",
    fn: "(x, y) => { const dx = Math.abs(x - 7.5); return (dx <= 3 && y >= 3 && y <= 13) || (dx <= 6 && (y === 3 || y === 13)) || (dx === 6 && y >= 6 && y <= 10); }",
  },
  {
    name: "valkyrie_runic_ring",
    label: "Rune Runique Valkyrie",
    rarity: "legendary",
    fn: "(x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); const a = Math.atan2(y - 7.5, x - 7.5); return Math.abs(d - 5) < 1.2 && Math.cos(a * 8) > 0.1; }",
  },
  {
    name: "stellar_constellation",
    label: "Constellation Cosmique",
    rarity: "legendary",
    fn: "(x, y) => (x % 4 === 1 && y % 4 === 1) || (Math.abs(x - y) === 3) || (x + y === 15)",
  },
  {
    name: "apex_predator_scales",
    label: "Écailles du Prédateur Apex",
    rarity: "legendary",
    fn: "(x, y) => { const u = (x + (y % 2) * 2) % 4; return u === 1 || u === 2; }",
  },

  // 10 Epics
  {
    name: "plasma_lightning_grid",
    label: "Éclairs de Plasma",
    rarity: "epic",
    fn: "(x, y) => ((x * 3 + y * 7) % 11 < 3) || (Math.abs(x - 7.5) === Math.abs(y - 7.5))",
  },
  {
    name: "tachyon_circuit",
    label: "Circuit Tachyon",
    rarity: "epic",
    fn: "(x, y) => (x % 3 === 0 && y % 2 === 0) || (y % 6 === 0 && x >= 4 && x <= 12)",
  },
  {
    name: "hex_honeycomb_pulse",
    label: "Ruche Cybernétique",
    rarity: "epic",
    fn: "(x, y) => ((x + (y >> 1)) % 3 === 0 && y % 2 === 0) || (x % 3 === 0 && y % 2 === 1)",
  },
  {
    name: "vortex_maelstrom",
    label: "Maelström Océanique",
    rarity: "epic",
    fn: "(x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return Math.sin(d * 1.5 + Math.atan2(y - 7.5, x - 7.5) * 3) > 0.35; }",
  },
  {
    name: "titan_armor_plates",
    label: "Blindage Titan",
    rarity: "epic",
    fn: "(x, y) => x === 0 || y === 0 || x === 8 || y === 8 || (x + y) % 6 === 0",
  },
  {
    name: "solar_flare_loops",
    label: "Boucles Coronales",
    rarity: "epic",
    fn: "(x, y) => { const dx = x - 7.5; const dy = y - 7.5; return Math.abs(dx * dx + dy * dy - 25) < 7 && Math.abs(dx) > 1; }",
  },
  {
    name: "void_interference",
    label: "Interférence du Néant",
    rarity: "epic",
    fn: "(x, y) => ((x * y) % 9 < 3) || ((x + y) % 7 === 0)",
  },
  {
    name: "bio_matrix_mesh",
    label: "Treillis Bio-Matrice",
    rarity: "epic",
    fn: "(x, y) => (x % 4 === 0 && y % 2 === 0) || (x % 2 === 0 && y % 4 === 0)",
  },
  {
    name: "cyber_hazard_cross",
    label: "Croix de Danger Cyber",
    rarity: "epic",
    fn: "(x, y) => { const dx = Math.abs(x - 7.5); const dy = Math.abs(y - 7.5); return (dx <= 6 && dy <= 2) || (dy <= 6 && dx <= 2); }",
  },
  {
    name: "emp_core_rings",
    label: "Noyau IEM Résonant",
    rarity: "epic",
    fn: "(x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); return Math.floor(d) === 2 || Math.floor(d) === 4 || Math.floor(d) === 6; }",
  },

  // 10 Rares
  {
    name: "radar_sweep_lines",
    label: "Balayage Radar",
    rarity: "rare",
    fn: "(x, y) => { const a = Math.atan2(y - 7.5, x - 7.5); return Math.abs(a - 0.7) < 0.25 || Math.hypot(x - 7.5, y - 7.5) === 5; }",
  },
  {
    name: "artillery_crosshairs",
    label: "Réticule d'Artillerie",
    rarity: "rare",
    fn: "(x, y) => x === 7 || y === 7 || Math.abs(Math.hypot(x - 7.5, y - 7.5) - 4) < 0.9",
  },
  {
    name: "tactical_camo_digital",
    label: "Camouflage Digital",
    rarity: "rare",
    fn: "(x, y) => ((x >> 1) + (y >> 1)) % 3 === 0 || (x % 5 === 0 && y % 3 === 0)",
  },
  {
    name: "reinforced_bulkhead",
    label: "Cloison Cuirassée",
    rarity: "rare",
    fn: "(x, y) => x === 3 || x === 12 || y === 3 || y === 12 || (x >= 4 && x <= 11 && y >= 4 && y <= 11 && (x === y || x === 15 - y))",
  },
  {
    name: "supply_depot_grid",
    label: "Grille Logistique",
    rarity: "rare",
    fn: "(x, y) => (x % 3 === 0 || y % 3 === 0) && !((x % 6 === 0 && y % 6 === 0))",
  },
  {
    name: "energy_shield_lattice",
    label: "Réseau de Bouclier",
    rarity: "rare",
    fn: "(x, y) => (Math.abs(x - y) % 4 === 0) || ((x + y) % 4 === 0)",
  },
  {
    name: "desert_sand_ripples",
    label: "Rides de Sable",
    rarity: "rare",
    fn: "(x, y) => Math.sin(x * 0.6 + Math.sin(y * 0.4) * 1.5) > 0.3",
  },
  {
    name: "arctic_ice_cracks",
    label: "Fractures de Banquise",
    rarity: "rare",
    fn: "(x, y) => (x * 2 + y * 3) % 7 === 1 || (x * 3 - y * 2) % 8 === 2",
  },
  {
    name: "naval_anchor_pattern",
    label: "Motif d'Ancre Marine",
    rarity: "rare",
    fn: "(x, y) => (x === 7 && y >= 3 && y <= 12) || (y === 11 && Math.abs(x - 7.5) <= 4) || (y === 5 && Math.abs(x - 7.5) <= 3)",
  },
  {
    name: "command_diamond_chevron",
    label: "Chevrons de Commandement",
    rarity: "rare",
    fn: "(x, y) => { const dx = Math.abs(x - 7.5); return Math.abs(y - dx) < 1.1 || Math.abs(y - (dx + 4)) < 1.1; }",
  },
];

// 25 New Effects across transportShipTrail, nukeTrail, nukeExplosion, structures, warship
const extraEffects = [
  // 5 transportShipTrail
  {
    label: "Sillage Nova Lumineux",
    effectType: "transportShipTrail",
    name: "nova_lumina_wake",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    attrs: {
      type: "gradient",
      colors: ["#fbbf24", "#f43f5e", "#a855f7", "#ffffff"],
      colorSize: 4,
      movementSpeed: 16,
    },
  },
  {
    label: "Sillage Tempête IEM",
    effectType: "transportShipTrail",
    name: "emp_storm_wake",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3500,
    attrs: {
      type: "gradient",
      colors: ["#38bdf8", "#818cf8", "#c084fc"],
      colorSize: 5,
      movementSpeed: 14,
    },
  },
  {
    label: "Sillage Brasier Magmatique",
    effectType: "transportShipTrail",
    name: "magma_blaze_wake",
    rarity: "epic",
    priceHard: 380,
    priceSoft: 3200,
    attrs: {
      type: "gradient",
      colors: ["#ea580c", "#dc2626", "#fef08a"],
      colorSize: 5,
      movementSpeed: 11,
    },
  },
  {
    label: "Sillage Bio-Corrosion",
    effectType: "transportShipTrail",
    name: "bio_corrosion_wake",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    attrs: {
      type: "transition",
      colors: ["#84cc16", "#15803d", "#a3e635"],
      frequency: 3.5,
    },
  },
  {
    label: "Sillage Furtif Ombre",
    effectType: "transportShipTrail",
    name: "stealth_shadow_wake",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    attrs: {
      type: "gradient",
      colors: ["#0f172a", "#334155", "#64748b"],
      colorSize: 6,
      movementSpeed: 8,
    },
  },

  // 5 nukeTrail
  {
    label: "Traînée Rayonnement Oméga",
    effectType: "nukeTrail",
    name: "omega_radiation_nuke_trail",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    attrs: {
      type: "gradient",
      colors: ["#fbbf24", "#22d3ee", "#c084fc", "#ffffff"],
      colorSize: 3,
      movementSpeed: 18,
    },
  },
  {
    label: "Traînée Feu de l'Enfer",
    effectType: "nukeTrail",
    name: "hellfire_nuke_trail",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    attrs: {
      type: "gradient",
      colors: ["#dc2626", "#f97316", "#fef08a"],
      colorSize: 4,
      movementSpeed: 15,
    },
  },
  {
    label: "Traînée Foudre d'Arc",
    effectType: "nukeTrail",
    name: "arc_lightning_trail",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3400,
    attrs: {
      type: "transition",
      colors: ["#38bdf8", "#e0f2fe", "#818cf8"],
      frequency: 5.0,
    },
  },
  {
    label: "Traînée Émeraude Fission",
    effectType: "nukeTrail",
    name: "fission_emerald_trail",
    rarity: "rare",
    priceHard: 290,
    priceSoft: 2500,
    attrs: {
      type: "gradient",
      colors: ["#10b981", "#059669", "#6ee7b7"],
      colorSize: 5,
      movementSpeed: 12,
    },
  },
  {
    label: "Traînée Cryo-Comète",
    effectType: "nukeTrail",
    name: "cryo_comet_trail",
    rarity: "rare",
    priceHard: 290,
    priceSoft: 2500,
    attrs: {
      type: "gradient",
      colors: ["#0284c7", "#38bdf8", "#ffffff"],
      colorSize: 5,
      movementSpeed: 12,
    },
  },

  // 5 nukeExplosion
  {
    label: "Dôme Anti-Matière",
    effectType: "nukeExplosion",
    name: "antimatter_blast",
    rarity: "legendary",
    priceHard: 750,
    priceSoft: 6500,
    attrs: {
      type: "gradient",
      colors: ["#030712", "#a855f7", "#ec4899", "#ffffff"],
      colorSize: 3,
      movementSpeed: 20,
    },
  },
  {
    label: "Éruption Stellaire Dorée",
    effectType: "nukeExplosion",
    name: "golden_stellar_eruption",
    rarity: "legendary",
    priceHard: 750,
    priceSoft: 6500,
    attrs: {
      type: "gradient",
      colors: ["#f59e0b", "#fde047", "#ffffff"],
      colorSize: 4,
      movementSpeed: 18,
    },
  },
  {
    label: "Cataclysme Toxique",
    effectType: "nukeExplosion",
    name: "toxic_cataclysm_blast",
    rarity: "epic",
    priceHard: 450,
    priceSoft: 3900,
    attrs: {
      type: "gradient",
      colors: ["#65a30d", "#14532d", "#d9f99d"],
      colorSize: 4,
      movementSpeed: 14,
    },
  },
  {
    label: "Souffle Cyan IEM",
    effectType: "nukeExplosion",
    name: "cyan_emp_blast",
    rarity: "epic",
    priceHard: 450,
    priceSoft: 3900,
    attrs: {
      type: "gradient",
      colors: ["#06b6d4", "#082f49", "#67e8f9"],
      colorSize: 4,
      movementSpeed: 16,
    },
  },
  {
    label: "Vague Cryo-Fractale",
    effectType: "nukeExplosion",
    name: "cryo_fracture_blast",
    rarity: "rare",
    priceHard: 320,
    priceSoft: 2800,
    attrs: {
      type: "transition",
      colors: ["#e0f2fe", "#38bdf8", "#0284c7"],
      frequency: 4.0,
    },
  },

  // 5 structures
  {
    label: "Aura Suprême BorderConflict",
    effectType: "structures",
    name: "borderconflict_supreme_aura",
    rarity: "legendary",
    priceHard: 700,
    priceSoft: 6200,
    attrs: {
      type: "gradient",
      colors: ["#22d3ee", "#fbbf24", "#f43f5e", "#a855f7"],
      colorSize: 3,
      movementSpeed: 12,
    },
  },
  {
    label: "Blindage Électro-Magnétique",
    effectType: "structures",
    name: "em_shield_grid",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    attrs: {
      type: "gradient",
      colors: ["#60a5fa", "#3b82f6", "#93c5fd"],
      colorSize: 4,
      movementSpeed: 10,
    },
  },
  {
    label: "Dôme de Force Magma",
    effectType: "structures",
    name: "magma_force_dome",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3400,
    attrs: {
      type: "gradient",
      colors: ["#ea580c", "#dc2626", "#fef08a"],
      colorSize: 4,
      movementSpeed: 9,
    },
  },
  {
    label: "Réseau Sentinelle Émeraude",
    effectType: "structures",
    name: "emerald_sentinel_grid",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    attrs: {
      type: "transition",
      colors: ["#10b981", "#34d399", "#059669"],
      frequency: 3.0,
    },
  },
  {
    label: "Défense Cryo-Renforcée",
    effectType: "structures",
    name: "cryo_reinforced_hull",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    attrs: {
      type: "gradient",
      colors: ["#0284c7", "#e0f2fe", "#38bdf8"],
      colorSize: 5,
      movementSpeed: 8,
    },
  },

  // 5 warship
  {
    label: "Blindage Flotte Céleste",
    effectType: "warship",
    name: "celestial_fleet_armor",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    attrs: {
      type: "gradient",
      colors: ["#fbbf24", "#38bdf8", "#ffffff"],
      colorSize: 3,
      movementSpeed: 14,
    },
  },
  {
    label: "Cuirassé du Néant",
    effectType: "warship",
    name: "void_dreadnought_hull",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    attrs: {
      type: "gradient",
      colors: ["#2e1065", "#c084fc", "#f472b6"],
      colorSize: 4,
      movementSpeed: 10,
    },
  },
  {
    label: "Coque Cyber-Plasma",
    effectType: "warship",
    name: "cyber_plasma_hull",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3500,
    attrs: {
      type: "gradient",
      colors: ["#06b6d4", "#22d3ee", "#818cf8"],
      colorSize: 4,
      movementSpeed: 11,
    },
  },
  {
    label: "Cuirasse Sang de Dragon",
    effectType: "warship",
    name: "dragon_blood_hull",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    attrs: {
      type: "gradient",
      colors: ["#991b1b", "#ef4444", "#fca5a5"],
      colorSize: 5,
      movementSpeed: 9,
    },
  },
  {
    label: "Camouflage Furtif Naval",
    effectType: "warship",
    name: "stealth_naval_hull",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    attrs: {
      type: "transition",
      colors: ["#1e293b", "#334155", "#475569"],
      frequency: 2.0,
    },
  },
];

console.log("Writing integration script output...");
fs.writeFileSync(
  "scripts/cosmetics_generated.json",
  JSON.stringify(
    {
      extraCrowns,
      extraFlags,
      extraPatterns,
      extraEffects,
    },
    null,
    2,
  ),
);

console.log(
  `Generated: ${extraCrowns.length} crowns, ${extraFlags.length} flags, ${extraPatterns.length} patterns, ${extraEffects.length} effects = ${extraCrowns.length + extraFlags.length + extraPatterns.length + extraEffects.length} total new cosmetics!`,
);
