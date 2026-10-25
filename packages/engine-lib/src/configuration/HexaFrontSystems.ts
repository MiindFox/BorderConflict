import { simpleHash } from "../Util";

// ============================================================================
// 1. DOCTRINES TACTIQUES (TALENT TREE & ACCOUNT PROGRESSION)
// ============================================================================

export type DoctrineBranchId =
  | "assault"
  | "fortress"
  | "economy"
  | "apocalypse";

export type TalentId =
  | "assault_pioneer"
  | "assault_blitz"
  | "assault_plunder"
  | "assault_logistics"
  | "fortress_engineer"
  | "fortress_bastion"
  | "fortress_aegis"
  | "fortress_radar"
  | "eco_trade"
  | "eco_metropolis"
  | "eco_industry"
  | "eco_treasury"
  | "apoc_armada"
  | "apoc_silo"
  | "apoc_fallout"
  | "apoc_overcharge";

export interface TalentDefinition {
  id: TalentId;
  bitOffset: number; // 2 bits per talent (0..30)
  branch: DoctrineBranchId;
  tier: 1 | 2 | 3 | 4;
  maxRank: 3;
  prerequisite?: TalentId;
  name: string;
  icon: string;
  shortDesc: string;
  rankDescriptions: [string, string, string];
}

export interface DoctrineBranchInfo {
  id: DoctrineBranchId;
  name: string;
  subtitle: string;
  color: string;
  accentHex: string;
  icon: string;
}

export const DOCTRINE_BRANCHES: DoctrineBranchInfo[] = [
  {
    id: "assault",
    name: "Assaut Éclair",
    subtitle: "Conquête rapide, choc blindé & pillage",
    color: "from-rose-500 to-orange-500",
    accentHex: "#f43f5e",
    icon: "⚔️",
  },
  {
    id: "fortress",
    name: "Forteresse",
    subtitle: "Bastions imprenables, défense anti-missiles & réserve",
    color: "from-cyan-400 to-blue-600",
    accentHex: "#06b6d4",
    icon: "🛡️",
  },
  {
    id: "economy",
    name: "Hégémonie",
    subtitle: "Empire commercial, métropoles & industrie lourde",
    color: "from-amber-400 to-yellow-600",
    accentHex: "#f59e0b",
    icon: "💰",
  },
  {
    id: "apocalypse",
    name: "Apocalypse",
    subtitle: "Suprématie navale, frappe atomique & guerre radiale",
    color: "from-purple-500 to-indigo-600",
    accentHex: "#a855f7",
    icon: "☢️",
  },
];

export const TALENT_DEFINITIONS: TalentDefinition[] = [
  // --- BRANCH 1: ASSAULT ---
  {
    id: "assault_pioneer",
    bitOffset: 0,
    branch: "assault",
    tier: 1,
    maxRank: 3,
    name: "Éclaireurs de Front",
    icon: "🚩",
    shortDesc:
      "Micro-bonus : réduit légèrement les pertes sur terres neutres et augmente les troupes initiales.",
    rankDescriptions: [
      "-2% pertes (Terres Neutres), +2% troupes au départ",
      "-4% pertes (Terres Neutres), +4% troupes au départ",
      "-6% pertes (Terres Neutres), +6% troupes au départ",
    ],
  },
  {
    id: "assault_blitz",
    bitOffset: 2,
    branch: "assault",
    tier: 2,
    maxRank: 3,
    prerequisite: "assault_pioneer",
    name: "Percée Blindée",
    icon: "⚡",
    shortDesc:
      "Micro-bonus : accélère légèrement la vitesse de conquête terrestre.",
    rankDescriptions: [
      "+1.5% vitesse d'avancée terrestre",
      "+3% vitesse d'avancée terrestre",
      "+4.5% vitesse d'avancée terrestre",
    ],
  },
  {
    id: "assault_plunder",
    bitOffset: 4,
    branch: "assault",
    tier: 3,
    maxRank: 3,
    prerequisite: "assault_blitz",
    name: "Butin de Conquête",
    icon: "👑",
    shortDesc:
      "Micro-bonus : augmente légèrement l'Or pillé et réduit les pertes d'assaut.",
    rankDescriptions: [
      "+3% Or de conquête, -1% pertes d'attaque",
      "+6% Or de conquête, -2% pertes d'attaque",
      "+9% Or de conquête, -3% pertes d'attaque",
    ],
  },
  {
    id: "assault_logistics",
    bitOffset: 24,
    branch: "assault",
    tier: 4,
    maxRank: 3,
    prerequisite: "assault_plunder",
    name: "Logistique Mécanisée",
    icon: "🚚",
    shortDesc:
      "Micro-bonus : réduit légèrement les pertes d'attrition lors des grands mouvements de troupes.",
    rankDescriptions: [
      "-1% attrition de déplacement, +0.5% vitesse renforts",
      "-2% attrition de déplacement, +1% vitesse renforts",
      "-3% attrition de déplacement, +1.5% vitesse renforts",
    ],
  },

  // --- BRANCH 2: FORTRESS ---
  {
    id: "fortress_engineer",
    bitOffset: 6,
    branch: "fortress",
    tier: 1,
    maxRank: 3,
    name: "Génie Fortifié",
    icon: "🧱",
    shortDesc: "Micro-bonus : réduit légèrement le coût des Postes de Défense.",
    rankDescriptions: [
      "-2% coût en Or des Postes de Défense",
      "-4% coût en Or des Postes de Défense",
      "-6% coût en Or des Postes de Défense",
    ],
  },
  {
    id: "fortress_bastion",
    bitOffset: 8,
    branch: "fortress",
    tier: 2,
    maxRank: 3,
    prerequisite: "fortress_engineer",
    name: "Ligne Bastion",
    icon: "🏰",
    shortDesc:
      "Micro-bonus : renforce légèrement l'efficacité des Postes de Défense.",
    rankDescriptions: [
      "+2% efficacité des Postes de Défense",
      "+4% efficacité des Postes de Défense",
      "+6% efficacité des Postes de Défense",
    ],
  },
  {
    id: "fortress_aegis",
    bitOffset: 10,
    branch: "fortress",
    tier: 3,
    maxRank: 3,
    prerequisite: "fortress_bastion",
    name: "Bouclier Égide",
    icon: "📡",
    shortDesc:
      "Micro-bonus : accélère légèrement le rechargement SAM et la régénération.",
    rankDescriptions: [
      "-2% recharge SAM, +1.5% régénération de troupes",
      "-4% recharge SAM, +3% régénération de troupes",
      "-6% recharge SAM, +4.5% régénération de troupes",
    ],
  },
  {
    id: "fortress_radar",
    bitOffset: 26,
    branch: "fortress",
    tier: 4,
    maxRank: 3,
    prerequisite: "fortress_aegis",
    name: "Réseau Radar d'Alerte",
    icon: "📡",
    shortDesc:
      "Micro-bonus : accroît légèrement la vision radar et la portée d'interception SAM.",
    rankDescriptions: [
      "+1% vision radar, +1% portée d'interception SAM",
      "+2% vision radar, +2% portée d'interception SAM",
      "+3% vision radar, +3% portée d'interception SAM",
    ],
  },

  // --- BRANCH 3: ECONOMY ---
  {
    id: "eco_trade",
    bitOffset: 12,
    branch: "economy",
    tier: 1,
    maxRank: 3,
    name: "Routes Commerciales",
    icon: "🚢",
    shortDesc:
      "Micro-bonus : augmente légèrement les revenus marchands et l'Or de départ.",
    rankDescriptions: [
      "+2% Or commercial (Navires/Trains), +2 500 Or initial",
      "+4% Or commercial (Navires/Trains), +5 000 Or initial",
      "+6% Or commercial (Navires/Trains), +7 500 Or initial",
    ],
  },
  {
    id: "eco_metropolis",
    bitOffset: 14,
    branch: "economy",
    tier: 2,
    maxRank: 3,
    prerequisite: "eco_trade",
    name: "Mégapoles",
    icon: "🏙️",
    shortDesc:
      "Micro-bonus : augmente légèrement la capacité de troupes par Ville.",
    rankDescriptions: [
      "+2% capacité de troupes par Ville (+255k/niv)",
      "+4% capacité de troupes par Ville (+260k/niv)",
      "+6% capacité de troupes par Ville (+265k/niv)",
    ],
  },
  {
    id: "eco_industry",
    bitOffset: 16,
    branch: "economy",
    tier: 3,
    maxRank: 3,
    prerequisite: "eco_metropolis",
    name: "Complexe Industriel",
    icon: "🏭",
    shortDesc:
      "Micro-bonus : réduit légèrement le coût des Villes/Ports/Usines et booste l'Or passif.",
    rankDescriptions: [
      "-1.5% coût (Villes/Ports/Usines), +2% Or passif",
      "-3% coût (Villes/Ports/Usines), +4% Or passif",
      "-4.5% coût (Villes/Ports/Usines), +6% Or passif",
    ],
  },
  {
    id: "eco_treasury",
    bitOffset: 28,
    branch: "economy",
    tier: 4,
    maxRank: 3,
    prerequisite: "eco_industry",
    name: "Chambre du Trésor",
    icon: "🏦",
    shortDesc:
      "Micro-bonus : génère un intérêt passif minime sur les réserves d'Or et allège les coûts de transport.",
    rankDescriptions: [
      "+0.5% intérêt passif Or, -1% coût des convois",
      "+1% intérêt passif Or, -2% coût des convois",
      "+1.5% intérêt passif Or, -3% coût des convois",
    ],
  },

  // --- BRANCH 4: APOCALYPSE ---
  {
    id: "apoc_armada",
    bitOffset: 18,
    branch: "apocalypse",
    tier: 1,
    maxRank: 3,
    name: "Amirauté Cuirassée",
    icon: "⚓",
    shortDesc:
      "Micro-bonus : réduit légèrement le coût des Navires de Guerre et augmente leur portée.",
    rankDescriptions: [
      "-2% coût Navires de Guerre, +1.5% portée navale",
      "-4% coût Navires de Guerre, +3% portée navale",
      "-6% coût Navires de Guerre, +4.5% portée navale",
    ],
  },
  {
    id: "apoc_silo",
    bitOffset: 20,
    branch: "apocalypse",
    tier: 2,
    maxRank: 3,
    prerequisite: "apoc_armada",
    name: "Enrichissement Rapide",
    icon: "🚀",
    shortDesc:
      "Micro-bonus : réduit légèrement le coût et le rechargement des Silos/Bombes.",
    rankDescriptions: [
      "-1.5% coût Silos & Bombes A/H, -2% recharge Silo",
      "-3% coût Silos & Bombes A/H, -4% recharge Silo",
      "-4.5% coût Silos & Bombes A/H, -6% recharge Silo",
    ],
  },
  {
    id: "apoc_fallout",
    bitOffset: 22,
    branch: "apocalypse",
    tier: 3,
    maxRank: 3,
    prerequisite: "apoc_silo",
    name: "Divisions Rad-Blindées",
    icon: "☣️",
    shortDesc:
      "Micro-bonus : réduit légèrement la pénalité de radiation et accélère les missiles.",
    rankDescriptions: [
      "-3% pénalité de radiation, +2% vitesse missiles",
      "-6% pénalité de radiation, +4% vitesse missiles",
      "-9% pénalité de radiation, +6% vitesse missiles",
    ],
  },
  {
    id: "apoc_overcharge",
    bitOffset: 30,
    branch: "apocalypse",
    tier: 4,
    maxRank: 3,
    prerequisite: "apoc_fallout",
    name: "Surchauffe Atomique",
    icon: "⚡",
    shortDesc:
      "Micro-bonus : réduit légèrement le temps de vol des missiles et augmente la zone de blast.",
    rankDescriptions: [
      "-1% temps de vol des missiles, +1% rayon de souffle",
      "-2% temps de vol des missiles, +2% rayon de souffle",
      "-3% temps de vol des missiles, +3% rayon de souffle",
    ],
  },
];

export function getTalentRankFromMask(
  mask: number,
  talentId: TalentId,
): number {
  const def = TALENT_DEFINITIONS.find((t) => t.id === talentId);
  if (!def) return 0;
  return (mask >>> def.bitOffset) & 0b11;
}

export function setTalentRankInMask(
  mask: number,
  talentId: TalentId,
  rank: number,
): number {
  const def = TALENT_DEFINITIONS.find((t) => t.id === talentId);
  if (!def) return mask;
  const clamped = Math.max(0, Math.min(3, Math.floor(rank)));
  const cleared = mask & ~(0b11 << def.bitOffset);
  return cleared | (clamped << def.bitOffset);
}

export function getTotalSpentPointsInMask(mask: number): number {
  let total = 0;
  for (const def of TALENT_DEFINITIONS) {
    total += (mask >>> def.bitOffset) & 0b11;
  }
  return total;
}

export interface ComputedDoctrineModifiers {
  terraNulliusLossMult: number;
  startManpowerMult: number;
  attackSpeedMult: number;
  attackerLossMult: number;
  conquerGoldMult: number;
  attritionLossMult: number;
  reinforceSpeedMult: number;
  defensePostCostMult: number;
  defensePostStrengthMult: number;
  samCooldownMult: number;
  troopRegenMult: number;
  radarVisionMult: number;
  samRangeMult: number;
  tradeAndTrainGoldMult: number;
  bonusStartingGold: number;
  cityCapacityMult: number;
  econBuildingCostMult: number;
  passiveGoldMult: number;
  treasuryInterestRate: number;
  conveyCostMult: number;
  warshipCostMult: number;
  warshipRangeMult: number;
  nukeAndSiloCostMult: number;
  siloCooldownMult: number;
  falloutPenaltyReduction: number;
  nukeSpeedMult: number;
  nukeBlastRadiusMult: number;
  nukeFlightTimeMult: number;
}

export function computeDoctrineModifiers(
  mask: number = 0,
): ComputedDoctrineModifiers {
  const rPioneer = getTalentRankFromMask(mask, "assault_pioneer");
  const rBlitz = getTalentRankFromMask(mask, "assault_blitz");
  const rPlunder = getTalentRankFromMask(mask, "assault_plunder");
  const rLogistics = getTalentRankFromMask(mask, "assault_logistics");

  const rEngineer = getTalentRankFromMask(mask, "fortress_engineer");
  const rBastion = getTalentRankFromMask(mask, "fortress_bastion");
  const rAegis = getTalentRankFromMask(mask, "fortress_aegis");
  const rRadar = getTalentRankFromMask(mask, "fortress_radar");

  const rTrade = getTalentRankFromMask(mask, "eco_trade");
  const rMetro = getTalentRankFromMask(mask, "eco_metropolis");
  const rIndustry = getTalentRankFromMask(mask, "eco_industry");
  const rTreasury = getTalentRankFromMask(mask, "eco_treasury");

  const rArmada = getTalentRankFromMask(mask, "apoc_armada");
  const rSilo = getTalentRankFromMask(mask, "apoc_silo");
  const rFallout = getTalentRankFromMask(mask, "apoc_fallout");
  const rOvercharge = getTalentRankFromMask(mask, "apoc_overcharge");

  return {
    terraNulliusLossMult: 1 - rPioneer * 0.02,
    startManpowerMult: 1 + rPioneer * 0.02,
    attackSpeedMult: 1 + rBlitz * 0.015,
    attackerLossMult: 1 - rPlunder * 0.01,
    conquerGoldMult: 1 + rPlunder * 0.03,
    attritionLossMult: 1 - rLogistics * 0.01,
    reinforceSpeedMult: 1 + rLogistics * 0.005,
    defensePostCostMult: 1 - rEngineer * 0.02,
    defensePostStrengthMult: 1 + rBastion * 0.02,
    samCooldownMult: 1 - rAegis * 0.02,
    troopRegenMult: 1 + rAegis * 0.015,
    radarVisionMult: 1 + rRadar * 0.01,
    samRangeMult: 1 + rRadar * 0.01,
    tradeAndTrainGoldMult: 1 + rTrade * 0.02,
    bonusStartingGold: rTrade * 2_500,
    cityCapacityMult: 1 + rMetro * 0.02,
    econBuildingCostMult: 1 - rIndustry * 0.015,
    passiveGoldMult: 1 + rIndustry * 0.02,
    treasuryInterestRate: rTreasury * 0.005,
    conveyCostMult: 1 - rTreasury * 0.01,
    warshipCostMult: 1 - rArmada * 0.02,
    warshipRangeMult: 1 + rArmada * 0.015,
    nukeAndSiloCostMult: 1 - rSilo * 0.015,
    siloCooldownMult: 1 - rSilo * 0.02,
    falloutPenaltyReduction: rFallout * 0.03,
    nukeSpeedMult: 1 + rFallout * 0.02,
    nukeBlastRadiusMult: 1 + rOvercharge * 0.01,
    nukeFlightTimeMult: 1 - rOvercharge * 0.01,
  };
}

// ============================================================================
// 2. ÉVÉNEMENTS MONDIAUX DYNAMIQUES (DYNAMIC WORLD EVENTS SYSTEM)
// ============================================================================

export type WorldEventCategory =
  | "economy"
  | "military"
  | "climate"
  | "atomic"
  | "natural";

export type WorldEventId =
  | "golden_trade_era"
  | "geomagnetic_storm"
  | "blitzkrieg_offensive"
  | "uranium_fever"
  | "national_mobilization"
  | "bastion_protocol"
  | "typhoon_monsoon"
  | "war_profiteering"
  | "iridium_meteor_shower"
  | "defcon_overdrive"
  | "supervolcano_caldera"
  | "permafrost_thaw"
  | "tectonic_fault_rupture"
  | "sandstorm_sirocco"
  | "continental_glaciation"
  | "monsoon_flash_floods"
  | "wildfire_firestorm"
  | "sinkhole_subsidence"
  | "geothermal_geysers"
  | "dust_bowl_drought"
  | "avalanche_barrage"
  | "quicksand_marshes"
  | "limnic_gas_eruption"
  | "tsunami_megawave"
  | "meteorite_crater_impact"
  | "ozone_depletion_aurora"
  | "dense_fog_of_war"
  | "acid_rain_deluge"
  | "ball_lightning_storms"
  | "polar_vortex_snap"
  | "halcyon_calm"
  | "solar_eclipse_totality"
  | "magnetic_inversion"
  | "locust_plague_swarm"
  | "bioluminescent_bloom"
  | "jungle_overgrowth"
  | "parasitic_spores"
  | "megafauna_migration"
  | "trench_stalemate"
  | "partisan_guerrilla"
  | "naval_blockade"
  | "aerial_recon_superiority"
  | "scorched_earth_retreat"
  | "shock_artillery_barrage"
  | "gold_rush_frenzy"
  | "industrial_breakthrough"
  | "hyperinflation_shock"
  | "railway_boom"
  | "radiation_monsoon"
  | "orbital_laser_matrix";

export interface WorldEventModifiers {
  passiveGoldMult: number;
  tradeGoldMult: number;
  trainGoldMult: number;
  conquerGoldMult: number;
  troopRegenMult: number;
  cityCapacityMult: number;
  attackSpeedMult: number;
  attackerLossMult: number;
  terraNulliusLossMult: number;
  defensePostStrengthMult: number;
  defensePostCostMult: number;
  econBuildingCostMult: number;
  nukeAndSiloCostMult: number;
  samRangeMult: number;
  samCooldownMult: number;
  siloCooldownMult: number;
  nukeSpeedMult: number;
  warshipRangeMult: number;
}

export interface WorldEventDefinition {
  id: WorldEventId;
  name: string;
  category: WorldEventCategory;
  categoryLabel: string;
  icon: string;
  accentColor: string;
  borderGlow: string;
  lore: string;
  strategicTip: string;
  modifierBadges: string[];
  pulseDescription?: string;
  minEscalationTier: 1 | 2 | 3;
  modifiers: WorldEventModifiers;
}

export const DEFAULT_WORLD_EVENT_MODIFIERS: WorldEventModifiers = {
  passiveGoldMult: 1,
  tradeGoldMult: 1,
  trainGoldMult: 1,
  conquerGoldMult: 1,
  troopRegenMult: 1,
  cityCapacityMult: 1,
  attackSpeedMult: 1,
  attackerLossMult: 1,
  terraNulliusLossMult: 1,
  defensePostStrengthMult: 1,
  defensePostCostMult: 1,
  econBuildingCostMult: 1,
  nukeAndSiloCostMult: 1,
  samRangeMult: 1,
  samCooldownMult: 1,
  siloCooldownMult: 1,
  nukeSpeedMult: 1,
  warshipRangeMult: 1,
};

export const WORLD_EVENTS_CATALOG: WorldEventDefinition[] = [
  {
    id: "golden_trade_era",
    name: "Âge d'Or Commercial",
    category: "economy",
    categoryLabel: "ÉCONOMIE MONDIALE",
    icon: "🚢",
    accentColor: "#f59e0b",
    borderGlow: "rgba(245, 158, 11, 0.45)",
    lore: "L'ouverture des grandes routes maritimes et ferroviaires déclenche une prospérité sans précédent.",
    strategicTip:
      "Construisez des Ports et des Usines pour maximiser les dividendes commerciaux.",
    modifierBadges: [
      "💰 Commerce & Trains +80%",
      "🏦 Or Passif +60%",
      "🏗️ Coût Ports & Usines -25%",
    ],
    pulseDescription: "Dividendes : +15 000 Or par Port/Usine toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      passiveGoldMult: 1.6,
      tradeGoldMult: 1.8,
      trainGoldMult: 1.8,
      econBuildingCostMult: 0.75,
    },
  },
  {
    id: "geomagnetic_storm",
    name: "Tempête Géomagnétique",
    category: "climate",
    categoryLabel: "ANOMALIE SOLAIRE",
    icon: "⚡",
    accentColor: "#38bdf8",
    borderGlow: "rgba(56, 189, 248, 0.45)",
    lore: "Une éruption coronale massive aveugle les radars anti-aériens et perturbe les satellites.",
    strategicTip:
      "Les batteries SAM sont affaiblies : c'est le moment idéal pour lancer des frappes nucléaires !",
    modifierBadges: [
      "📡 Portée SAM -35%",
      "⏳ Recharge SAM +50%",
      "🚀 Vitesse Missiles +25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      samRangeMult: 0.65,
      samCooldownMult: 1.5,
      nukeSpeedMult: 1.25,
    },
  },
  {
    id: "blitzkrieg_offensive",
    name: "Offensive Guerre Éclair",
    category: "military",
    categoryLabel: "DOCTRINE MILITAIRE",
    icon: "⚔️",
    accentColor: "#f43f5e",
    borderGlow: "rgba(244, 63, 94, 0.45)",
    lore: "Les états-majors ordonnent une percée mécanique générale sur tous les fronts.",
    strategicTip:
      "Lancez des offensives massives : vos armées avancent beaucoup plus vite et subissent moins de pertes.",
    modifierBadges: [
      "⚡ Vitesse de conquête +40%",
      "🩸 Pertes d'attaque -25%",
      "🛡️ Postes de Défense -20%",
    ],
    pulseDescription: "Réserves d'assaut : +3% de troupes max toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      attackSpeedMult: 1.4,
      attackerLossMult: 0.75,
      defensePostStrengthMult: 0.8,
    },
  },
  {
    id: "uranium_fever",
    name: "Fièvre de l'Uranium",
    category: "atomic",
    categoryLabel: "CRISE STRATÉGIQUE",
    icon: "☢️",
    accentColor: "#a855f7",
    borderGlow: "rgba(168, 85, 247, 0.45)",
    lore: "La découverte de nouveaux filons d'uranium enrichi fait chuter le coût de l'arsenal atomique.",
    strategicTip:
      "Érigez des Silos et lancez des Bombes A/H à prix réduit avant la fin de la crise.",
    modifierBadges: [
      "☢️ Coût Bombes & Silos -35%",
      "🔄 Recharge Silos -35%",
      "🚀 Vitesse Missiles +15%",
    ],
    pulseDescription:
      "Subvention atomique : +25 000 Or par Silo actif toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      nukeAndSiloCostMult: 0.65,
      siloCooldownMult: 0.65,
      nukeSpeedMult: 1.15,
    },
  },
  {
    id: "national_mobilization",
    name: "Mobilisation Générale",
    category: "military",
    categoryLabel: "FERVEUR NATIONALE",
    icon: "🪖",
    accentColor: "#10b981",
    borderGlow: "rgba(16, 185, 129, 0.45)",
    lore: "Un appel patriotique mobilise des millions de réservistes dans toutes les métropoles.",
    strategicTip:
      "Vos armées se régénèrent presque deux fois plus vite. Développez vos Villes !",
    modifierBadges: [
      "📈 Régénération Troupes +85%",
      "🏙️ Capacité des Villes +30%",
      "🚩 Pertes Terres Neutres -40%",
    ],
    pulseDescription: "Conscription : +12 000 troupes par Ville toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      troopRegenMult: 1.85,
      cityCapacityMult: 1.3,
      terraNulliusLossMult: 0.6,
    },
  },
  {
    id: "bastion_protocol",
    name: "Protocole Forteresse",
    category: "military",
    categoryLabel: "ÉTAT D'URGENCE",
    icon: "🏰",
    accentColor: "#06b6d4",
    borderGlow: "rgba(6, 182, 212, 0.45)",
    lore: "Les ingénieurs militaires bétonnent les frontières et déploient des bunkers lourds.",
    strategicTip:
      "Fortifiez vos frontières : les Postes de Défense coûtent -40% et sont +50% plus puissants.",
    modifierBadges: [
      "🛡️ Puissance Défense +50%",
      "🧱 Coût Postes Défense -40%",
      "📡 Recharge SAM -25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 1.5,
      defensePostCostMult: 0.6,
      samCooldownMult: 0.75,
    },
  },
  {
    id: "typhoon_monsoon",
    name: "Super-Typhon Océanique",
    category: "climate",
    categoryLabel: "ALERTE MÉTÉO",
    icon: "🌊",
    accentColor: "#6366f1",
    borderGlow: "rgba(99, 102, 241, 0.45)",
    lore: "Des cyclones violents balaient les mers, paralysant les flottes mais dopant le rail intérieur.",
    strategicTip:
      "Les canons navals ont une portée réduite en mer, tandis que les trains rapportent +75% d'Or.",
    modifierBadges: [
      "🚂 Revenus Ferroviaires +75%",
      "⚓ Portée Navires Guerre -25%",
      "⛵ Commerce Maritime -30%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      trainGoldMult: 1.75,
      warshipRangeMult: 0.75,
      tradeGoldMult: 0.7,
    },
  },
  {
    id: "war_profiteering",
    name: "Économie de Pillage",
    category: "economy",
    categoryLabel: "CRISE FINANCIÈRE",
    icon: "🏴‍☠️",
    accentColor: "#eab308",
    borderGlow: "rgba(234, 179, 8, 0.45)",
    lore: "L'inflation freine la construction civile, mais les trésors de guerre capturés doublent de valeur.",
    strategicTip:
      "Annexez des nations et des rivaux pour récupérer 200% de leur trésor en Or !",
    modifierBadges: [
      "👑 Or de Conquête +100% (x2)",
      "⚡ Vitesse d'attaque +20%",
      "🏗️ Coût Infrastructures +20%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      conquerGoldMult: 2.0,
      attackSpeedMult: 1.2,
      econBuildingCostMult: 1.2,
    },
  },
  {
    id: "iridium_meteor_shower",
    name: "Pluie d'Astéroïdes d'Iridium",
    category: "climate",
    categoryLabel: "MANNE COSMIQUE",
    icon: "☄️",
    accentColor: "#ec4899",
    borderGlow: "rgba(236, 72, 153, 0.45)",
    lore: "Une pluie de météorites riches en métaux rares s'abat sur la planète, dopant toutes les économies.",
    strategicTip:
      "Extraction massive d'iridium : l'Or passif double et des gisements tombent toutes les 5s !",
    modifierBadges: [
      "💎 Or Passif +120%",
      "🏗️ Coût Infrastructures -20%",
      "📈 Régénération Troupes +35%",
    ],
    pulseDescription:
      "Météores d'Or : +40 000 Or largués aux empires actifs toutes les 5s",
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      passiveGoldMult: 2.2,
      econBuildingCostMult: 0.8,
      troopRegenMult: 1.35,
    },
  },
  {
    id: "defcon_overdrive",
    name: "Protocole DEFCON 1 (Apocalypse)",
    category: "atomic",
    categoryLabel: "ESCALADE GLOBALE",
    icon: "🔥",
    accentColor: "#ef4444",
    borderGlow: "rgba(239, 68, 68, 0.55)",
    lore: "Les superpuissances activent leurs réserves ultimes. Guerre totale sur terre, sur mer et dans les airs.",
    strategicTip:
      "Tout est accéléré : frappes nucléaires à moitié prix, offensives éclairs et mobilisation maximale !",
    modifierBadges: [
      "☢️ Coût Bombes & Silos -45%",
      "⚡ Vitesse d'attaque +35%",
      "📈 Régénération Troupes +60%",
    ],
    pulseDescription:
      "Surcharge Globale : +50 000 Or & +5% Troupes toutes les 5s",
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      nukeAndSiloCostMult: 0.55,
      siloCooldownMult: 0.55,
      attackSpeedMult: 1.35,
      troopRegenMult: 1.6,
      nukeSpeedMult: 1.35,
    },
  },

  // --- 2. CLIMAT & PHÉNOMÈNES NATURELS TERRESTRES ---
  {
    id: "supervolcano_caldera",
    name: "Éruption Supervolcanique",
    category: "natural",
    categoryLabel: "GÉOLOGIE EXTRÊME",
    icon: "🌋",
    accentColor: "#f97316",
    borderGlow: "rgba(249, 115, 22, 0.45)",
    lore: "Une caldeira géante entre en éruption cataclysmique, obscurcissant les cieux de cendres et secouant les failles.",
    strategicTip:
      "Les radars SAM et la vitesse de marche sont réduits par la cendre, mais les cendres minérales dopent l'industrie minière !",
    modifierBadges: [
      "📡 Portée SAM -30%",
      "🏔️ Vitesse d'attaque -15%",
      "💎 Or Passif +50%",
    ],
    pulseDescription: "Cendres minérales : +20 000 Or par Usine toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      samRangeMult: 0.7,
      attackSpeedMult: 0.85,
      passiveGoldMult: 1.5,
    },
  },
  {
    id: "permafrost_thaw",
    name: "Dégel du Permafrost",
    category: "natural",
    categoryLabel: "MUTATION DU TERRAIN",
    icon: "🧊",
    accentColor: "#06b6d4",
    borderGlow: "rgba(6, 182, 212, 0.45)",
    lore: "Le dégel massif transforme les plaines et toundras en bourbiers profonds et libère d'immenses poches de gaz.",
    strategicTip:
      "Franchir les terres neutres est harassant pour l'infanterie, mais le trafic ferroviaire explose sur les corridors stabilisés.",
    modifierBadges: [
      "🚩 Pertes Terres Neutres +60%",
      "⚡ Vitesse de conquête -25%",
      "🚂 Revenus Ferroviaires +80%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      terraNulliusLossMult: 1.6,
      attackSpeedMult: 0.75,
      trainGoldMult: 1.8,
    },
  },
  {
    id: "tectonic_fault_rupture",
    name: "Rupture de Faille Tectonique",
    category: "natural",
    categoryLabel: "SÉISME MAJEUR",
    icon: "🏚️",
    accentColor: "#e11d48",
    borderGlow: "rgba(225, 29, 72, 0.45)",
    lore: "Des séismes en chaîne fracturent la croûte continentale, éventrant les fortifications de frontière.",
    strategicTip:
      "Les Postes de Défense et bunkers sont fragilisés : profitez des brèches tectoniques pour attaquer !",
    modifierBadges: [
      "🛡️ Puissance Défense -35%",
      "🧱 Coût Postes Défense +40%",
      "🚩 Pertes Terres Neutres +50%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 0.65,
      defensePostCostMult: 1.4,
      terraNulliusLossMult: 1.5,
    },
  },
  {
    id: "sandstorm_sirocco",
    name: "Tempête de Sable Sirocco",
    category: "natural",
    categoryLabel: "MÉTÉO EXTRÊME",
    icon: "🌪️",
    accentColor: "#d97706",
    borderGlow: "rgba(217, 119, 6, 0.45)",
    lore: "Un mur de poussière ocre s'abat sur le continent, aveuglant la DCA et les vigies côtières.",
    strategicTip:
      "La visibilité est nulle : lancez des assauts surprises rapides pendant que les radars côtiers et SAM sont aveugles.",
    modifierBadges: [
      "📡 Portée SAM -40%",
      "⚓ Portée Navires -30%",
      "⚡ Vitesse d'attaque +30%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      samRangeMult: 0.6,
      warshipRangeMult: 0.7,
      attackSpeedMult: 1.3,
    },
  },
  {
    id: "continental_glaciation",
    name: "Grand Gel Polaire",
    category: "climate",
    categoryLabel: "CRYO-TEMPÊTE",
    icon: "❄️",
    accentColor: "#38bdf8",
    borderGlow: "rgba(56, 189, 248, 0.45)",
    lore: "Une vague de froid arctique fige les eaux côtières et durcit le sol, transformant les steppes en autoroutes glacées.",
    strategicTip:
      "Les mers sont prises par la banquise, mais les armées motorisées traversent le sol durci à vive allure !",
    modifierBadges: [
      "⚡ Vitesse d'attaque +25%",
      "🚩 Pertes Terres Neutres -30%",
      "⚓ Portée Navires -35%",
    ],
    pulseDescription:
      "Ravitaillement grand froid : +6 000 troupes toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      attackSpeedMult: 1.25,
      terraNulliusLossMult: 0.7,
      warshipRangeMult: 0.65,
    },
  },
  {
    id: "monsoon_flash_floods",
    name: "Crues Éclair & Mousson",
    category: "climate",
    categoryLabel: "DÉLUGE CONTINENTAL",
    icon: "🌧️",
    accentColor: "#0284c7",
    borderGlow: "rgba(2, 132, 199, 0.45)",
    lore: "Des pluies torrentielles submergent les vallées fluviales et inondent les routes de ravitaillement.",
    strategicTip:
      "L'infanterie s'enlise dans l'eau boueuse, mais les ports et réseaux d'eau intérieurs connaissent un boom sans précédent.",
    modifierBadges: [
      "⚡ Vitesse d'attaque -20%",
      "🩸 Pertes d'attaque +25%",
      "🚢 Commerce Maritime +60%",
    ],
    pulseDescription:
      "Irrigation des plaines : +8 000 troupes par Ville toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      attackSpeedMult: 0.8,
      attackerLossMult: 1.25,
      tradeGoldMult: 1.6,
    },
  },
  {
    id: "wildfire_firestorm",
    name: "Tempête de Feu Forestière",
    category: "natural",
    categoryLabel: "INCENDIE GÉANT",
    icon: "🔥",
    accentColor: "#ea580c",
    borderGlow: "rgba(234, 88, 12, 0.45)",
    lore: "Des mégafeux attisés par des vents chauds consument les forêts et les avant-postes en bordure.",
    strategicTip:
      "Les fortifications de bois et béton sont ravagées : les défenseurs perdent leur avantage protecteur !",
    modifierBadges: [
      "🛡️ Puissance Défense -40%",
      "⚡ Vitesse d'attaque +35%",
      "👑 Or de Conquête +40%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 0.6,
      attackSpeedMult: 1.35,
      conquerGoldMult: 1.4,
    },
  },
  {
    id: "sinkhole_subsidence",
    name: "Affaissements Karstiques",
    category: "natural",
    categoryLabel: "GÉOLOGIE SOUTERRAINE",
    icon: "🕳️",
    accentColor: "#78716c",
    borderGlow: "rgba(120, 113, 108, 0.45)",
    lore: "Le sous-sol calcaire s'effondre en dolines béantes, révélant de vastes cavités minières insoupçonnées.",
    strategicTip:
      "Bâtir des usines coûte plus cher en fondations, mais la découverte de filons souterrains rapporte un flot continu d'or.",
    modifierBadges: [
      "🏗️ Coût Infrastructures +35%",
      "🚩 Pertes Terres Neutres +40%",
      "💎 Or Passif +60%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      econBuildingCostMult: 1.35,
      terraNulliusLossMult: 1.4,
      passiveGoldMult: 1.6,
    },
  },
  {
    id: "geothermal_geysers",
    name: "Éveil Géothermique",
    category: "natural",
    categoryLabel: "ÉNERGIE NATURELLE",
    icon: "♨️",
    accentColor: "#14b8a6",
    borderGlow: "rgba(20, 184, 166, 0.45)",
    lore: "Des sources hydrothermales et vapeurs volcaniques jaillissent des failles, fournissant une énergie thermique abondante.",
    strategicTip:
      "L'énergie géothermique gratuite réduit le coût de l'industrie lourde et booste la croissance économique.",
    modifierBadges: [
      "🏗️ Coût Infrastructures -25%",
      "💎 Or Passif +70%",
      "📈 Régénération Troupes +20%",
    ],
    pulseDescription:
      "Énergie Verte : +18 000 Or par Ville/Usine toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      econBuildingCostMult: 0.75,
      passiveGoldMult: 1.7,
      troopRegenMult: 1.2,
    },
  },
  {
    id: "dust_bowl_drought",
    name: "Grande Sécheresse Dust Bowl",
    category: "climate",
    categoryLabel: "DÉSERTIFICATION",
    icon: "🌾",
    accentColor: "#b45309",
    borderGlow: "rgba(180, 83, 9, 0.45)",
    lore: "Une vague de chaleur écrasante assèche les réservoirs d'eau et transforme les pâturages en étendues craquelées.",
    strategicTip:
      "La croissance de vos troupes ralentit, mais le sol durci permet aux trains et aux convois de filer sans encombre.",
    modifierBadges: [
      "📈 Régénération Troupes -30%",
      "🚂 Revenus Ferroviaires +60%",
      "⚡ Vitesse d'attaque +20%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      troopRegenMult: 0.7,
      trainGoldMult: 1.6,
      attackSpeedMult: 1.2,
    },
  },
  {
    id: "avalanche_barrage",
    name: "Avalanches Massives",
    category: "natural",
    categoryLabel: "DANGER ALPIN",
    icon: "🏔️",
    accentColor: "#94a3b8",
    borderGlow: "rgba(148, 163, 184, 0.45)",
    lore: "Des murs de neige et de rocs dévalent les massifs montagneux, scellant les cols et étouffant les offensives.",
    strategicTip:
      "Prendre du terrain neutre en montagne est très meurtrier, mais les bunkers retranchés dans les défilés sont imprenables.",
    modifierBadges: [
      "🚩 Pertes Terres Neutres +75%",
      "🛡️ Puissance Défense +40%",
      "⚡ Vitesse d'attaque -20%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      terraNulliusLossMult: 1.75,
      defensePostStrengthMult: 1.4,
      attackSpeedMult: 0.8,
    },
  },
  {
    id: "quicksand_marshes",
    name: "Sables Mouvants & Marécages",
    category: "natural",
    categoryLabel: "BOURBIER MEURTRIER",
    icon: "🐊",
    accentColor: "#65a30d",
    borderGlow: "rgba(101, 163, 13, 0.45)",
    lore: "La montée des nappes phréatiques transforme les plaines côtières en sables mouvants et tourbières traîtresses.",
    strategicTip:
      "Les attaquants s'enlisent et subissent de lourdes pertes. Restez retranché et consolidez vos frontières.",
    modifierBadges: [
      "🩸 Pertes d'attaque +35%",
      "🛡️ Puissance Défense +30%",
      "⚡ Vitesse d'attaque -25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      attackerLossMult: 1.35,
      defensePostStrengthMult: 1.3,
      attackSpeedMult: 0.75,
    },
  },
  {
    id: "limnic_gas_eruption",
    name: "Éruption Limnique de Gaz",
    category: "natural",
    categoryLabel: "GAZ NATUREL TOXIQUE",
    icon: "🌫️",
    accentColor: "#84cc16",
    borderGlow: "rgba(132, 204, 22, 0.45)",
    lore: "D'immenses nappes de gaz toxique lourd dégazent des lacs profonds et s'étendent sur les basses plaines.",
    strategicTip:
      "La régénération des troupes est paralysée par l'asphyxie, tandis que les bunkers hermétiques résistent admirablement.",
    modifierBadges: [
      "📈 Régénération Troupes -35%",
      "🛡️ Puissance Défense +35%",
      "🧱 Coût Postes Défense -30%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      troopRegenMult: 0.65,
      defensePostStrengthMult: 1.35,
      defensePostCostMult: 0.7,
    },
  },
  {
    id: "tsunami_megawave",
    name: "Mégatsunami Océanique",
    category: "natural",
    categoryLabel: "CATASTROPHE MARINE",
    icon: "🌊",
    accentColor: "#0284c7",
    borderGlow: "rgba(2, 132, 199, 0.55)",
    lore: "Un séisme sous-marin génère un train de vagues titanesques submergeant les rades portuaires et les littoraux.",
    strategicTip:
      "Les flottes de guerre sont temporairement paralysées, mais le pillage des épaves échouées rapporte des trésors aux ports survivants.",
    modifierBadges: [
      "⚓ Portée Navires -45%",
      "⛵ Commerce Maritime -40%",
      "💎 Or Passif +80%",
    ],
    pulseDescription: "Sauvetage d'Épaves : +25 000 Or par Port toutes les 5s",
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      warshipRangeMult: 0.55,
      tradeGoldMult: 0.6,
      passiveGoldMult: 1.8,
    },
  },
  {
    id: "meteorite_crater_impact",
    name: "Impact Météoritique",
    category: "natural",
    categoryLabel: "CATASTROPHE CÉLESTE",
    icon: "🪨",
    accentColor: "#e11d48",
    borderGlow: "rgba(225, 29, 72, 0.55)",
    lore: "Un aérolithe de fer nickelé s'écrase sur les terres intérieures, creusant un cratère fumant débordant de métaux rares.",
    strategicTip:
      "L'onde de choc déstabilise les lignes de front, mais l'extraction des minerais extraterrestres arrose tous les belligérants d'or !",
    modifierBadges: [
      "🛡️ Puissance Défense -25%",
      "💎 Or Passif +90%",
      "👑 Or de Conquête +50%",
    ],
    pulseDescription:
      "Exploitation Cratère : +50 000 Or à chaque empire toutes les 5s",
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 0.75,
      passiveGoldMult: 1.9,
      conquerGoldMult: 1.5,
    },
  },

  // --- 3. ATMOSPHÈRE, ESPACE & ANOMALIES MÉTÉOROLOGIQUES ---
  {
    id: "ozone_depletion_aurora",
    name: "Ionisation Atmosphérique & Aurores",
    category: "climate",
    categoryLabel: "AURORE STRATOSPHÉRIQUE",
    icon: "🌌",
    accentColor: "#a855f7",
    borderGlow: "rgba(168, 85, 247, 0.45)",
    lore: "Une brèche dans la haute atmosphère déclenche des aurores boréales électriques illuminant la terre d'une lueur spectrale.",
    strategicTip:
      "L'air raréfié et ionisé permet aux missiles balistiques d'atteindre des vitesses hypersoniques exceptionnelles !",
    modifierBadges: [
      "🚀 Vitesse Missiles +35%",
      "📡 Portée SAM +25%",
      "🔄 Recharge Silos -20%",
    ],
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      nukeSpeedMult: 1.35,
      samRangeMult: 1.25,
      siloCooldownMult: 0.8,
    },
  },
  {
    id: "dense_fog_of_war",
    name: "Brouillard Épais des Marais",
    category: "climate",
    categoryLabel: "BRUME STRATÉGIQUE",
    icon: "🌁",
    accentColor: "#64748b",
    borderGlow: "rgba(100, 116, 139, 0.45)",
    lore: "Un épais rideau de brume impénétrable s'installe au ras du sol, masquant les mouvements des divisions.",
    strategicTip:
      "Les postes de garde ennemis ne vous voient pas venir : vos pertes offensives chutent et la vitesse de percée augmente !",
    modifierBadges: [
      "🛡️ Puissance Défense -30%",
      "🩸 Pertes d'attaque -25%",
      "⚡ Vitesse d'attaque +25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 0.7,
      attackerLossMult: 0.75,
      attackSpeedMult: 1.25,
    },
  },
  {
    id: "acid_rain_deluge",
    name: "Déluge de Pluies Acides",
    category: "climate",
    categoryLabel: "PRÉCIPITATION CHIMIQUE",
    icon: "🧪",
    accentColor: "#a3e635",
    borderGlow: "rgba(163, 230, 53, 0.45)",
    lore: "Des condensations industrielles toxiques retombent en pluies corrosives rongeant le ciment et les blindages.",
    strategicTip:
      "La maintenance des fortifications et des usines s'envole en coût sous l'acide. Évitez les grands chantiers !",
    modifierBadges: [
      "🏗️ Coût Infrastructures +30%",
      "🧱 Coût Postes Défense +30%",
      "🛡️ Puissance Défense -25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      econBuildingCostMult: 1.3,
      defensePostCostMult: 1.3,
      defensePostStrengthMult: 0.75,
    },
  },
  {
    id: "ball_lightning_storms",
    name: "Orages de Foudre en Boule",
    category: "climate",
    categoryLabel: "PLASMA NATUREL",
    icon: "🔮",
    accentColor: "#8b5cf6",
    borderGlow: "rgba(139, 92, 246, 0.45)",
    lore: "Des sphères lumineuses de plasma traversent les lignes électriques et les voies ferrées en crépitant.",
    strategicTip:
      "Le réseau ferré et les générateurs urbains absorbent ce survoltage énergétique pour générer une avalanche de profits !",
    modifierBadges: [
      "🚂 Revenus Ferroviaires +100%",
      "💎 Or Passif +50%",
      "📡 Portée SAM -25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      trainGoldMult: 2.0,
      passiveGoldMult: 1.5,
      samRangeMult: 0.75,
    },
  },
  {
    id: "polar_vortex_snap",
    name: "Vortex Polaire Glacial",
    category: "climate",
    categoryLabel: "FROID GLACIAL",
    icon: "🥶",
    accentColor: "#0ea5e9",
    borderGlow: "rgba(14, 165, 233, 0.45)",
    lore: "Le thermomètre plonge sous les -45°C. Les fluides gèlent et les fantassins doivent s'abriter pour survivre.",
    strategicTip:
      "L'offensive à découvert est glaciale. Bâtissez des abris et des lignes défensives à bas coût !",
    modifierBadges: [
      "📈 Régénération Troupes -40%",
      "🛡️ Puissance Défense +45%",
      "🧱 Coût Postes Défense -20%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      troopRegenMult: 0.6,
      defensePostStrengthMult: 1.45,
      defensePostCostMult: 0.8,
    },
  },
  {
    id: "halcyon_calm",
    name: "Calme Plat Anticyclonique",
    category: "climate",
    categoryLabel: "SERÉNITÉ CLIMATIQUE",
    icon: "☀️",
    accentColor: "#facc15",
    borderGlow: "rgba(250, 204, 21, 0.45)",
    lore: "Une météo immaculée et des mers calmes s'étendent sur le monde entier, ouvrant une fenêtre idéale pour le commerce.",
    strategicTip:
      "Les convois maritimes et les trains fonctionnent à pleine capacité. Récoltez des dividendes records !",
    modifierBadges: [
      "🚢 Commerce Maritime +80%",
      "🚂 Revenus Ferroviaires +80%",
      "📈 Régénération Troupes +25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      tradeGoldMult: 1.8,
      trainGoldMult: 1.8,
      troopRegenMult: 1.25,
    },
  },
  {
    id: "solar_eclipse_totality",
    name: "Éclipse Solaire Totale",
    category: "climate",
    categoryLabel: "OBSCURITÉ TOTALE",
    icon: "🌑",
    accentColor: "#475569",
    borderGlow: "rgba(71, 85, 105, 0.55)",
    lore: "La lune masque entièrement le disque solaire, plongeant la Terre dans une pénombre glaciale et mystérieuse.",
    strategicTip:
      "Les systèmes optiques des SAM perdent leur guidage : profitez de l'obscurité pour lancer des assauts éclairs !",
    modifierBadges: [
      "📡 Portée SAM -50%",
      "⚡ Vitesse d'attaque +30%",
      "🚩 Pertes Terres Neutres -30%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      samRangeMult: 0.5,
      attackSpeedMult: 1.3,
      terraNulliusLossMult: 0.7,
    },
  },
  {
    id: "magnetic_inversion",
    name: "Anomalie du Pôle Magnétique",
    category: "climate",
    categoryLabel: "DÉRIVE GÉOMAGNÉTIQUE",
    icon: "🧲",
    accentColor: "#059669",
    borderGlow: "rgba(5, 150, 105, 0.45)",
    lore: "Une fluctuation rapide du noyau externe désoriente les compas et sature les relais de télécommunication.",
    strategicTip:
      "La navigation sur terres inconnues est confuse, mais le désordre ambiant permet de piller le double de butin !",
    modifierBadges: [
      "🚩 Pertes Terres Neutres +40%",
      "⏳ Recharge SAM +40%",
      "👑 Or de Conquête +50%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      terraNulliusLossMult: 1.4,
      samCooldownMult: 1.4,
      conquerGoldMult: 1.5,
    },
  },

  // --- 4. BIOLOGIE SAUVAGE & PESTES ÉCOLOGIQUES ---
  {
    id: "locust_plague_swarm",
    name: "Invasion de Criquets Ravageurs",
    category: "natural",
    categoryLabel: "FLÉAU BIOLOGIQUE",
    icon: "🦗",
    accentColor: "#854d0e",
    borderGlow: "rgba(133, 77, 14, 0.45)",
    lore: "Un essaim colossal de milliards de criquets pèlerins dévore toutes les cultures agricoles sur des milliers de kilomètres.",
    strategicTip:
      "La disette frappe le ravitaillement des armées. Temporisez vos offensives en attendant que l'essaim se disperse.",
    modifierBadges: [
      "📈 Régénération Troupes -35%",
      "🏗️ Coût Infrastructures +25%",
      "⚡ Vitesse d'attaque -15%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      troopRegenMult: 0.65,
      econBuildingCostMult: 1.25,
      attackSpeedMult: 0.85,
    },
  },
  {
    id: "bioluminescent_bloom",
    name: "Floraison Algale Bioluminescente",
    category: "natural",
    categoryLabel: "ÉCOSYSTÈME RADIANT",
    icon: "✨",
    accentColor: "#06b6d4",
    borderGlow: "rgba(6, 182, 212, 0.45)",
    lore: "Une prolifération d'algues luminescentes fait luire l'océan d'un éclat bleuté visible depuis l'espace.",
    strategicTip:
      "Les voies maritimes illuminées permettent aux convois de naviguer sans risque et étendent la portée des flottes.",
    modifierBadges: [
      "🚢 Commerce Maritime +90%",
      "⚓ Portée Navires +30%",
      "💎 Or Passif +40%",
    ],
    pulseDescription: "Pêche d'Abondance : +20 000 Or par Port toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      tradeGoldMult: 1.9,
      warshipRangeMult: 1.3,
      passiveGoldMult: 1.4,
    },
  },
  {
    id: "jungle_overgrowth",
    name: "Prolifération Végétale Sauvage",
    category: "natural",
    categoryLabel: "JUNGLE INVASIVE",
    icon: "🌴",
    accentColor: "#15803d",
    borderGlow: "rgba(21, 128, 61, 0.45)",
    lore: "Des lianes géantes et une canopée impénétrable reprennent leurs droits sur les routes et frontières territoriales.",
    strategicTip:
      "Pénétrer dans la jungle coûte cher en hommes, mais les positions défensives dissimulées sous la canopée sont très solides.",
    modifierBadges: [
      "🚩 Pertes Terres Neutres +50%",
      "🛡️ Puissance Défense +30%",
      "⚡ Vitesse d'attaque -20%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      terraNulliusLossMult: 1.5,
      defensePostStrengthMult: 1.3,
      attackSpeedMult: 0.8,
    },
  },
  {
    id: "parasitic_spores",
    name: "Spores Fongiques Vénéneuses",
    category: "natural",
    categoryLabel: "TOXICITÉ VÉGÉTALE",
    icon: "🍄",
    accentColor: "#a21caf",
    borderGlow: "rgba(162, 28, 175, 0.45)",
    lore: "Des champignons mutants expulsent des nuages de spores toxiques au ras du sol lors de leur floraison saisonnière.",
    strategicTip:
      "L'infanterie respire mal dans les tranchées et perd des hommes. Les chantiers industriels en profitent pour extraire des enzymes.",
    modifierBadges: [
      "📈 Régénération Troupes -30%",
      "🩸 Pertes d'attaque +25%",
      "🏗️ Coût Infrastructures -20%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      troopRegenMult: 0.7,
      attackerLossMult: 1.25,
      econBuildingCostMult: 0.8,
    },
  },
  {
    id: "megafauna_migration",
    name: "Grande Migration Sauvage",
    category: "natural",
    categoryLabel: "RUÉE DE FAUNE",
    icon: "🦬",
    accentColor: "#b45309",
    borderGlow: "rgba(180, 83, 9, 0.45)",
    lore: "D'immenses hardes d'animaux colossaux traversent les vallées et défoncent les barbelés des avant-postes.",
    strategicTip:
      "Les lignes de défense statiques sont piétinées : profitez de la panique pour attaquer vos rivaux !",
    modifierBadges: [
      "🛡️ Puissance Défense -30%",
      "🚩 Pertes Terres Neutres +35%",
      "👑 Or de Conquête +40%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 0.7,
      terraNulliusLossMult: 1.35,
      conquerGoldMult: 1.4,
    },
  },

  // --- 5. TACTIQUES MILITAIRES & DOCTRINES DE GUERRE ---
  {
    id: "trench_stalemate",
    name: "Guerre de Position & Tranchées",
    category: "military",
    categoryLabel: "ENLISEMENT TACTIQUE",
    icon: "🛑",
    accentColor: "#64748b",
    borderGlow: "rgba(100, 116, 139, 0.45)",
    lore: "Les armées s'enterrent sous un réseau dense de barbelés, tranchées et casemates, figeant la ligne de contact.",
    strategicTip:
      "Attaquer frontalement est un carnage absolu : construisez des défenses imprenables et préparez l'après-crise.",
    modifierBadges: [
      "🛡️ Puissance Défense +70%",
      "⚡ Vitesse d'attaque -40%",
      "🩸 Pertes d'attaque +30%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 1.7,
      attackSpeedMult: 0.6,
      attackerLossMult: 1.3,
    },
  },
  {
    id: "partisan_guerrilla",
    name: "Guérilla & Soulèvements Partisans",
    category: "military",
    categoryLabel: "INSURRECTION",
    icon: "💣",
    accentColor: "#ef4444",
    borderGlow: "rgba(239, 68, 68, 0.45)",
    lore: "Des maquisards et factions rebelles sabotent les arrières et pillent les dépôts militaires adverses.",
    strategicTip:
      "Les postes défensifs fixes sont sabotés : pillez et conquérez les bastions ennemis pour empocher un trésor colossal !",
    modifierBadges: [
      "👑 Or de Conquête +90%",
      "🚩 Pertes Terres Neutres +40%",
      "🛡️ Puissance Défense -25%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      conquerGoldMult: 1.9,
      terraNulliusLossMult: 1.4,
      defensePostStrengthMult: 0.75,
    },
  },
  {
    id: "naval_blockade",
    name: "Grand Blocus Maritime",
    category: "military",
    categoryLabel: "DOMINATION NAVALE",
    icon: "⚓",
    accentColor: "#1d4ed8",
    borderGlow: "rgba(29, 78, 216, 0.45)",
    lore: "Des escadres de cuirassés et sous-marins ferment hermétiquement tous les détroits et corridors maritimes.",
    strategicTip:
      "La portée des navires de guerre est maximale : canonnerez les côtes ennemies pendant que le train compense le commerce.",
    modifierBadges: [
      "⚓ Portée Navires +40%",
      "⛵ Commerce Maritime -60%",
      "🚂 Revenus Ferroviaires +70%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      warshipRangeMult: 1.4,
      tradeGoldMult: 0.4,
      trainGoldMult: 1.7,
    },
  },
  {
    id: "aerial_recon_superiority",
    name: "Suprématie Aérienne Totale",
    category: "military",
    categoryLabel: "CONTRÔLE DU CIEL",
    icon: "🛩️",
    accentColor: "#0284c7",
    borderGlow: "rgba(2, 132, 199, 0.45)",
    lore: "Des escadrilles d'avions de reconnaissance quadrillent les secteurs et transmettent en direct la position des ennemis.",
    strategicTip:
      "Vos batteries sol-air ont une détection accrue et vos offensives ciblent parfaitement les points faibles adverses.",
    modifierBadges: [
      "📡 Portée SAM +40%",
      "⏳ Recharge SAM -30%",
      "🩸 Pertes d'attaque -20%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      samRangeMult: 1.4,
      samCooldownMult: 0.7,
      attackerLossMult: 0.8,
    },
  },
  {
    id: "scorched_earth_retreat",
    name: "Doctrine de la Terre Brûlée",
    category: "military",
    categoryLabel: "DESTRUCTION TOTALE",
    icon: "🔥",
    accentColor: "#b91c1c",
    borderGlow: "rgba(185, 28, 28, 0.45)",
    lore: "Les armées en recul dynamitent les ponts, empoisonnent les puits et rasent toutes les villes abandonnées.",
    strategicTip:
      "Conquérir des territoires rapporte peu de butin et coûte cher en pionniers, mais défendre ses bastions est aisé.",
    modifierBadges: [
      "👑 Or de Conquête -50%",
      "🚩 Pertes Terres Neutres +60%",
      "🛡️ Puissance Défense +40%",
    ],
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      conquerGoldMult: 0.5,
      terraNulliusLossMult: 1.6,
      defensePostStrengthMult: 1.4,
    },
  },
  {
    id: "shock_artillery_barrage",
    name: "Pilonnage d'Artillerie Lourde",
    category: "military",
    categoryLabel: "BARRAGE DE FEU",
    icon: "💥",
    accentColor: "#dc2626",
    borderGlow: "rgba(220, 38, 38, 0.45)",
    lore: "Des pièces de gros calibre pilonnent méthodiquement toutes les lignes fortifiées ennemies sans discontinuer.",
    strategicTip:
      "Les postes défensifs sont pulvérisés par le bombardement : passez à l'attaque avec une résistance minimale !",
    modifierBadges: [
      "🛡️ Puissance Défense -50%",
      "⚡ Vitesse d'attaque +30%",
      "🩸 Pertes d'attaque -15%",
    ],
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 0.5,
      attackSpeedMult: 1.3,
      attackerLossMult: 0.85,
    },
  },

  // --- 6. ÉCONOMIE, INDUSTRIE & RESSOURCES ---
  {
    id: "gold_rush_frenzy",
    name: "Ruée vers l'Or Frénétique",
    category: "economy",
    categoryLabel: "FILON GÉANT",
    icon: "💰",
    accentColor: "#fbbf24",
    borderGlow: "rgba(251, 191, 36, 0.45)",
    lore: "Des prospecteurs découvrent de gigantesques veines aurifères dans les massifs montagneux et les plaines fluviales.",
    strategicTip:
      "Toutes les économies nagent dans l'or : profitez de ces liquidités pour investir dans vos infrastructures clés !",
    modifierBadges: [
      "💎 Or Passif +100%",
      "🏗️ Coût Infrastructures -25%",
      "👑 Or de Conquête +60%",
    ],
    pulseDescription: "Filon Aurifère : +35 000 Or toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      passiveGoldMult: 2.0,
      econBuildingCostMult: 0.75,
      conquerGoldMult: 1.6,
    },
  },
  {
    id: "industrial_breakthrough",
    name: "Révolution Industrielle 4.0",
    category: "economy",
    categoryLabel: "PROGRÈS TECHNIQUE",
    icon: "⚙️",
    accentColor: "#0284c7",
    borderGlow: "rgba(2, 132, 199, 0.45)",
    lore: "Une vague d'innovations dans l'usinage automatique et la métallurgie réduit le coût des chantiers d'envergure.",
    strategicTip:
      "Bâtir des usines et des ports coûte 40% moins cher : industrialisez votre territoire à marche forcée !",
    modifierBadges: [
      "🏗️ Coût Infrastructures -40%",
      "💎 Or Passif +50%",
      "🚂 Revenus Ferroviaires +50%",
    ],
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      econBuildingCostMult: 0.6,
      passiveGoldMult: 1.5,
      trainGoldMult: 1.5,
    },
  },
  {
    id: "hyperinflation_shock",
    name: "Choc d'Hyperinflation",
    category: "economy",
    categoryLabel: "CRISE MONÉTAIRE",
    icon: "📉",
    accentColor: "#ef4444",
    borderGlow: "rgba(239, 68, 68, 0.45)",
    lore: "L'effondrement des devises fiat paralyse les marchés financiers : la valeur se réfugie dans la force brute et les hommes.",
    strategicTip:
      "Construire des bâtiments coûte une fortune, mais les populations s'engagent en masse dans l'armée !",
    modifierBadges: [
      "🏗️ Coût Infrastructures +40%",
      "💎 Or Passif -30%",
      "📈 Régénération Troupes +50%",
    ],
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      econBuildingCostMult: 1.4,
      passiveGoldMult: 0.7,
      troopRegenMult: 1.5,
    },
  },
  {
    id: "railway_boom",
    name: "Âge d'Or Ferroviaire",
    category: "economy",
    categoryLabel: "RÉSEAU TRANSCONTINENTAL",
    icon: "🚆",
    accentColor: "#3b82f6",
    borderGlow: "rgba(59, 130, 246, 0.45)",
    lore: "L'interconnexion des corridors ferroviaires permet une rotation effrénée des convois de fret lourd.",
    strategicTip:
      "Chaque train en circulation rapporte des dividendes colossaux (x2.5) : reliez vos métropoles !",
    modifierBadges: [
      "🚂 Revenus Ferroviaires +150% (x2.5)",
      "🏗️ Coût Infrastructures -20%",
      "⚡ Vitesse d'attaque +15%",
    ],
    pulseDescription: "Logistique Rail : +30 000 Or toutes les 5s",
    minEscalationTier: 1,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      trainGoldMult: 2.5,
      econBuildingCostMult: 0.8,
      attackSpeedMult: 1.15,
    },
  },

  // --- 7. ATOMIQUE & ESCALADE DE CRISE ---
  {
    id: "radiation_monsoon",
    name: "Retombées & Pluie Radioactive",
    category: "atomic",
    categoryLabel: "DILUVIUM NUCLÉAIRE",
    icon: "☣️",
    accentColor: "#d946ef",
    borderGlow: "rgba(217, 70, 239, 0.55)",
    lore: "Des retombées radioactives massives sont entraînées par les courants de haute altitude, contaminant les no man's lands.",
    strategicTip:
      "Conquérir des territoires neutres irradiés est très meurtrier, mais les armes nucléaires bénéficient d'un soutien total.",
    modifierBadges: [
      "🚩 Pertes Terres Neutres +80%",
      "☢️ Coût Bombes & Silos -30%",
      "🚀 Vitesse Missiles +20%",
    ],
    minEscalationTier: 2,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      terraNulliusLossMult: 1.8,
      nukeAndSiloCostMult: 0.7,
      nukeSpeedMult: 1.2,
    },
  },
  {
    id: "orbital_laser_matrix",
    name: "Bombardement Cinétique Orbital",
    category: "atomic",
    categoryLabel: "SUPRÉMATIE ORBITALE",
    icon: "🛰️",
    accentColor: "#06b6d4",
    borderGlow: "rgba(6, 182, 212, 0.55)",
    lore: "Des constellations de satellites militaires déchaînent des tirs de tiges cinétiques perçant les bunkers les plus profonds.",
    strategicTip:
      "Les Postes de Défense ne peuvent résister aux frappes venant de l'orbite : anéantissez les réduits fortifiés ennemis !",
    modifierBadges: [
      "🛡️ Puissance Défense -60%",
      "🚀 Vitesse Missiles +50%",
      "🔄 Recharge Silos -40%",
    ],
    minEscalationTier: 3,
    modifiers: {
      ...DEFAULT_WORLD_EVENT_MODIFIERS,
      defensePostStrengthMult: 0.4,
      nukeSpeedMult: 1.5,
      siloCooldownMult: 0.6,
    },
  },
];

// Reference timing constants (10 ticks = 1 second)
export const WORLD_EVENT_START_DELAY_TICKS = 800; // Average ~80s initial peacetime
export const WORLD_EVENT_CYCLE_TICKS = 1600; // Average ~160s total cycle (~2.5 minutes)
export const WORLD_EVENT_CALM_TICKS = 1000; // Average ~100s calm phase
export const WORLD_EVENT_WARNING_TICKS = 140; // Average ~14s radar forecast phase
export const WORLD_EVENT_ACTIVE_TICKS = 460; // Average ~46s active event phase
export const WORLD_EVENT_PULSE_INTERVAL_TICKS = 50; // Every 5s during active phase

export interface WorldEventCycleTiming {
  calmTicks: number;
  warningTicks: number;
  activeTicks: number;
  totalTicks: number;
}

function pseudoRandomMix(base: number, salt: number): number {
  let x = (base ^ (salt * 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function getWorldEventStartDelay(
  seedString: string = "hexafront",
): number {
  const base = simpleHash(`${seedString}:start_delay`);
  const mixed = pseudoRandomMix(base, 101);
  return 750 + (mixed % 350); // 75s to 110s (~1.25 à 1.8 min de calme initial)
}

export function getWorldEventCycleTiming(
  cycleIndex: number,
  seedString: string = "hexafront",
): WorldEventCycleTiming {
  // Délais espacés (moins fréquents) et imprévisibles (pseudo-aléatoires selon la graine et le cycle) :
  const base = simpleHash(`${seedString}:cycle_timing`);
  // Calme : 80s à 140s (800 à 1400 ticks)
  const calmTicks = 800 + (pseudoRandomMix(base, cycleIndex * 3 + 1) % 600);
  // Alerte radar : 12s à 16s (120 à 160 ticks)
  const warningTicks = 120 + (pseudoRandomMix(base, cycleIndex * 3 + 2) % 40);
  // Événement actif : 40s à 60s (400 à 600 ticks)
  const activeTicks = 400 + (pseudoRandomMix(base, cycleIndex * 3 + 3) % 200);

  return {
    calmTicks,
    warningTicks,
    activeTicks,
    totalTicks: calmTicks + warningTicks + activeTicks,
  };
}

export type WorldEventPhase = "calm" | "warning" | "active";

export interface WorldEventState {
  phase: WorldEventPhase;
  cycleIndex: number;
  escalationTier: 1 | 2 | 3;
  escalationMultiplier: number;
  currentEvent: WorldEventDefinition;
  nextEvent: WorldEventDefinition;
  ticksRemainingInPhase: number;
  secondsRemainingInPhase: number;
  progressFraction: number;
  isFirstTickOfActive: boolean;
  isPulseTick: boolean;
  effectiveModifiers: WorldEventModifiers;
}

function scaleModifier(base: number, intensity: number): number {
  return 1 + (base - 1) * intensity;
}

function pickDeterministicEvent(
  cycleIndex: number,
  seedString: string,
  escalationTier: 1 | 2 | 3,
): WorldEventDefinition {
  const eligible = WORLD_EVENTS_CATALOG.filter(
    (e) => e.minEscalationTier <= escalationTier,
  );
  const base = simpleHash(`${seedString}:event_picker`);
  const mixed = pseudoRandomMix(base, cycleIndex);

  // Éviter de répéter le même événement consécutivement
  if (cycleIndex > 0 && eligible.length > 1) {
    const prevMixed = pseudoRandomMix(base, cycleIndex - 1);
    const prevIdx = prevMixed % eligible.length;
    let idx = mixed % eligible.length;
    if (idx === prevIdx) {
      idx = (idx + 1) % eligible.length;
    }
    return eligible[idx];
  }
  return eligible[mixed % eligible.length];
}

export function getEscalationTierForTick(tick: number): {
  tier: 1 | 2 | 3;
  multiplier: number;
  label: string;
} {
  // 0..3 min = Tier 1, 3..6 min = Tier 2, 6+ min = Tier 3
  if (tick < 1800) {
    return { tier: 1, multiplier: 1.0, label: "TENSION I (MODÉRÉE)" };
  }
  if (tick < 3600) {
    return { tier: 2, multiplier: 1.2, label: "TENSION II (ÉLEVÉE)" };
  }
  return { tier: 3, multiplier: 1.4, label: "TENSION III (CRITIQUE)" };
}

export function getWorldEventStateAtTick(
  tick: number,
  seedString: string = "hexafront",
  enabled: boolean = true,
): WorldEventState {
  const startDelayTicks = getWorldEventStartDelay(seedString);
  const escalation = getEscalationTierForTick(tick);

  if (!enabled || tick < startDelayTicks) {
    const firstEvent = pickDeterministicEvent(0, seedString, 1);
    const secondEvent = pickDeterministicEvent(1, seedString, 1);
    const remaining = Math.max(0, startDelayTicks - tick);
    return {
      phase: "calm",
      cycleIndex: 0,
      escalationTier: 1,
      escalationMultiplier: 1.0,
      currentEvent: firstEvent,
      nextEvent: secondEvent,
      ticksRemainingInPhase: remaining,
      secondsRemainingInPhase: Math.ceil(remaining / 10),
      progressFraction: startDelayTicks > 0 ? tick / startDelayTicks : 0,
      isFirstTickOfActive: false,
      isPulseTick: false,
      effectiveModifiers: DEFAULT_WORLD_EVENT_MODIFIERS,
    };
  }

  // Calcul déterministe du cycle actif à ce tick
  let cycleStartTick = startDelayTicks;
  let cycleIndex = 0;

  while (true) {
    const timing = getWorldEventCycleTiming(cycleIndex, seedString);
    if (tick < cycleStartTick + timing.totalTicks || cycleIndex >= 500) {
      const tickInCycle = tick - cycleStartTick;
      const currentEvent = pickDeterministicEvent(
        cycleIndex,
        seedString,
        escalation.tier,
      );
      const nextEscalation = getEscalationTierForTick(
        cycleStartTick + timing.totalTicks + 100,
      );
      const nextEvent = pickDeterministicEvent(
        cycleIndex + 1,
        seedString,
        nextEscalation.tier,
      );

      // Phase 1 : Calme (accalmie / paix relative)
      if (tickInCycle < timing.calmTicks) {
        const remaining = timing.calmTicks - tickInCycle;
        return {
          phase: "calm",
          cycleIndex,
          escalationTier: escalation.tier,
          escalationMultiplier: escalation.multiplier,
          currentEvent,
          nextEvent,
          ticksRemainingInPhase: remaining,
          secondsRemainingInPhase: Math.ceil(remaining / 10),
          progressFraction:
            timing.calmTicks > 0 ? tickInCycle / timing.calmTicks : 0,
          isFirstTickOfActive: false,
          isPulseTick: false,
          effectiveModifiers: DEFAULT_WORLD_EVENT_MODIFIERS,
        };
      }

      // Phase 2 : Alerte radar (radar météo / avertissement précurseur)
      const warningEnd = timing.calmTicks + timing.warningTicks;
      if (tickInCycle < warningEnd) {
        const tickInWarning = tickInCycle - timing.calmTicks;
        const remaining = warningEnd - tickInCycle;
        return {
          phase: "warning",
          cycleIndex,
          escalationTier: escalation.tier,
          escalationMultiplier: escalation.multiplier,
          currentEvent,
          nextEvent,
          ticksRemainingInPhase: remaining,
          secondsRemainingInPhase: Math.ceil(remaining / 10),
          progressFraction:
            timing.warningTicks > 0 ? tickInWarning / timing.warningTicks : 0,
          isFirstTickOfActive: false,
          isPulseTick: false,
          effectiveModifiers: DEFAULT_WORLD_EVENT_MODIFIERS,
        };
      }

      // Phase 3 : Événement Mondial en cours (effets tactiques & terrain)
      const tickInActive = tickInCycle - warningEnd;
      const remaining = Math.max(0, timing.activeTicks - tickInActive);
      const m = currentEvent.modifiers;
      const mult = escalation.multiplier;

      const effectiveModifiers: WorldEventModifiers = {
        passiveGoldMult: scaleModifier(m.passiveGoldMult, mult),
        tradeGoldMult: scaleModifier(m.tradeGoldMult, mult),
        trainGoldMult: scaleModifier(m.trainGoldMult, mult),
        conquerGoldMult: scaleModifier(m.conquerGoldMult, mult),
        troopRegenMult: scaleModifier(m.troopRegenMult, mult),
        cityCapacityMult: scaleModifier(m.cityCapacityMult, mult),
        attackSpeedMult: scaleModifier(m.attackSpeedMult, mult),
        attackerLossMult: Math.max(
          0.25,
          scaleModifier(m.attackerLossMult, mult),
        ),
        terraNulliusLossMult: Math.max(
          0.25,
          scaleModifier(m.terraNulliusLossMult, mult),
        ),
        defensePostStrengthMult: scaleModifier(m.defensePostStrengthMult, mult),
        defensePostCostMult: Math.max(
          0.3,
          scaleModifier(m.defensePostCostMult, mult),
        ),
        econBuildingCostMult: Math.max(
          0.4,
          scaleModifier(m.econBuildingCostMult, mult),
        ),
        nukeAndSiloCostMult: Math.max(
          0.3,
          scaleModifier(m.nukeAndSiloCostMult, mult),
        ),
        samRangeMult: Math.max(0.35, scaleModifier(m.samRangeMult, mult)),
        samCooldownMult: Math.max(0.35, scaleModifier(m.samCooldownMult, mult)),
        siloCooldownMult: Math.max(
          0.35,
          scaleModifier(m.siloCooldownMult, mult),
        ),
        nukeSpeedMult: scaleModifier(m.nukeSpeedMult, mult),
        warshipRangeMult: Math.max(
          0.4,
          scaleModifier(m.warshipRangeMult, mult),
        ),
      };

      return {
        phase: "active",
        cycleIndex,
        escalationTier: escalation.tier,
        escalationMultiplier: escalation.multiplier,
        currentEvent,
        nextEvent,
        ticksRemainingInPhase: remaining,
        secondsRemainingInPhase: Math.ceil(remaining / 10),
        progressFraction:
          timing.activeTicks > 0 ? tickInActive / timing.activeTicks : 0,
        isFirstTickOfActive: tickInActive === 0,
        isPulseTick:
          tickInActive > 0 &&
          tickInActive % WORLD_EVENT_PULSE_INTERVAL_TICKS === 0,
        effectiveModifiers,
      };
    }

    cycleStartTick += timing.totalTicks;
    cycleIndex++;
  }
}

// ============================================================================
// 3. SYSTÈME DE MÉGASTRUCTURES & SUPRÉMATIE STRATÉGIQUE
// ============================================================================

export type MegastructureId =
  | "cyber_arcology"
  | "titan_foundry"
  | "hegemon_shipyard"
  | "orbital_command"
  | "continental_dome";

export interface MegastructureDefinition {
  id: MegastructureId;
  name: string;
  icon: string;
  accentColor: string;
  requirementDesc: string;
  effectDesc: string;
  goldPerPulse: number;
  troopsPerPulse: number;
  targetCount: number;
  unitLabel: string;
}

export interface PlayerStructureCounts {
  cities: number;
  factories: number;
  ports: number;
  silos: number;
  defensesAndSam: number;
  tilesOwned: number;
  gold: number;
  troops: number;
  maxTroops: number;
}

export const MEGASTRUCTURE_DEFINITIONS: MegastructureDefinition[] = [
  {
    id: "cyber_arcology",
    name: "Arcologie Cybernétique",
    icon: "🏙️",
    accentColor: "#38bdf8",
    requirementDesc: "8+ Villes contrôlées",
    effectDesc: "+50 000 Or & +35 000 Troupes toutes les 5s",
    goldPerPulse: 50_000,
    troopsPerPulse: 35_000,
    targetCount: 8,
    unitLabel: "Villes",
  },
  {
    id: "titan_foundry",
    name: "Complexe Industriel Titan",
    icon: "🏭",
    accentColor: "#f59e0b",
    requirementDesc: "8+ Usines contrôlées",
    effectDesc: "+140 000 Or & +15 000 Troupes toutes les 5s",
    goldPerPulse: 140_000,
    troopsPerPulse: 15_000,
    targetCount: 8,
    unitLabel: "Usines",
  },
  {
    id: "hegemon_shipyard",
    name: "Chantier Naval Hégémonique",
    icon: "⚓",
    accentColor: "#06b6d4",
    requirementDesc: "7+ Ports contrôlés",
    effectDesc: "+95 000 Or & +30 000 Troupes toutes les 5s",
    goldPerPulse: 95_000,
    troopsPerPulse: 30_000,
    targetCount: 7,
    unitLabel: "Ports",
  },
  {
    id: "orbital_command",
    name: "Centre de Commandement Orbital",
    icon: "🛰️",
    accentColor: "#f43f5e",
    requirementDesc: "5+ Silos de Missiles nucléaires",
    effectDesc: "+110 000 Or & +45 000 Troupes toutes les 5s",
    goldPerPulse: 110_000,
    troopsPerPulse: 45_000,
    targetCount: 5,
    unitLabel: "Silos Atomiques",
  },
  {
    id: "continental_dome",
    name: "Dôme Énergétique Continental",
    icon: "🛡️",
    accentColor: "#10b981",
    requirementDesc: "14+ Postes de Défense et SAM",
    effectDesc: "+40 000 Or & +70 000 Troupes toutes les 5s",
    goldPerPulse: 40_000,
    troopsPerPulse: 70_000,
    targetCount: 14,
    unitLabel: "Défenses & SAM",
  },
];

export function getActiveMegastructures(
  counts: PlayerStructureCounts,
): MegastructureDefinition[] {
  const active: MegastructureDefinition[] = [];
  if (counts.cities >= MEGASTRUCTURE_DEFINITIONS[0].targetCount) {
    active.push(MEGASTRUCTURE_DEFINITIONS[0]);
  }
  if (counts.factories >= MEGASTRUCTURE_DEFINITIONS[1].targetCount) {
    active.push(MEGASTRUCTURE_DEFINITIONS[1]);
  }
  if (counts.ports >= MEGASTRUCTURE_DEFINITIONS[2].targetCount) {
    active.push(MEGASTRUCTURE_DEFINITIONS[2]);
  }
  if (counts.silos >= MEGASTRUCTURE_DEFINITIONS[3].targetCount) {
    active.push(MEGASTRUCTURE_DEFINITIONS[3]);
  }
  if (counts.defensesAndSam >= MEGASTRUCTURE_DEFINITIONS[4].targetCount) {
    active.push(MEGASTRUCTURE_DEFINITIONS[4]);
  }
  return active;
}

export interface MegastructureProgress {
  current: number;
  target: number;
  percent: number;
  isUnlocked: boolean;
  missing: number;
}

export function getMegastructureProgress(
  mega: MegastructureDefinition,
  counts: PlayerStructureCounts,
): MegastructureProgress {
  let current = 0;
  switch (mega.id) {
    case "cyber_arcology":
      current = counts.cities;
      break;
    case "titan_foundry":
      current = counts.factories;
      break;
    case "hegemon_shipyard":
      current = counts.ports;
      break;
    case "orbital_command":
      current = counts.silos;
      break;
    case "continental_dome":
      current = counts.defensesAndSam;
      break;
  }
  const target = mega.targetCount;
  const percent = Math.min(
    100,
    Math.round((current / Math.max(1, target)) * 100),
  );
  const isUnlocked = current >= target;
  const missing = Math.max(0, target - current);
  return { current, target, percent, isUnlocked, missing };
}

// ============================================================================
// 4. CONTRATS & DIRECTIVES SECRÈTES DU QG (DYNAMIC IN-GAME MISSIONS)
// ============================================================================

export type DirectiveType =
  | "expand_territory"
  | "urban_development"
  | "economic_network"
  | "troop_mobilization"
  | "perimeter_fortification"
  | "war_treasury";

export interface TacticalDirective {
  cycleIndex: number;
  type: DirectiveType;
  title: string;
  icon: string;
  description: string;
  targetValue: number;
  rewardGold: number;
  rewardTroops: number;
  rewardXp: number;
  ticksRemaining: number;
  secondsRemaining: number;
}

export const DIRECTIVE_START_TICK = 150; // 15s after start
export const DIRECTIVE_DURATION_TICKS = 900; // 90s per directive window

export function getDirectiveAtTick(
  tick: number,
  seedString: string = "hexafront",
): TacticalDirective | null {
  if (tick < DIRECTIVE_START_TICK) {
    return null;
  }
  const elapsed = tick - DIRECTIVE_START_TICK;
  const cycleIndex = Math.floor(elapsed / DIRECTIVE_DURATION_TICKS);
  const tickInCycle = elapsed % DIRECTIVE_DURATION_TICKS;
  const ticksRemaining = DIRECTIVE_DURATION_TICKS - tickInCycle;
  const secondsRemaining = Math.ceil(ticksRemaining / 10);

  let hash = 1337 + cycleIndex * 7919;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 33 + seedString.charCodeAt(i)) >>> 0;
  }

  const tier = Math.min(5, 1 + Math.floor(cycleIndex / 2));
  const types: DirectiveType[] = [
    "expand_territory",
    "urban_development",
    "economic_network",
    "troop_mobilization",
    "perimeter_fortification",
    "war_treasury",
  ];
  const chosenType = types[(hash + cycleIndex) % types.length];

  const baseRewardGold = 80_000 + tier * 45_000;
  const baseRewardTroops = 14_000 + tier * 8_000;
  const rewardXp = 100 + tier * 25;

  switch (chosenType) {
    case "expand_territory": {
      const target = 150 + cycleIndex * 180;
      return {
        cycleIndex,
        type: chosenType,
        title: "Opération Expansion",
        icon: "🗺️",
        description: `Contrôler au moins ${target} cases de territoire`,
        targetValue: target,
        rewardGold: baseRewardGold,
        rewardTroops: baseRewardTroops,
        rewardXp,
        ticksRemaining,
        secondsRemaining,
      };
    }
    case "urban_development": {
      const target = Math.min(6, 1 + Math.floor(cycleIndex / 2));
      return {
        cycleIndex,
        type: chosenType,
        title: "Urbanisation Tactique",
        icon: "🏙️",
        description: `Disposer d'au moins ${target} niveau(x) de Ville`,
        targetValue: target,
        rewardGold: baseRewardGold,
        rewardTroops: baseRewardTroops,
        rewardXp,
        ticksRemaining,
        secondsRemaining,
      };
    }
    case "economic_network": {
      const target = Math.min(6, 1 + Math.floor((cycleIndex + 1) / 2));
      return {
        cycleIndex,
        type: chosenType,
        title: "Réseau Logistique",
        icon: "⚓",
        description: `Posséder ${target} Port(s) ou Usine(s) cumulés`,
        targetValue: target,
        rewardGold: baseRewardGold + 25_000,
        rewardTroops: baseRewardTroops,
        rewardXp,
        ticksRemaining,
        secondsRemaining,
      };
    }
    case "troop_mobilization": {
      const target = 65; // 65% of maxTroops
      return {
        cycleIndex,
        type: chosenType,
        title: "Mobilisation Générale",
        icon: "⚔️",
        description: `Maintenir vos effectifs à ${target}%+ de capacité max`,
        targetValue: target,
        rewardGold: baseRewardGold,
        rewardTroops: baseRewardTroops + 6_000,
        rewardXp,
        ticksRemaining,
        secondsRemaining,
      };
    }
    case "perimeter_fortification": {
      const target = Math.min(6, 1 + Math.floor(cycleIndex / 2));
      return {
        cycleIndex,
        type: chosenType,
        title: "Périmètre Blindé",
        icon: "🛡️",
        description: `Déployer ${target} Poste(s) de Défense ou SAM`,
        targetValue: target,
        rewardGold: baseRewardGold,
        rewardTroops: baseRewardTroops + 5_000,
        rewardXp,
        ticksRemaining,
        secondsRemaining,
      };
    }
    case "war_treasury": {
      const target = 100_000 + cycleIndex * 120_000;
      return {
        cycleIndex,
        type: chosenType,
        title: "Trésor de Guerre",
        icon: "💰",
        description: `Constituer une réserve de ${Math.round(target / 1000)}k Or`,
        targetValue: target,
        rewardGold: Math.floor(baseRewardGold * 0.75),
        rewardTroops: baseRewardTroops + 12_000,
        rewardXp,
        ticksRemaining,
        secondsRemaining,
      };
    }
  }
}

export function getDirectiveCurrentValue(
  directive: TacticalDirective,
  counts: PlayerStructureCounts,
): number {
  switch (directive.type) {
    case "expand_territory":
      return counts.tilesOwned;
    case "urban_development":
      return counts.cities;
    case "economic_network":
      return counts.ports + counts.factories;
    case "troop_mobilization":
      return counts.maxTroops > 0
        ? Math.min(100, Math.floor((counts.troops / counts.maxTroops) * 100))
        : 0;
    case "perimeter_fortification":
      return counts.defensesAndSam;
    case "war_treasury":
      return counts.gold;
  }
}

// ============================================================================
// 4.1 SYSTÈME DE DIRECTIVES DU JOUR DU QG (DAILY HQ DIRECTIVES - 3 OBJECTIFS EXPONENTIELS)
// ============================================================================

export type DailyDirectiveCategory =
  | "tiles"
  | "wins"
  | "gold"
  | "troops"
  | "megastructures"
  | "defense"
  | "events"
  | "games";

export interface DailyDirectiveTemplate {
  id: string;
  tier: 1 | 2 | 3;
  category: DailyDirectiveCategory;
  title: string;
  icon: string;
  description: string;
  target: number;
  rewardCaps: number;
  rewardXp: number;
}

export interface ActiveDailyDirective extends DailyDirectiveTemplate {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyDirectivesProgress {
  date: string; // "YYYY-MM-DD"
  directives: ActiveDailyDirective[];
  allCompletedBonusClaimed: boolean;
}

export const DAILY_DIRECTIVES_ALL_CLEAR_BONUS = {
  plutonium: 1,
  caps: 25,
  xp: 45,
};

// POOL TIER 1 : OBJECTIFS ACCESSIBLES / ÉCHAUFFEMENT (10 Caps, 15 XP)
export const DAILY_DIRECTIVES_POOL_TIER_1: DailyDirectiveTemplate[] = [
  {
    id: "d1_tiles",
    tier: 1,
    category: "tiles",
    title: "Reconnaissance de Front",
    icon: "🗺️",
    description: "Conquérir au moins 200 cases de territoire en une partie.",
    target: 200,
    rewardCaps: 10,
    rewardXp: 15,
  },
  {
    id: "d1_wins",
    tier: 1,
    category: "wins",
    title: "Baptême du Feu",
    icon: "⚔️",
    description: "Remporter 1 victoire militaire sur les fronts.",
    target: 1,
    rewardCaps: 10,
    rewardXp: 15,
  },
  {
    id: "d1_gold",
    tier: 1,
    category: "gold",
    title: "Ravitaillement Rapide",
    icon: "💰",
    description: "Amasser 80 000 Or en réserve au cours d'une partie.",
    target: 80_000,
    rewardCaps: 10,
    rewardXp: 15,
  },
  {
    id: "d1_troops",
    tier: 1,
    category: "troops",
    title: "Mobilisation Initiale",
    icon: "👥",
    description: "Mobiliser au moins 80 000 troupes sous vos ordres.",
    target: 80_000,
    rewardCaps: 10,
    rewardXp: 15,
  },
  {
    id: "d1_cities",
    tier: 1,
    category: "megastructures",
    title: "Implantation Urbaine",
    icon: "🏙️",
    description: "Posséder au moins 3 niveaux de Villes ou Ports en une partie.",
    target: 3,
    rewardCaps: 10,
    rewardXp: 15,
  },
  {
    id: "d1_defense",
    tier: 1,
    category: "defense",
    title: "Sentinelle du Secteur",
    icon: "🛡️",
    description: "Construire 3 Postes de Défense ou tourelles SAM.",
    target: 3,
    rewardCaps: 10,
    rewardXp: 15,
  },
  {
    id: "d1_events",
    tier: 1,
    category: "events",
    title: "Épreuve du Feu",
    icon: "🌪️",
    description: "Survivre à 1 Événement Mondial en cours de partie.",
    target: 1,
    rewardCaps: 10,
    rewardXp: 15,
  },
  {
    id: "d1_games",
    tier: 1,
    category: "games",
    title: "Engagement au Front",
    icon: "🎖️",
    description: "Disputer 2 batailles complètes aujourd'hui.",
    target: 2,
    rewardCaps: 10,
    rewardXp: 15,
  },
];

// POOL TIER 2 : OPÉRATIONS STRATÉGIQUES INTERMÉDIAIRES (~3.5x à 4x) (20 Caps, 30 XP)
export const DAILY_DIRECTIVES_POOL_TIER_2: DailyDirectiveTemplate[] = [
  {
    id: "d2_tiles",
    tier: 2,
    category: "tiles",
    title: "Percée Opérationnelle",
    icon: "🗺️",
    description: "Conquérir au moins 800 cases de territoire en une partie.",
    target: 800,
    rewardCaps: 20,
    rewardXp: 30,
  },
  {
    id: "d2_wins",
    tier: 2,
    category: "wins",
    title: "Campagne Triomphale",
    icon: "🏆",
    description: "Triompher dans 3 victoires de guerre aujourd'hui.",
    target: 3,
    rewardCaps: 20,
    rewardXp: 30,
  },
  {
    id: "d2_gold",
    tier: 2,
    category: "gold",
    title: "Trésor de Campagne",
    icon: "💰",
    description: "Amasser 350 000 Or dans vos réserves d'état-major.",
    target: 350_000,
    rewardCaps: 20,
    rewardXp: 30,
  },
  {
    id: "d2_troops",
    tier: 2,
    category: "troops",
    title: "Division Blindée",
    icon: "👥",
    description: "Mobiliser au moins 350 000 troupes actives.",
    target: 350_000,
    rewardCaps: 20,
    rewardXp: 30,
  },
  {
    id: "d2_megas",
    tier: 2,
    category: "megastructures",
    title: "Complexe Continental",
    icon: "🏛️",
    description: "Activer au moins 1 Mégastructure mondiale en cours de partie.",
    target: 1,
    rewardCaps: 20,
    rewardXp: 30,
  },
  {
    id: "d2_defense",
    tier: 2,
    category: "defense",
    title: "Ligne Fortifiée",
    icon: "🧱",
    description: "Déployer 8 Postes de Défense ou tourelles SAM.",
    target: 8,
    rewardCaps: 20,
    rewardXp: 30,
  },
  {
    id: "d2_events",
    tier: 2,
    category: "events",
    title: "Résilience Géopolitique",
    icon: "🌋",
    description: "Traverser avec succès 3 Événements Mondiaux.",
    target: 3,
    rewardCaps: 20,
    rewardXp: 30,
  },
  {
    id: "d2_games",
    tier: 2,
    category: "games",
    title: "Vétérance Opérationnelle",
    icon: "🪖",
    description: "Participer à 4 batailles complètes aujourd'hui.",
    target: 4,
    rewardCaps: 20,
    rewardXp: 30,
  },
];

// POOL TIER 3 : DIRECTIVES SUPRÊMES & DÉFIS EXPONENTIELS (~12x à 15x) (35 Caps, 55 XP)
export const DAILY_DIRECTIVES_POOL_TIER_3: DailyDirectiveTemplate[] = [
  {
    id: "d3_tiles",
    tier: 3,
    category: "tiles",
    title: "Hégémonie Mondiale",
    icon: "🪐",
    description: "Contrôler un empire gigantesque de 2 500 cases de territoire.",
    target: 2_500,
    rewardCaps: 35,
    rewardXp: 55,
  },
  {
    id: "d3_wins",
    tier: 3,
    category: "wins",
    title: "Imperator du Jour",
    icon: "👑",
    description: "Enchaîner 5 victoires militaires écrasantes aujourd'hui.",
    target: 5,
    rewardCaps: 35,
    rewardXp: 55,
  },
  {
    id: "d3_gold",
    tier: 3,
    category: "gold",
    title: "Coffre-Fort Impérial",
    icon: "🏦",
    description: "Accumuler 1 200 000 Or en réserve au cours d'une partie.",
    target: 1_200_000,
    rewardCaps: 35,
    rewardXp: 55,
  },
  {
    id: "d3_troops",
    tier: 3,
    category: "troops",
    title: "Légion Titanesque",
    icon: "🦾",
    description: "Dépasser 1 200 000 troupes sous les drapeaux en temps réel.",
    target: 1_200_000,
    rewardCaps: 35,
    rewardXp: 55,
  },
  {
    id: "d3_megas",
    tier: 3,
    category: "megastructures",
    title: "Monopole des Merveilles",
    icon: "🌌",
    description: "Activer au moins 2 Mégastructures mondiales simultanément.",
    target: 2,
    rewardCaps: 35,
    rewardXp: 55,
  },
  {
    id: "d3_defense",
    tier: 3,
    category: "defense",
    title: "Bastion Imprenable",
    icon: "🏰",
    description: "Bâtir un réseau hermétique de 16 Postes de Défense et SAM.",
    target: 16,
    rewardCaps: 35,
    rewardXp: 55,
  },
  {
    id: "d3_events",
    tier: 3,
    category: "events",
    title: "Calvaire Cataclysmique",
    icon: "☢️",
    description: "Survivre à 7 Événements Mondiaux majeurs sans capituler.",
    target: 7,
    rewardCaps: 35,
    rewardXp: 55,
  },
  {
    id: "d3_games",
    tier: 3,
    category: "games",
    title: "Maître de Guerre Inlassable",
    icon: "🗿",
    description: "Combattre dans 7 parties de guerre aujourd'hui.",
    target: 7,
    rewardCaps: 35,
    rewardXp: 55,
  },
];

export function getDailyDirectivesSeed(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateDailyDirectives(dateStr: string): ActiveDailyDirective[] {
  const seed = getDailyDirectivesSeed(dateStr);
  const t1 = DAILY_DIRECTIVES_POOL_TIER_1[seed % DAILY_DIRECTIVES_POOL_TIER_1.length];

  let t2Idx = (seed >>> 8) % DAILY_DIRECTIVES_POOL_TIER_2.length;
  if (DAILY_DIRECTIVES_POOL_TIER_2[t2Idx].category === t1.category) {
    t2Idx = (t2Idx + 1) % DAILY_DIRECTIVES_POOL_TIER_2.length;
  }
  const t2 = DAILY_DIRECTIVES_POOL_TIER_2[t2Idx];

  let t3Idx = (seed >>> 16) % DAILY_DIRECTIVES_POOL_TIER_3.length;
  if (
    DAILY_DIRECTIVES_POOL_TIER_3[t3Idx].category === t1.category ||
    DAILY_DIRECTIVES_POOL_TIER_3[t3Idx].category === t2.category
  ) {
    t3Idx = (t3Idx + 1) % DAILY_DIRECTIVES_POOL_TIER_3.length;
    if (
      DAILY_DIRECTIVES_POOL_TIER_3[t3Idx].category === t1.category ||
      DAILY_DIRECTIVES_POOL_TIER_3[t3Idx].category === t2.category
    ) {
      t3Idx = (t3Idx + 1) % DAILY_DIRECTIVES_POOL_TIER_3.length;
    }
  }
  const t3 = DAILY_DIRECTIVES_POOL_TIER_3[t3Idx];

  return [
    { ...t1, progress: 0, completed: false, claimed: false },
    { ...t2, progress: 0, completed: false, claimed: false },
    { ...t3, progress: 0, completed: false, claimed: false },
  ];
}

// ============================================================================
// 5. SYSTÈME DE MÉDAILLES DE GUERRE & HAUTS FAITS (ACHIEVEMENTS)
// ============================================================================

export type MedalId =
  // Carrière & Victoires
  | "first_victory"
  | "veteran_5_wins"
  | "master_15_wins"
  | "warlord_50_wins"
  | "imperator_100_wins"
  | "front_veteran"
  | "veteran_25_battles"
  | "hardened_50_battles"
  | "centurion_100_battles"
  | "titan_200_battles"
  | "hexafront_legend"
  | "level_30_overlord"
  | "level_50_demigod"
  | "prestige_pioneer"
  | "prestige_veteran"
  // Conquête & Expansion
  | "hegemon"
  | "continental_dominator"
  | "world_emperor"
  | "neutral_cleanser"
  | "capital_hunter"
  | "capital_annihilator"
  // Mégastructures & Économie
  | "arcology_builder"
  | "megalopolis_ruler"
  | "industrial_tycoon"
  | "gold_billionaire"
  | "grand_admiral"
  | "naval_armada"
  | "atomic_master"
  | "atomic_rain"
  | "iron_sentinel"
  | "impenetrable_wall"
  | "iron_curtain"
  | "supreme_architect"
  | "wonder_monopolist"
  // Directives, Cataclysmes & Troupes
  | "directive_operative"
  | "directive_mastermind"
  | "cataclysm_survivor"
  | "calamity_walker"
  | "million_manpower"
  | "colossus_standing"
  // Opérations Secrètes Classifiées QG
  | "secret_phoenix"
  | "secret_pacifist"
  | "secret_nuclear_storm"
  | "secret_solitary_wolf"
  | "secret_ghost_army";

export type MedalRarity =
  | "Commun"
  | "Rare"
  | "Épique"
  | "Légendaire"
  | "Secret Défense";

export interface MedalDefinition {
  id: MedalId;
  name: string;
  icon: string;
  rarity: MedalRarity;
  rarityColor: string;
  description: string;
  xpBonus: number;
  secret?: boolean;
}

export const MEDAL_DEFINITIONS: MedalDefinition[] = [
  // --- VICTOIRES & CARRIÈRE ---
  {
    id: "first_victory",
    name: "Premier Sang Tactique",
    icon: "🏆",
    rarity: "Commun",
    rarityColor: "#38bdf8",
    description: "Remporter votre première victoire sur HexaFront.",
    xpBonus: 25,
  },
  {
    id: "veteran_5_wins",
    name: "Capitaine de Campagne",
    icon: "⚔️",
    rarity: "Commun",
    rarityColor: "#38bdf8",
    description: "Remporter 5 victoires en opérations de guerre.",
    xpBonus: 35,
  },
  {
    id: "master_15_wins",
    name: "Général de Corps d'Armée",
    icon: "⭐",
    rarity: "Rare",
    rarityColor: "#06b6d4",
    description: "Cumuler 15 victoires militaires sur les fronts.",
    xpBonus: 50,
  },
  {
    id: "warlord_50_wins",
    name: "Seigneur de Guerre Incontesté",
    icon: "👑",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Remporter 50 victoires majeures. Votre bannière inspire la terreur.",
    xpBonus: 85,
  },
  {
    id: "imperator_100_wins",
    name: "Imperator Invaincu",
    icon: "🔱",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Triompher dans 100 victoires de guerre. Une prouesse d'état-major absolu.",
    xpBonus: 150,
  },
  {
    id: "front_veteran",
    name: "Vétéran du Front",
    icon: "🎖️",
    rarity: "Commun",
    rarityColor: "#38bdf8",
    description: "Disputer au moins 5 parties sur HexaFront.",
    xpBonus: 20,
  },
  {
    id: "veteran_25_battles",
    name: "Combattant des Tranchées",
    icon: "🪖",
    rarity: "Commun",
    rarityColor: "#38bdf8",
    description: "Participer à 25 affrontements sur les théâtres d'opérations.",
    xpBonus: 30,
  },
  {
    id: "hardened_50_battles",
    name: "Vétéran Endurci",
    icon: "🛡️",
    rarity: "Rare",
    rarityColor: "#06b6d4",
    description: "Avoir combattu dans 50 batailles sans jamais abandonner le terrain.",
    xpBonus: 45,
  },
  {
    id: "centurion_100_battles",
    name: "Centurion d'Airain",
    icon: "⚜️",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Survivre à 100 batailles sur les différents secteurs du front.",
    xpBonus: 70,
  },
  {
    id: "titan_200_battles",
    name: "Légende Vivante du Conflit",
    icon: "🗿",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Disputer 200 parties. Les académies militaires étudient vos déploiements.",
    xpBonus: 120,
  },
  {
    id: "hexafront_legend",
    name: "Commandeur Suprême",
    icon: "🎖️",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Atteindre le Niveau 15 de Commandant.",
    xpBonus: 75,
  },
  {
    id: "level_30_overlord",
    name: "Grand Maréchal d'Empire",
    icon: "🦅",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Atteindre le Niveau 30 de Commandant.",
    xpBonus: 110,
  },
  {
    id: "level_50_demigod",
    name: "Stratège Démiurge",
    icon: "✨",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Atteindre le Niveau 50 de Commandant. Sommet absolu de la doctrine de guerre.",
    xpBonus: 200,
  },
  {
    id: "prestige_pioneer",
    name: "Initiation au Prestige",
    icon: "💎",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Activer votre première réinitialisation de Prestige d'officier supérieur.",
    xpBonus: 60,
  },
  {
    id: "prestige_veteran",
    name: "Maître du Renouveau Éternel",
    icon: "🌌",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Atteindre le Prestige 3. Votre prestige militaire est gravé dans l'histoire.",
    xpBonus: 130,
  },

  // --- CONQUÊTE & EXPANSION ---
  {
    id: "hegemon",
    name: "Conquérant Hégémonique",
    icon: "🗺️",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Contrôler plus de 1 500 cases de territoire au cours d'une partie.",
    xpBonus: 40,
  },
  {
    id: "continental_dominator",
    name: "Souverain Continental",
    icon: "🌍",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Contrôler au moins 3 000 cases de territoire simultanément.",
    xpBonus: 65,
  },
  {
    id: "world_emperor",
    name: "Empereur du Globe",
    icon: "🪐",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Contrôler plus de 6 000 cases de territoire dans une démonstration titanesque.",
    xpBonus: 140,
  },
  {
    id: "neutral_cleanser",
    name: "Pacification des Terres Neutres",
    icon: "🚜",
    rarity: "Rare",
    rarityColor: "#10b981",
    description: "Conquérir au moins 500 cases de terres neutres abandonnées.",
    xpBonus: 35,
  },
  {
    id: "capital_hunter",
    name: "Chasseur de Capitales",
    icon: "🎯",
    rarity: "Rare",
    rarityColor: "#06b6d4",
    description: "Capturer 3 capitales ennemies au cours d'une même partie.",
    xpBonus: 45,
  },
  {
    id: "capital_annihilator",
    name: "Fléau des Régimes",
    icon: "⚡",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Renverser 8 capitales ennemies dans une même partie.",
    xpBonus: 80,
  },

  // --- MÉGASTRUCTURES & ÉCONOMIE ---
  {
    id: "arcology_builder",
    name: "Architecte d'Arcologie",
    icon: "🏙️",
    rarity: "Rare",
    rarityColor: "#06b6d4",
    description: "Ériger la Mégastructure Arcologie Cybernétique (8+ Villes contrôlées).",
    xpBonus: 30,
  },
  {
    id: "megalopolis_ruler",
    name: "Mégalopole Démesurée",
    icon: "🌆",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Détenir un réseau urbain titanesque de 14 Villes fortifiées.",
    xpBonus: 50,
  },
  {
    id: "industrial_tycoon",
    name: "Magnat Cybernétique",
    icon: "🏭",
    rarity: "Rare",
    rarityColor: "#f59e0b",
    description: "Activer le Complexe Industriel Titan (8+ Usines) ou accumuler 1 000 000 Or.",
    xpBonus: 30,
  },
  {
    id: "gold_billionaire",
    name: "Trésor Impérial",
    icon: "💰",
    rarity: "Épique",
    rarityColor: "#f59e0b",
    description: "Accumuler plus de 1 500 000 Or dans les caisses de l'état-major.",
    xpBonus: 65,
  },
  {
    id: "grand_admiral",
    name: "Amiral des Sept Mers",
    icon: "⚓",
    rarity: "Rare",
    rarityColor: "#06b6d4",
    description: "Activer le Chantier Naval Hégémonique (7+ Ports contrôlés).",
    xpBonus: 30,
  },
  {
    id: "naval_armada",
    name: "Armada Insubmersible",
    icon: "🚢",
    rarity: "Épique",
    rarityColor: "#06b6d4",
    description: "Contrôler un chapelet maritime de 10 Ports opérationnels simultanément.",
    xpBonus: 55,
  },
  {
    id: "atomic_master",
    name: "Maître de l'Atome",
    icon: "☢️",
    rarity: "Épique",
    rarityColor: "#f43f5e",
    description: "Déployer le Centre de Commandement Orbital (5+ Silos nucléaires).",
    xpBonus: 45,
  },
  {
    id: "atomic_rain",
    name: "Déluge Nucléaire",
    icon: "🚀",
    rarity: "Épique",
    rarityColor: "#f43f5e",
    description: "Posséder au moins 7 Silos atomiques parés au tir simultané.",
    xpBonus: 60,
  },
  {
    id: "iron_sentinel",
    name: "Sentinelle Immuable",
    icon: "🛡️",
    rarity: "Rare",
    rarityColor: "#10b981",
    description: "Activer le Dôme Énergétique Continental (14+ Défenses/SAM).",
    xpBonus: 25,
  },
  {
    id: "impenetrable_wall",
    name: "Ligne Maginot Moderne",
    icon: "🧱",
    rarity: "Épique",
    rarityColor: "#10b981",
    description: "Fortifier votre territoire avec 20 Postes de Défense et tourelles SAM.",
    xpBonus: 50,
  },
  {
    id: "iron_curtain",
    name: "Bouclier Anti-Missile",
    icon: "📡",
    rarity: "Épique",
    rarityColor: "#38bdf8",
    description: "Déployer 6 systèmes sol-air SAM quadrillant l'espace aérien.",
    xpBonus: 55,
  },
  {
    id: "supreme_architect",
    name: "Architecte Suprême",
    icon: "🏛️",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Contrôler 3 Mégastructures simultanément dans une même partie.",
    xpBonus: 60,
  },
  {
    id: "wonder_monopolist",
    name: "Monopole Absolu des Merveilles",
    icon: "🌌",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Activer TOUTES les 5 Mégastructures en une même partie. Exploit quasi-impossible.",
    xpBonus: 200,
  },

  // --- DIRECTIVES, CATACLYSMES & TROUPES ---
  {
    id: "directive_operative",
    name: "Agent de Directives",
    icon: "🎯",
    rarity: "Rare",
    rarityColor: "#38bdf8",
    description: "Accomplir au moins 3 Directives Secrètes du QG.",
    xpBonus: 30,
  },
  {
    id: "directive_mastermind",
    name: "Éminence Grise du QG",
    icon: "♟️",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Accomplir avec succès 10 Directives Secrètes d'état-major.",
    xpBonus: 60,
  },
  {
    id: "cataclysm_survivor",
    name: "Survivant du Cataclysme",
    icon: "🌪️",
    rarity: "Épique",
    rarityColor: "#a855f7",
    description: "Survivre à au moins 5 Événements Mondiaux Dynamiques.",
    xpBonus: 40,
  },
  {
    id: "calamity_walker",
    name: "Forge de l'Apocalypse",
    icon: "🌋",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Endurer et traverser 20 Événements Mondiaux sans capituler.",
    xpBonus: 85,
  },
  {
    id: "million_manpower",
    name: "Légion du Million",
    icon: "👥",
    rarity: "Épique",
    rarityColor: "#38bdf8",
    description: "Mobiliser 1 000 000 troupes sous les drapeaux en temps réel.",
    xpBonus: 50,
  },
  {
    id: "colossus_standing",
    name: "Armée Titanesque",
    icon: "🦾",
    rarity: "Légendaire",
    rarityColor: "#f59e0b",
    description: "Maintenir une armée colossale de plus de 3 000 000 troupes en faction.",
    xpBonus: 100,
  },

  // --- MÉDAILLES SECRÈTES (CLASSIFIÉES QG) ---
  {
    id: "secret_phoenix",
    name: "Résurrection du Phénix",
    icon: "🔥",
    rarity: "Secret Défense",
    rarityColor: "#f43f5e",
    description: "Tomber à moins de 500 troupes / 0 capitale et remonter jusqu'à la victoire absolue.",
    xpBonus: 100,
    secret: true,
  },
  {
    id: "secret_pacifist",
    name: "Diplomate de l'Ombre",
    icon: "🕊️",
    rarity: "Secret Défense",
    rarityColor: "#f43f5e",
    description: "Passer les 3 premières minutes sans engager de joueur ennemi, puis triompher.",
    xpBonus: 80,
    secret: true,
  },
  {
    id: "secret_nuclear_storm",
    name: "Tempête Atomique Déchaînée",
    icon: "☢️",
    rarity: "Secret Défense",
    rarityColor: "#f43f5e",
    description: "Construire 5 Silos nucléaires actifs simultanément prêts à déchaîner l'atome.",
    xpBonus: 120,
    secret: true,
  },
  {
    id: "secret_solitary_wolf",
    name: "Loup Solitaire Intouchable",
    icon: "🐺",
    rarity: "Secret Défense",
    rarityColor: "#f43f5e",
    description: "Remporter une partie sans jamais former de coalition ni accepter de trêve.",
    xpBonus: 90,
    secret: true,
  },
  {
    id: "secret_ghost_army",
    name: "L'Armée Fantôme",
    icon: "👻",
    rarity: "Secret Défense",
    rarityColor: "#f43f5e",
    description: "Atteindre 1 000 000 de troupes sans jamais avoir construit une seule Usine.",
    xpBonus: 110,
    secret: true,
  },
];
