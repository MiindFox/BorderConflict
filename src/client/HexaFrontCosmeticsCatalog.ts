import {
  ColorPalette,
  CosmeticPack,
  Cosmetics,
  Crown,
  Effect,
  Flag,
  Pattern,
} from "@openfront/shared/CosmeticSchemas";
import { GameRegistry } from "@openfront/shared/GameRegistry";
import { base64url } from "jose";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * Encodes a 2D boolean grid into the OpenFront/HexaFront binary pattern format
 * (version 0, 3-byte header + packed bit array, base64url encoded).
 * Bit = 0 -> primary color, Bit = 1 -> secondary color.
 */
function encodePatternGrid(
  width: number,
  height: number,
  scale: number,
  isSecondaryPixel: (x: number, y: number) => boolean,
): string {
  const wMinus2 = Math.max(0, Math.min(127, width - 2));
  const hMinus2 = Math.max(0, Math.min(63, height - 2));
  const clampedScale = Math.max(0, Math.min(7, scale));

  const byte0 = 0;
  const byte1 = ((wMinus2 & 0x1f) << 3) | clampedScale;
  const byte2 = ((hMinus2 & 0x3f) << 2) | ((wMinus2 >> 5) & 0x03);

  const totalBits = width * height;
  const numDataBytes = (totalBits + 7) >> 3;
  const bytes = new Uint8Array(3 + numDataBytes);
  bytes[0] = byte0;
  bytes[1] = byte1;
  bytes[2] = byte2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isSecondaryPixel(x, y)) {
        const idx = y * width + x;
        const byteIndex = idx >> 3;
        const bitIndex = idx & 7;
        bytes[3 + byteIndex] |= 1 << bitIndex;
      }
    }
  }

  return base64url.encode(bytes);
}

function svgDataUri(svgContent: string): string {
  let content = svgContent.trim();
  if (!content.includes('xmlns="http://www.w3.org/2000/svg"')) {
    content = content.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }
  if (!content.includes("width=")) {
    const vbMatch = content.match(
      /viewBox=["']\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*["']/,
    );
    const w = vbMatch ? vbMatch[1] : "64";
    const h = vbMatch ? vbMatch[2] : "64";
    content = content.replace("<svg", `<svg width="${w}" height="${h}"`);
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(content)}`;
}

export const HEXAFRONT_COSMETIC_LABELS: Record<string, string> = {};

function registerLabel(prefix: string, name: string, label: string): void {
  HEXAFRONT_COSMETIC_LABELS[`${prefix}.${name}`] = label;
}

const PALETTE_DEFS: {
  name: string;
  label: string;
  primaryColor: string;
  secondaryColor: string;
}[] = [
  {
    name: "halloween_purpur",
    label: "Spectre d'Halloween",
    primaryColor: "#170326",
    secondaryColor: "#39ff14",
  },
  {
    name: "halloween_blaze",
    label: "Brasier d'Halloween",
    primaryColor: "#140500",
    secondaryColor: "#ff5500",
  },
  {
    name: "cyber_neon",
    label: "Cyber Néon",
    primaryColor: "#082f49",
    secondaryColor: "#22d3ee",
  },
  {
    name: "crimson_empire",
    label: "Empire Écarlate",
    primaryColor: "#450a0a",
    secondaryColor: "#f43f5e",
  },
  {
    name: "golden_sovereign",
    label: "Souverain Doré",
    primaryColor: "#1e1b4b",
    secondaryColor: "#fbbf24",
  },
  {
    name: "emerald_matrix",
    label: "Matrice Émeraude",
    primaryColor: "#022c22",
    secondaryColor: "#10b981",
  },
  {
    name: "void_amethyst",
    label: "Améthyste du Néant",
    primaryColor: "#1e1035",
    secondaryColor: "#c084fc",
  },
  {
    name: "arctic_frost",
    label: "Givre Arctique",
    primaryColor: "#0f172a",
    secondaryColor: "#e0f2fe",
  },
  {
    name: "solar_flare",
    label: "Éruption Solaire",
    primaryColor: "#431407",
    secondaryColor: "#fb923c",
  },
  {
    name: "toxic_rad",
    label: "Radiation Toxique",
    primaryColor: "#1a2e05",
    secondaryColor: "#a3e635",
  },
  {
    name: "stealth_obsidian",
    label: "Obsidienne Furtive",
    primaryColor: "#090d16",
    secondaryColor: "#64748b",
  },
  {
    name: "plasma_violet",
    label: "Plasma Violet",
    primaryColor: "#2e1065",
    secondaryColor: "#f472b6",
  },
  {
    name: "cobalt_strike",
    label: "Frappe Cobalt",
    primaryColor: "#172554",
    secondaryColor: "#60a5fa",
  },
  {
    name: "blood_moon",
    label: "Lune de Sang",
    primaryColor: "#18181b",
    secondaryColor: "#ef4444",
  },
  {
    name: "sakura_ronin",
    label: "Sakura Rōnin",
    primaryColor: "#3b0764",
    secondaryColor: "#f9a8d4",
  },
  {
    name: "desert_storm",
    label: "Tempête du Désert",
    primaryColor: "#422006",
    secondaryColor: "#fde047",
  },
  {
    name: "abyssal_trench",
    label: "Fosse Abyssale",
    primaryColor: "#042f2e",
    secondaryColor: "#2dd4bf",
  },
  {
    name: "magma_core",
    label: "Noyau Magmatique",
    primaryColor: "#270905",
    secondaryColor: "#f97316",
  },
  {
    name: "synthwave_sunset",
    label: "Crépuscule Synthwave",
    primaryColor: "#1e1b4b",
    secondaryColor: "#ec4899",
  },
  {
    name: "titanium_ghost",
    label: "Fantôme Titane",
    primaryColor: "#1e293b",
    secondaryColor: "#cbd5e1",
  },
  {
    name: "jade_dynasty",
    label: "Dynastie de Jade",
    primaryColor: "#064e3b",
    secondaryColor: "#6ee7b7",
  },
  {
    name: "royal_velvet",
    label: "Velours Impérial",
    primaryColor: "#31102f",
    secondaryColor: "#fcd34d",
  },
  {
    name: "copper_automaton",
    label: "Automate de Cuivre",
    primaryColor: "#291811",
    secondaryColor: "#fdba74",
  },
  {
    name: "bio_luminescence",
    label: "Bioluminescence",
    primaryColor: "#02182b",
    secondaryColor: "#4ade80",
  },
  {
    name: "starlight_aegis",
    label: "Égide Stellaire",
    primaryColor: "#0f172a",
    secondaryColor: "#a5b4fc",
  },
  {
    name: "omega_monochrome",
    label: "Monochrome Oméga",
    primaryColor: "#050505",
    secondaryColor: "#ffffff",
  },
];

const ALL_PALETTE_REFS = PALETTE_DEFS.map((p) => ({
  name: p.name,
  isArchived: false,
}));

const RARITY_PRICING: Record<Rarity, { hard: number; soft: number }> = {
  common: { hard: 79, soft: 800 },
  uncommon: { hard: 149, soft: 1400 },
  rare: { hard: 249, soft: 2400 },
  epic: { hard: 399, soft: 3800 },
  legendary: { hard: 599, soft: 5900 },
};

interface PatternSpec {
  name: string;
  label: string;
  rarity: Rarity;
  scale?: number;
  fn: (x: number, y: number) => boolean;
}

/**
 * 100 Distinct Procedural Territory Patterns across 5 Rarity Tiers (20 per tier).
 * All patterns are evaluated on a 16x16 seamless tile grid.
 */
const HUNDRED_PATTERN_SPECS: PatternSpec[] = [
  // ÉVÉNEMENT HALLOWEEN LÉGENDAIRE
  {
    name: "spider_web_necropolis",
    label: "Toile Nécromantique",
    rarity: "legendary",
    scale: 2,
    fn: (x, y) => {
      const cx = 8, cy = 8;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const dist = Math.max(dx, dy);
      if (dist === 3 || dist === 6) return true;
      if (dx === dy || x === cx || y === cy) return true;
      return false;
    },
  },
  {
    name: "cursed_pumpkin_carve",
    label: "Lanterne d'Effroi",
    rarity: "legendary",
    scale: 2,
    fn: (x, y) => {
      if ((y === 4 && (x === 4 || x === 11)) || (y === 5 && (x >= 3 && x <= 5 || x >= 10 && x <= 12))) return true;
      if (y === 7 && (x === 7 || x === 8)) return true;
      if (y === 10 && (x % 3 === 0) && x >= 3 && x <= 12) return true;
      if (y === 11 && x >= 3 && x <= 12) return true;
      if (y === 12 && (x % 3 === 1) && x >= 4 && x <= 11) return true;
      return false;
    },
  },
  // ============================================================================
  // SÉRIE I — TACTIQUE & BLINDAGE (20 COMMUNS)
  // ============================================================================
  {
    name: "hazard_stripes",
    label: "Rayures d'Assaut",
    rarity: "common",
    fn: (x, y) => (x + y) % 6 < 2,
  },
  {
    name: "tactical_checker",
    label: "Damier Blindé",
    rarity: "common",
    fn: (x, y) => ((x >> 2) + (y >> 2)) % 2 === 1,
  },
  {
    name: "chevron_march",
    label: "Chevrons de Marche",
    rarity: "common",
    fn: (x, y) => (y + Math.abs((x % 8) - 4)) % 6 < 2,
  },
  {
    name: "bunker_dots",
    label: "Rivets de Bunker",
    rarity: "common",
    fn: (x, y) => x % 4 === 1 && y % 4 === 1,
  },
  {
    name: "trench_lines",
    label: "Lignes de Tranchée",
    rarity: "common",
    fn: (x, y) => y % 4 === 0 || (y % 4 === 2 && x % 4 < 2),
  },
  {
    name: "crosshair_grid",
    label: "Quadrillage de Visée",
    rarity: "common",
    fn: (x, y) => (x % 8 === 0 && y % 2 === 0) || (y % 8 === 0 && x % 2 === 0),
  },
  {
    name: "barbed_wire",
    label: "Barbelés de Frontière",
    rarity: "common",
    fn: (x, y) => y % 8 === 4 || ((y % 8 === 3 || y % 8 === 5) && x % 4 === 2),
  },
  {
    name: "sandbag_wall",
    label: "Mur de Sacs de Sable",
    rarity: "common",
    fn: (x, y) => y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0,
  },
  {
    name: "tank_treads",
    label: "Chenilles de Char",
    rarity: "common",
    fn: (x, y) =>
      (x % 8 >= 1 && x % 8 <= 6 && y % 3 === 0) || x % 8 === 1 || x % 8 === 6,
  },
  {
    name: "radar_sweep_grid",
    label: "Grille de Balayage",
    rarity: "common",
    fn: (x, y) =>
      x === 0 ||
      y === 0 ||
      (x === 8 && y % 2 === 0) ||
      (y === 8 && x % 2 === 0),
  },
  {
    name: "steel_mesh",
    label: "Treillis d'Acier",
    rarity: "common",
    fn: (x, y) => (x + y) % 4 === 0 || (x - y + 16) % 4 === 0,
  },
  {
    name: "ammo_belts",
    label: "Bandes de Munitions",
    rarity: "common",
    fn: (x, y) => x % 4 !== 0 && y % 2 === 0,
  },
  {
    name: "camo_woodland",
    label: "Camouflage Forestier",
    rarity: "common",
    fn: (x, y) =>
      Math.sin(x * 0.7) + Math.cos(y * 0.7) + Math.sin((x + y) * 0.5) > 0.65,
  },
  {
    name: "camo_digital",
    label: "Camouflage Digital",
    rarity: "common",
    fn: (x, y) => ((x >> 1) * 7 + (y >> 1) * 13) % 5 < 2,
  },
  {
    name: "camo_splinter",
    label: "Camouflage Éclat",
    rarity: "common",
    fn: (x, y) => (x * 2 + y) % 9 < 3 && (x - y + 16) % 7 < 4,
  },
  {
    name: "deck_plate",
    label: "Tôle Larmée",
    rarity: "common",
    fn: (x, y) =>
      (x % 8 < 3 && y % 8 === 1) || (y % 8 >= 4 && y % 8 < 7 && x % 8 === 5),
  },
  {
    name: "picket_fence",
    label: "Palissade Défensive",
    rarity: "common",
    fn: (x, y) => x % 4 === 0 || y === 4 || y === 12,
  },
  {
    name: "diagonal_brace",
    label: "Renforts Diagonaux",
    rarity: "common",
    fn: (x, y) => (x - y + 16) % 6 < 2,
  },
  {
    name: "brick_fortress",
    label: "Maçonnerie de Fort",
    rarity: "common",
    fn: (x, y) => y % 4 === 0 || (x + (y >> 2) * 3) % 6 === 0,
  },
  {
    name: "sentry_posts",
    label: "Postes de Garde",
    rarity: "common",
    fn: (x, y) => x % 8 < 3 && y % 8 < 3 && !(x % 8 === 1 && y % 8 === 1),
  },

  // ============================================================================
  // SÉRIE II — INGÉNIERIE & FORTIFICATIONS (20 PEU COMMUNS)
  // ============================================================================
  {
    name: "bunker_weave",
    label: "Maillage Bunker",
    rarity: "uncommon",
    fn: (x, y) => (x % 4 === 0 && y % 2 === 0) || (y % 4 === 0 && x % 2 === 0),
  },
  {
    name: "houndstooth_armor",
    label: "Pied-de-Poule Blindé",
    rarity: "uncommon",
    fn: (x, y) => {
      const u = x % 8;
      const v = y % 8;
      return (
        (u < 4 && v < 4) ||
        (u >= 4 && v < 4 && u - 4 === v) ||
        (u < 4 && v >= 4 && u === v - 4)
      );
    },
  },
  {
    name: "herringbone_steel",
    label: "Chevrons d'Acier",
    rarity: "uncommon",
    fn: (x, y) => {
      const col = x % 8;
      return col < 4 ? (x + y) % 4 < 2 : (x - y + 16) % 4 < 2;
    },
  },
  {
    name: "honeycomb_mini",
    label: "Micro-Alvéoles",
    rarity: "uncommon",
    fn: (x, y) => {
      const r = y % 6;
      const c = (x + (y >= 6 ? 3 : 0)) % 6;
      return r === 0 || (r < 3 && (c === 0 || c === 5)) || r === 3;
    },
  },
  {
    name: "bastion_corners",
    label: "Angles de Bastion",
    rarity: "uncommon",
    fn: (x, y) => {
      const a = Math.min(x, 15 - x);
      const b = Math.min(y, 15 - y);
      return (a <= 3 && b === 0) || (b <= 3 && a === 0) || (a === 3 && b === 3);
    },
  },
  {
    name: "citadel_gates",
    label: "Portes de Citadelle",
    rarity: "uncommon",
    fn: (x, y) =>
      x === 2 ||
      x === 13 ||
      (x >= 2 && x <= 13 && (y === 2 || (y >= 6 && y <= 15 && x % 3 === 0))),
  },
  {
    name: "chainlink_fence",
    label: "Mailles de Chaîne",
    rarity: "uncommon",
    fn: (x, y) => {
      const d = Math.abs((x % 8) - 3.5) + Math.abs((y % 8) - 3.5);
      return d >= 2.8 && d <= 4.2;
    },
  },
  {
    name: "turbine_blades",
    label: "Pales de Turbine",
    rarity: "uncommon",
    fn: (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const angle = Math.atan2(dy, dx) + Math.hypot(dx, dy) * 0.35;
      return Math.sin(angle * 3) > 0.4;
    },
  },
  {
    name: "industrial_gears",
    label: "Rouages Industriels",
    rarity: "uncommon",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const a = Math.atan2(y - 7.5, x - 7.5);
      return (d >= 3 && d <= 5) || (d > 5 && d <= 6.8 && Math.sin(a * 8) > 0.2);
    },
  },
  {
    name: "rail_tie_grid",
    label: "Traverses Ferroviaires",
    rarity: "uncommon",
    fn: (x, y) => x === 4 || x === 11 || (x >= 2 && x <= 13 && y % 3 === 0),
  },
  {
    name: "sonar_rings",
    label: "Anneaux Sonar",
    rarity: "uncommon",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      return Math.floor(d) === 2 || Math.floor(d) === 5 || (x === 7 && y === 7);
    },
  },
  {
    name: "shield_chevrons",
    label: "Écussons Défensifs",
    rarity: "uncommon",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        Math.abs(y - (3 + dx * 0.8)) < 1.2 || Math.abs(y - (8 + dx * 0.8)) < 1.2
      );
    },
  },
  {
    name: "lattice_tower",
    label: "Pylône Treillis",
    rarity: "uncommon",
    fn: (x, y) =>
      x === 0 || x === 15 || y === 0 || y === 15 || x === y || x === 15 - y,
  },
  {
    name: "cargo_containers",
    label: "Conteneurs Logistiques",
    rarity: "uncommon",
    fn: (x, y) =>
      y % 8 === 0 || x % 8 === 0 || (y % 8 >= 2 && y % 8 <= 5 && x % 2 === 0),
  },
  {
    name: "wind_rose_simple",
    label: "Boussole Tactique",
    rarity: "uncommon",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (dx < 1 && dy < 7) || (dy < 1 && dx < 7) || dx + dy < 3;
    },
  },
  {
    name: "truss_bridge",
    label: "Pont Métallique",
    rarity: "uncommon",
    fn: (x, y) =>
      y === 0 ||
      y === 7 ||
      y === 8 ||
      y === 15 ||
      (x + y) % 8 === 0 ||
      (x - y + 16) % 8 === 0,
  },
  {
    name: "vault_locks",
    label: "Verrous de Coffre",
    rarity: "uncommon",
    fn: (x, y) => {
      const b = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      return (
        (b >= 4.5 && b <= 5.5) ||
        (b <= 2.5 && (x === 7 || x === 8 || y === 7 || y === 8))
      );
    },
  },
  {
    name: "cooling_vents",
    label: "Grilles d'Aération",
    rarity: "uncommon",
    fn: (x, y) => x >= 2 && x <= 13 && y % 2 === 0 && x !== 7 && x !== 8,
  },
  {
    name: "segmented_plates",
    label: "Plaques Segmentées",
    rarity: "uncommon",
    fn: (x, y) => {
      const gx = x % 8;
      const gy = y % 8;
      return gx === 0 || gy === 0 || (gx === 7 && gy === 7);
    },
  },
  {
    name: "reactor_rods",
    label: "Barres de Réacteur",
    rarity: "uncommon",
    fn: (x, y) =>
      (x % 4 === 1 || x % 4 === 2) && y >= 1 && y <= 14 && y !== 7 && y !== 8,
  },

  // ============================================================================
  // SÉRIE III — DIVISIONS & HÉRALDIQUE MILITAIRE (20 RARES)
  // ============================================================================
  {
    name: "hex_grid",
    label: "Grille Hexagonale",
    rarity: "rare",
    fn: (x, y) => {
      const row = y % 8;
      const col = (x + (y >= 8 ? 4 : 0)) % 8;
      return (
        row === 0 ||
        (row < 4 && (col === 0 || col === 7)) ||
        (row === 4 && col >= 1 && col <= 6)
      );
    },
  },
  {
    name: "imperial_cross",
    label: "Croix Impériale",
    rarity: "rare",
    fn: (x, y) => {
      const cx = Math.abs(x - 7.5);
      const cy = Math.abs(y - 7.5);
      return (cx < 2 && cy < 6) || (cy < 2 && cx < 6);
    },
  },
  {
    name: "diamond_matrix",
    label: "Matrice Diamant",
    rarity: "rare",
    fn: (x, y) => {
      const d = Math.abs((x % 8) - 3.5) + Math.abs((y % 8) - 3.5);
      return d >= 2.5 && d <= 3.8;
    },
  },
  {
    name: "maltese_valor",
    label: "Croix de Bravoure",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        (dx <= dy && dy <= 6 && dx <= 2.5 && dy >= 1.5) ||
        (dy <= dx && dx <= 6 && dy <= 2.5 && dx >= 1.5)
      );
    },
  },
  {
    name: "fleur_de_guerre",
    label: "Lys de Guerre",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        (dx < 1.2 && y >= 2 && y <= 13) ||
        (y >= 5 && y <= 9 && dx >= 2 && dx <= 4.5) ||
        (y === 10 && dx <= 5)
      );
    },
  },
  {
    name: "iron_eagle_wings",
    label: "Ailes d'Acier",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        (dx < 1.5 && y >= 3 && y <= 12) ||
        (y >= 4 &&
          y <= 9 &&
          dx >= 2 &&
          dx <= 6.5 &&
          (y + Math.floor(dx)) % 2 === 0)
      );
    },
  },
  {
    name: "spartan_lambda",
    label: "Lambda Spartiate",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return y >= 2 && y <= 13 && Math.abs(dx - (y - 2) * 0.5) < 1.3;
    },
  },
  {
    name: "shogun_crest",
    label: "Mon de Shogun",
    rarity: "rare",
    fn: (x, y) => {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      return (d >= 5.5 && d <= 7) || (d >= 2 && d <= 3.5);
    },
  },
  {
    name: "nordic_valknut",
    label: "Runes Nordiques",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        Math.abs(dx - dy) < 1.1 ||
        (dx < 1 && dy < 6.5) ||
        (dy === 4.5 && dx < 4.5)
      );
    },
  },
  {
    name: "celtic_knotwork",
    label: "Entrelacs Celtiques",
    rarity: "rare",
    fn: (x, y) =>
      ((x + y) % 4 === 0 && (x - y + 16) % 4 !== 2) ||
      ((x - y + 16) % 4 === 0 && (x + y) % 4 !== 2),
  },
  {
    name: "byzantine_mosaic",
    label: "Mosaïque Impériale",
    rarity: "rare",
    fn: (x, y) => {
      const u = Math.abs((x % 8) - 3.5);
      const v = Math.abs((y % 8) - 3.5);
      return u + v < 2.2 || (u > 2.2 && v > 2.2);
    },
  },
  {
    name: "pharaoh_ankh",
    label: "Sceau des Pharaons",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const loop = Math.hypot(dx, y - 4.5);
      return (
        (loop >= 2 && loop <= 3.3) ||
        (y === 8 && dx <= 4.5) ||
        (y >= 8 && y <= 14 && dx < 1.2)
      );
    },
  },
  {
    name: "aztec_step_fret",
    label: "Frise Aztèque",
    rarity: "rare",
    fn: (x, y) => {
      const step = Math.floor(y / 2) % 4;
      return x % 8 === step || y % 4 === 0;
    },
  },
  {
    name: "greek_meander",
    label: "Méandre Antique",
    rarity: "rare",
    fn: (x, y) => {
      const u = x % 8;
      const v = y % 8;
      return (
        v === 0 ||
        v === 7 ||
        (u === 0 && v <= 5) ||
        (v === 5 && u <= 5) ||
        (u === 5 && v >= 2 && v <= 5) ||
        (v === 2 && u >= 2 && u <= 5)
      );
    },
  },
  {
    name: "templar_shield",
    label: "Bouclier des Ordres",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const inShield =
        y >= 2 && y <= 13 && dx <= 6 - Math.max(0, (y - 7) * 0.8);
      const border =
        y === 2 || Math.abs(dx - (6 - Math.max(0, (y - 7) * 0.8))) < 1.1;
      return inShield && (border || dx < 1.1 || y === 6);
    },
  },
  {
    name: "legion_standard",
    label: "Étendard Légionnaire",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return dx < 1 || y === 2 || (y >= 4 && y <= 10 && Math.abs(dx - 4.5) < 1);
    },
  },
  {
    name: "crown_monogram",
    label: "Monogramme Royal",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        (y >= 10 && y <= 12 && dx <= 5.5) ||
        (y >= 4 &&
          y <= 10 &&
          (dx < 1 ||
            Math.abs(dx - 5) < 1 ||
            Math.abs(dx - (10 - y) * 0.7) < 0.9))
      );
    },
  },
  {
    name: "star_of_command",
    label: "Étoile de Commandement",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        (dx < 1.2 && dy < 6.5) ||
        (dy < 1.2 && dx < 6.5) ||
        (dx + dy < 5.5 && dx + dy > 3.5)
      );
    },
  },
  {
    name: "double_chevron_elite",
    label: "Double Chevron d'Élite",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return Math.abs(y - (11 - dx)) < 1.3 || Math.abs(y - (7 - dx)) < 1.3;
    },
  },
  {
    name: "anchor_armada",
    label: "Ancre de l'Armada",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        (dx < 1.2 && y >= 3 && y <= 13) ||
        (y === 5 && dx <= 3.5) ||
        (y >= 10 && y <= 13 && Math.abs(Math.hypot(dx, y - 9) - 4.5) < 1.1)
      );
    },
  },

  // ============================================================================
  // SÉRIE IV — CYBERNÉTIQUE & HAUTE TECHNOLOGIE (20 ÉPIQUES)
  // ============================================================================
  {
    name: "cyber_circuit",
    label: "Circuit Cybernétique",
    rarity: "epic",
    fn: (x, y) => {
      if ((x === 2 || x === 10) && y >= 2 && y <= 13) return true;
      if ((y === 4 || y === 12) && x >= 2 && x <= 14) return true;
      if ((x === 6 && y === 6) || (x === 13 && y === 9)) return true;
      return false;
    },
  },
  {
    name: "radar_waves",
    label: "Ondes Radar",
    rarity: "epic",
    fn: (x, y) => {
      const dist = Math.hypot(x - 7.5, y - 7.5);
      return (
        (dist >= 2.2 && dist <= 3.4) ||
        (dist >= 5.5 && dist <= 6.7) ||
        x === 8 ||
        y === 8
      );
    },
  },
  {
    name: "matrix_rain",
    label: "Pluie Matricielle",
    rarity: "epic",
    fn: (x, y) => x % 2 === 0 && (y + x * 3) % 7 < 4 && (y + x * 5) % 3 !== 0,
  },
  {
    name: "microchip_bus",
    label: "Bus Microprocesseur",
    rarity: "epic",
    fn: (x, y) => {
      const b = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (b <= 3.5) return b >= 2.5 || (x === 7 && y === 7);
      return (
        (x % 2 === 0 && (x === 6 || x === 8 || x === 10)) ||
        (y % 2 === 0 && (y === 6 || y === 8 || y === 10))
      );
    },
  },
  {
    name: "holo_triangles",
    label: "Triangles Holographiques",
    rarity: "epic",
    fn: (x, y) => {
      const v = y % 8;
      const u = Math.abs((x % 8) - 3.5);
      return v === 7 || Math.abs(u - v * 0.5) < 0.8;
    },
  },
  {
    name: "laser_interlock",
    label: "Interférences Laser",
    rarity: "epic",
    fn: (x, y) => (x + y * 2) % 7 === 0 || (x * 2 - y + 32) % 7 === 0,
  },
  {
    name: "dna_double_helix",
    label: "Double Hélice ADN",
    rarity: "epic",
    fn: (x, y) => {
      const s1 = 7.5 + Math.sin((y / 16) * Math.PI * 2) * 4.5;
      const s2 = 7.5 - Math.sin((y / 16) * Math.PI * 2) * 4.5;
      return (
        Math.abs(x - s1) < 1.2 ||
        Math.abs(x - s2) < 1.2 ||
        (y % 3 === 0 && x >= Math.min(s1, s2) && x <= Math.max(s1, s2))
      );
    },
  },
  {
    name: "plasma_conduits",
    label: "Conduits de Plasma",
    rarity: "epic",
    fn: (x, y) => {
      const wave = Math.sin((x / 16) * Math.PI * 2) * 2.5;
      return Math.abs((y % 8) - 4 - wave * 0.6) < 1.3;
    },
  },
  {
    name: "quantum_qubits",
    label: "Réseau de Qubits",
    rarity: "epic",
    fn: (x, y) => {
      const u = (x % 8) - 3.5;
      const v = (y % 8) - 3.5;
      const d = Math.abs(u) + Math.abs(v);
      return (
        (d >= 2 && d <= 3) ||
        (Math.abs(u) < 0.8 && Math.abs(v) < 0.8) ||
        x % 8 === 0 ||
        y % 8 === 0
      );
    },
  },
  {
    name: "neural_synapse",
    label: "Synapses Neuronales",
    rarity: "epic",
    fn: (x, y) => {
      const d1 = Math.hypot(x - 4, y - 4);
      const d2 = Math.hypot(x - 12, y - 12);
      return (
        d1 < 2.2 ||
        d2 < 2.2 ||
        Math.abs(x - y) < 1.1 ||
        Math.abs(x + y - 16) < 1.1
      );
    },
  },
  {
    name: "cryo_crystals",
    label: "Cristaux Cryogéniques",
    rarity: "epic",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        dx < 0.9 ||
        dy < 0.9 ||
        Math.abs(dx - dy) < 0.9 ||
        Math.abs(dx + dy - 5) < 0.8
      );
    },
  },
  {
    name: "orbital_telemetry",
    label: "Télémétrie Orbitale",
    rarity: "epic",
    fn: (x, y) => {
      const ell = Math.hypot((x - 7.5) * 0.8, (y - 7.5) * 1.4);
      const ell2 = Math.hypot((x - 7.5) * 1.4, (y - 7.5) * 0.8);
      return (
        Math.abs(ell - 5) < 0.9 ||
        Math.abs(ell2 - 5) < 0.9 ||
        Math.hypot(x - 7.5, y - 7.5) < 1.5
      );
    },
  },
  {
    name: "glitch_scanlines",
    label: "Scanlines Glitch",
    rarity: "epic",
    fn: (x, y) => {
      const shift = (y * 5) % 7;
      return y % 2 === 0 && (x + shift) % 8 < 5;
    },
  },
  {
    name: "synth_perspective",
    label: "Grille Synthwave",
    rarity: "epic",
    fn: (x, y) =>
      y === 4 ||
      y === 8 ||
      y === 11 ||
      y === 13 ||
      y === 15 ||
      Math.abs(x - 7.5) === Math.floor(y * 0.45),
  },
  {
    name: "biohazard_seal",
    label: "Sceau Bio-Danger",
    rarity: "epic",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const a = Math.atan2(y - 7.5, x - 7.5);
      return (
        (d >= 2.2 && d <= 6.2 && Math.cos(a * 3) > 0.15) ||
        (d >= 1.2 && d <= 2.0)
      );
    },
  },
  {
    name: "radiation_trefoil",
    label: "Trèfle Radioactif",
    rarity: "epic",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const a = Math.atan2(y - 7.5, x - 7.5);
      return d < 1.6 || (d >= 2.8 && d <= 6.5 && Math.sin(a * 3) > 0.25);
    },
  },
  {
    name: "emp_shockwave",
    label: "Onde de Choc IEM",
    rarity: "epic",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const wave = Math.sin(d * 1.8 + Math.atan2(y - 7.5, x - 7.5) * 4);
      return wave > 0.45;
    },
  },
  {
    name: "drone_swarm_hex",
    label: "Essaim de Drones",
    rarity: "epic",
    fn: (x, y) => {
      const u = (x % 4) - 1.5;
      const v = (y % 4) - 1.5;
      return (
        Math.abs(u) + Math.abs(v) <= 1.5 && ((x >> 2) + (y >> 2)) % 2 === 0
      );
    },
  },
  {
    name: "satellite_array",
    label: "Panneaux Solaires",
    rarity: "epic",
    fn: (x, y) =>
      x === 7 || x === 8 || (x !== 0 && x !== 15 && y % 3 !== 0 && x % 3 !== 0),
  },
  {
    name: "fusion_torus",
    label: "Tore de Fusion",
    rarity: "epic",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      return d >= 2.5 && d <= 6.5 && Math.floor(d + (x + y) * 0.25) % 2 === 0;
    },
  },

  // ============================================================================
  // SÉRIE V — SUPRÉMATIE & COSMOLOGIE LÉGENDAIRE (20 LÉGENDAIRES)
  // ============================================================================
  {
    name: "nova_star",
    label: "Étoile Supernova",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        dx + dy < 4.5 ||
        (dx < 1.2 && dy < 7.2) ||
        (dy < 1.2 && dx < 7.2) ||
        Math.abs(dx - dy) < 1.0
      );
    },
  },
  {
    name: "quantum_maze",
    label: "Labyrinthe Quantique",
    rarity: "legendary",
    fn: (x, y) => {
      const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      return Math.floor(ring) % 2 === 1 && !(x === 8 && y > 8);
    },
  },
  {
    name: "sacred_mandala",
    label: "Mandala Cosmique",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      return Math.abs(d - (4 + Math.cos(a * 6) * 2)) < 1.1 || d < 1.8;
    },
  },
  {
    name: "black_hole_vortex",
    label: "Vortex Trou Noir",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      return d > 1.8 && Math.sin(a * 2 + d * 0.9) > 0.35;
    },
  },
  {
    name: "celestial_sunburst",
    label: "Rayonnement Céleste",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      return d < 2.5 || Math.cos(a * 8) > 0.45;
    },
  },
  {
    name: "phoenix_ascension",
    label: "Ascension du Phénix",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const wingY = 12 - dx * 1.1;
      return (
        (dx < 1.2 && y >= 2 && y <= 14) ||
        (dx >= 1.5 && dx <= 7 && Math.abs(y - wingY) < 1.8) ||
        (dx >= 2 && dx <= 5 && Math.abs(y - (wingY - 3)) < 1.2)
      );
    },
  },
  {
    name: "dragon_scales_mythic",
    label: "Écailles de Dragon",
    rarity: "legendary",
    fn: (x, y) => {
      const row = Math.floor(y / 4);
      const ox = (x + (row % 2) * 4) % 8;
      const oy = y % 4;
      const d = Math.hypot(ox - 3.5, oy);
      return d >= 2.8 && d <= 4.3;
    },
  },
  {
    name: "infinity_ouroboros",
    label: "Boucle de l'Infini",
    rarity: "legendary",
    fn: (x, y) => {
      const d1 = Math.hypot(x - 4.5, y - 7.5);
      const d2 = Math.hypot(x - 10.5, y - 7.5);
      return (d1 >= 2.2 && d1 <= 3.8) || (d2 >= 2.2 && d2 <= 3.8);
    },
  },
  {
    name: "hypercube_tesseract",
    label: "Tesseract 4D",
    rarity: "legendary",
    fn: (x, y) => {
      const b = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      const diag = Math.abs(Math.abs(x - 7.5) - Math.abs(y - 7.5));
      return (
        Math.abs(b - 6.5) < 0.7 ||
        Math.abs(b - 2.8) < 0.7 ||
        (b >= 2.8 && b <= 6.5 && diag < 0.9)
      );
    },
  },
  {
    name: "fractal_sierpinski",
    label: "Fractale Suprême",
    rarity: "legendary",
    fn: (x, y) => (x & y) === 0,
  },
  {
    name: "galaxy_spiral",
    label: "Spirale Galactique",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      return d < 2.0 || Math.cos(a * 3 - d * 0.75) > 0.4;
    },
  },
  {
    name: "omega_throne_seal",
    label: "Sceau du Trône Oméga",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const d = Math.hypot(dx, y - 6.5);
      return (
        (d >= 3.5 && d <= 5.2 && y <= 10) ||
        (y === 12 && dx >= 2 && dx <= 6) ||
        (y >= 10 && y <= 12 && Math.abs(dx - 2.5) < 0.9)
      );
    },
  },
  {
    name: "archangel_halo_grid",
    label: "Halo Séraphique",
    rarity: "legendary",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        (d >= 4.5 && d <= 5.8) ||
        (dx + dy <= 3.2 && dx + dy >= 1.8) ||
        dx < 0.8 ||
        dy < 0.8
      );
    },
  },
  {
    name: "chronos_hourglass",
    label: "Sablier de Chronos",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        dy === 6.5 ||
        (dy <= 6.5 && (Math.abs(dx - dy) < 1.1 || (dx < dy && y > 7)))
      );
    },
  },
  {
    name: "leviathan_ripples",
    label: "Ondes du Léviathan",
    rarity: "legendary",
    fn: (x, y) =>
      Math.sin(x * 0.8 + Math.sin(y * 0.8) * 2) * Math.cos(y * 0.8) > 0.25,
  },
  {
    name: "valkyrie_spearhead",
    label: "Lances des Valkyries",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        (dx < 1.0 && y >= 1 && y <= 14) ||
        Math.abs(dx - y * 0.45) < 1.0 ||
        (y === 11 && dx <= 4)
      );
    },
  },
  {
    name: "eclipse_corona",
    label: "Couronne d'Éclipse",
    rarity: "legendary",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const a = Math.atan2(y - 7.5, x - 7.5);
      return d >= 3.2 && d <= 5.2 + Math.sin(a * 10) * 1.2;
    },
  },
  {
    name: "astral_constellation",
    label: "Constellation Astrale",
    rarity: "legendary",
    fn: (x, y) => {
      const stars =
        (x === 3 && y === 3) ||
        (x === 12 && y === 4) ||
        (x === 8 && y === 8) ||
        (x === 4 && y === 13) ||
        (x === 13 && y === 12);
      const lines =
        Math.abs(x - y) < 0.8 ||
        (y >= 4 && y <= 8 && Math.abs(x - (16 - y)) < 0.9);
      return stars || lines;
    },
  },
  {
    name: "sovereign_labyrinth",
    label: "Dédale du Souverain",
    rarity: "legendary",
    fn: (x, y) => {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      return (Math.floor(d) % 2 === 0 && d <= 9) || x === 0 || y === 0;
    },
  },
  {
    name: "hexafront_apotheosis",
    label: "Apothéose BorderConflict",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      const hex = Math.max(dx, dx * 0.5 + dy * 0.866);
      return (
        (hex >= 5.2 && hex <= 6.6) ||
        (hex >= 2.4 && hex <= 3.5) ||
        hex < 1.2 ||
        Math.abs(dx - dy) < 0.75
      );
    },
  },
  {
    name: "hypercube_tesseract",
    label: "Tesseract Hypercube",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (
        (dx <= 5 && dy <= 5 && (dx === 5 || dy === 5)) ||
        (dx <= 2 && dy <= 2 && (dx === 2 || dy === 2)) ||
        Math.abs(dx - dy) < 0.8
      );
    },
  },
  {
    name: "supernova_blast",
    label: "Souffle de Supernova",
    rarity: "legendary",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const a = Math.atan2(y - 7.5, x - 7.5);
      return d < 2.0 || Math.sin(a * 10 - d * 0.8) > 0.45;
    },
  },
  {
    name: "chono_warp_weave",
    label: "Tissage Chrono-Warp",
    rarity: "legendary",
    fn: (x, y) =>
      Math.sin(x * 0.9 + y * 0.4) * Math.cos(x * 0.4 - y * 0.9) > 0.25,
  },
  {
    name: "quantum_fractal_tree",
    label: "Arbre Fractal Quantique",
    rarity: "legendary",
    fn: (x, y) => (x ^ y) % 5 === 0 || (x + y * 3) % 7 === 0,
  },
  {
    name: "seraph_sacred_wings",
    label: "Ailes Séraphiques Sacrées",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        (dx < 1.2 && y >= 1) ||
        Math.abs(y - (14 - dx * 1.2)) < 1.2 ||
        (dx >= 3 && Math.abs(y - (10 - dx * 0.8)) < 1.0)
      );
    },
  },
  {
    name: "singularity_accretion",
    label: "Disque d'Accrétion",
    rarity: "legendary",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      return (
        (d >= 2 && d <= 3.2) || (d >= 4.5 && d <= 5.8) || (d >= 6.8 && d <= 7.4)
      );
    },
  },
  {
    name: "omega_monolith_seal",
    label: "Sceau du Monolithe Oméga",
    rarity: "legendary",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return (
        (dx <= 3 && y >= 3 && y <= 13) ||
        (dx <= 6 && (y === 3 || y === 13)) ||
        (dx === 6 && y >= 6 && y <= 10)
      );
    },
  },
  {
    name: "valkyrie_runic_ring",
    label: "Rune Runique Valkyrie",
    rarity: "legendary",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      const a = Math.atan2(y - 7.5, x - 7.5);
      return Math.abs(d - 5) < 1.2 && Math.cos(a * 8) > 0.1;
    },
  },
  {
    name: "stellar_constellation",
    label: "Constellation Cosmique",
    rarity: "legendary",
    fn: (x, y) =>
      (x % 4 === 1 && y % 4 === 1) || Math.abs(x - y) === 3 || x + y === 15,
  },
  {
    name: "apex_predator_scales",
    label: "Écailles du Prédateur Apex",
    rarity: "legendary",
    fn: (x, y) => {
      const u = (x + (y % 2) * 2) % 4;
      return u === 1 || u === 2;
    },
  },
  {
    name: "plasma_lightning_grid",
    label: "Éclairs de Plasma",
    rarity: "epic",
    fn: (x, y) =>
      (x * 3 + y * 7) % 11 < 3 || Math.abs(x - 7.5) === Math.abs(y - 7.5),
  },
  {
    name: "tachyon_circuit",
    label: "Circuit Tachyon",
    rarity: "epic",
    fn: (x, y) =>
      (x % 3 === 0 && y % 2 === 0) || (y % 6 === 0 && x >= 4 && x <= 12),
  },
  {
    name: "hex_honeycomb_pulse",
    label: "Ruche Cybernétique",
    rarity: "epic",
    fn: (x, y) =>
      ((x + (y >> 1)) % 3 === 0 && y % 2 === 0) || (x % 3 === 0 && y % 2 === 1),
  },
  {
    name: "vortex_maelstrom",
    label: "Maelström Océanique",
    rarity: "epic",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      return Math.sin(d * 1.5 + Math.atan2(y - 7.5, x - 7.5) * 3) > 0.35;
    },
  },
  {
    name: "titan_armor_plates",
    label: "Blindage Titan",
    rarity: "epic",
    fn: (x, y) => x === 0 || y === 0 || x === 8 || y === 8 || (x + y) % 6 === 0,
  },
  {
    name: "solar_flare_loops",
    label: "Boucles Coronales",
    rarity: "epic",
    fn: (x, y) => {
      const dx = x - 7.5;
      const dy = y - 7.5;
      return Math.abs(dx * dx + dy * dy - 25) < 7 && Math.abs(dx) > 1;
    },
  },
  {
    name: "void_interference",
    label: "Interférence du Néant",
    rarity: "epic",
    fn: (x, y) => (x * y) % 9 < 3 || (x + y) % 7 === 0,
  },
  {
    name: "bio_matrix_mesh",
    label: "Treillis Bio-Matrice",
    rarity: "epic",
    fn: (x, y) => (x % 4 === 0 && y % 2 === 0) || (x % 2 === 0 && y % 4 === 0),
  },
  {
    name: "cyber_hazard_cross",
    label: "Croix de Danger Cyber",
    rarity: "epic",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      return (dx <= 6 && dy <= 2) || (dy <= 6 && dx <= 2);
    },
  },
  {
    name: "emp_core_rings",
    label: "Noyau IEM Résonant",
    rarity: "epic",
    fn: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      return Math.floor(d) === 2 || Math.floor(d) === 4 || Math.floor(d) === 6;
    },
  },
  {
    name: "radar_sweep_lines",
    label: "Balayage Radar",
    rarity: "rare",
    fn: (x, y) => {
      const a = Math.atan2(y - 7.5, x - 7.5);
      return Math.abs(a - 0.7) < 0.25 || Math.hypot(x - 7.5, y - 7.5) === 5;
    },
  },
  {
    name: "artillery_crosshairs",
    label: "Réticule d'Artillerie",
    rarity: "rare",
    fn: (x, y) =>
      x === 7 || y === 7 || Math.abs(Math.hypot(x - 7.5, y - 7.5) - 4) < 0.9,
  },
  {
    name: "tactical_camo_digital",
    label: "Camouflage Digital",
    rarity: "rare",
    fn: (x, y) =>
      ((x >> 1) + (y >> 1)) % 3 === 0 || (x % 5 === 0 && y % 3 === 0),
  },
  {
    name: "reinforced_bulkhead",
    label: "Cloison Cuirassée",
    rarity: "rare",
    fn: (x, y) =>
      x === 3 ||
      x === 12 ||
      y === 3 ||
      y === 12 ||
      (x >= 4 && x <= 11 && y >= 4 && y <= 11 && (x === y || x === 15 - y)),
  },
  {
    name: "supply_depot_grid",
    label: "Grille Logistique",
    rarity: "rare",
    fn: (x, y) => (x % 3 === 0 || y % 3 === 0) && !(x % 6 === 0 && y % 6 === 0),
  },
  {
    name: "energy_shield_lattice",
    label: "Réseau de Bouclier",
    rarity: "rare",
    fn: (x, y) => Math.abs(x - y) % 4 === 0 || (x + y) % 4 === 0,
  },
  {
    name: "desert_sand_ripples",
    label: "Rides de Sable",
    rarity: "rare",
    fn: (x, y) => Math.sin(x * 0.6 + Math.sin(y * 0.4) * 1.5) > 0.3,
  },
  {
    name: "arctic_ice_cracks",
    label: "Fractures de Banquise",
    rarity: "rare",
    fn: (x, y) => (x * 2 + y * 3) % 7 === 1 || (x * 3 - y * 2) % 8 === 2,
  },
  {
    name: "naval_anchor_pattern",
    label: "Motif d'Ancre Marine",
    rarity: "rare",
    fn: (x, y) =>
      (x === 7 && y >= 3 && y <= 12) ||
      (y === 11 && Math.abs(x - 7.5) <= 4) ||
      (y === 5 && Math.abs(x - 7.5) <= 3),
  },
  {
    name: "command_diamond_chevron",
    label: "Chevrons de Commandement",
    rarity: "rare",
    fn: (x, y) => {
      const dx = Math.abs(x - 7.5);
      return Math.abs(y - dx) < 1.1 || Math.abs(y - (dx + 4)) < 1.1;
    },
  },
];

interface CrownSpec {
  name: string;
  label: string;
  rarity: Rarity;
  svg: string;
}

/**
 * 20 Distinct SVG Crowns across all 5 rarities.
 */
const TWENTY_CROWN_SPECS: CrownSpec[] = [
  // HALLOWEEN LÉGENDAIRE
  {
    name: "crown_spectral_horns",
    label: "Cornes Démoniaques d'Effroi",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M15 80 Q10 40 30 15 Q28 45 38 65 Z" fill="#a855f7"/>
      <path d="M85 80 Q90 40 70 15 Q72 45 62 65 Z" fill="#a855f7"/>
      <polygon points="25,85 50,70 75,85 68,92 32,92" fill="#39ff14"/>
      <circle cx="50" cy="78" r="6" fill="#ff0055"/>
      <polygon points="50,45 42,70 58,70" fill="#c084fc"/>
    </svg>`,
  },
  {
    name: "crown_pumpkin_king",
    label: "Couronne Roi Citrouille",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="15,85 20,40 38,65 50,25 62,65 80,40 85,85" fill="#ff5500" stroke="#ffaa00" stroke-width="3"/>
      <path d="M47 25 Q50 12 58 10 Q53 18 53 25 Z" fill="#22c55e"/>
      <polygon points="35,68 42,68 38,60" fill="#ffe600"/>
      <polygon points="58,68 65,68 61,60" fill="#ffe600"/>
      <path d="M33 76 L38 80 L43 76 L48 81 L53 76 L58 81 L63 76 L67 80" stroke="#ffe600" stroke-width="3" fill="none"/>
      <circle cx="20" cy="40" r="4" fill="#ffaa00"/>
      <circle cx="50" cy="25" r="5" fill="#39ff14"/>
      <circle cx="80" cy="40" r="4" fill="#ffaa00"/>
    </svg>`,
  },
  // COMMUNS (3)
  {
    name: "iron_circlet",
    label: "Cercle de Fer",
    rarity: "common",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="10,48 16,28 26,38 32,22 38,38 48,28 54,48" fill="#94a3b8" stroke="#cbd5e1" stroke-width="2.5"/>
      <rect x="10" y="49" width="44" height="6" rx="2" fill="#475569"/>
    </svg>`,
  },
  {
    name: "bronze_crest",
    label: "Crête de Bronze",
    rarity: "common",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 18,24 32,36 46,24 56,48" fill="#d97706" stroke="#fdba74" stroke-width="2.5"/>
      <circle cx="32" cy="20" r="4" fill="#fbbf24"/>
      <rect x="8" y="49" width="48" height="6" rx="2" fill="#92400e"/>
    </svg>`,
  },
  {
    name: "steel_battlement",
    label: "Couronne Crénelée",
    rarity: "common",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M10,48 L10,26 L18,26 L18,36 L26,36 L26,22 L38,22 L38,36 L46,36 L46,26 L54,26 L54,48 Z" fill="#64748b" stroke="#e2e8f0" stroke-width="2.5"/>
      <rect x="10" y="49" width="44" height="6" rx="2" fill="#334155"/>
    </svg>`,
  },
  // PEU COMMUNS (3)
  {
    name: "silver_tiara",
    label: "Tiare d'Argent",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 14,24 24,36 32,16 40,36 50,24 56,48" fill="#e2e8f0" stroke="#38bdf8" stroke-width="2.5"/>
      <circle cx="32" cy="36" r="4" fill="#0ea5e9"/>
      <rect x="8" y="49" width="48" height="6" rx="2" fill="#64748b"/>
    </svg>`,
  },
  {
    name: "emerald_warden",
    label: "Diadème d'Émeraude",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 14,20 26,34 32,14 38,34 50,20 56,48" fill="#10b981" stroke="#a7f3d0" stroke-width="2.5"/>
      <polygon points="32,22 37,32 32,42 27,32" fill="#ecfdf5"/>
      <rect x="8" y="49" width="48" height="6" rx="2" fill="#065f46"/>
    </svg>`,
  },
  {
    name: "cobalt_commander",
    label: "Couronne du Commandeur",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 12,22 24,34 32,16 40,34 52,22 56,48" fill="#3b82f6" stroke="#bfdbfe" stroke-width="2.5"/>
      <rect x="8" y="49" width="48" height="6" rx="2" fill="#1d4ed8"/>
    </svg>`,
  },
  // RARES (4)
  {
    name: "crimson_warlord",
    label: "Couronne Seigneur de Guerre",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 14,22 26,34 32,14 38,34 50,22 56,48" fill="#f43f5e" stroke="#fecdd3" stroke-width="3"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#9f1239"/>
    </svg>`,
  },
  {
    name: "imperial_laurel",
    label: "Laurier Impérial",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M26,50 C10,44 10,20 28,14 C18,24 18,40 30,46 Z" fill="#fbbf24" stroke="#fef08a" stroke-width="2"/>
      <path d="M38,50 C54,44 54,20 36,14 C46,24 46,40 34,46 Z" fill="#fbbf24" stroke="#fef08a" stroke-width="2"/>
      <polygon points="32,16 35,24 43,24 37,29 39,37 32,32 25,37 27,29 21,24 29,24" fill="#fde047"/>
    </svg>`,
  },
  {
    name: "frost_monarch",
    label: "Couronne de Givre",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 12,24 20,38 26,18 32,34 38,18 44,38 52,24 56,48" fill="#38bdf8" stroke="#f0f9ff" stroke-width="2.5"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#0369a1"/>
    </svg>`,
  },
  {
    name: "toxic_overlord",
    label: "Couronne Rad-Overlord",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 14,20 26,36 32,12 38,36 50,20 56,48" fill="#84cc16" stroke="#ecfccb" stroke-width="2.5"/>
      <circle cx="32" cy="36" r="5" fill="#1a2e05" stroke="#bef264" stroke-width="2"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#3f6212"/>
    </svg>`,
  },
  // ÉPIQUES (5)
  {
    name: "golden_strategist",
    label: "Couronne du Stratège Doré",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 12,20 25,34 32,12 39,34 52,20 56,48" fill="#fbbf24" stroke="#fef08a" stroke-width="3"/>
      <circle cx="32" cy="36" r="4.5" fill="#ef4444"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#d97706"/>
    </svg>`,
  },
  {
    name: "void_archon",
    label: "Diadème d'Archonte du Néant",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="6,48 14,16 26,36 32,8 38,36 50,16 58,48" fill="#a855f7" stroke="#f3e8ff" stroke-width="3"/>
      <circle cx="32" cy="34" r="5" fill="#22d3ee"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#581c87"/>
    </svg>`,
  },
  {
    name: "plasma_valkyrie",
    label: "Ailes de Valkyrie Plasma",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="4,22 22,46 28,28 32,12 36,28 42,46 60,22 52,48 12,48" fill="#ec4899" stroke="#fbcfe8" stroke-width="2.5"/>
      <rect x="12" y="50" width="40" height="6" rx="2" fill="#9d174d"/>
    </svg>`,
  },
  {
    name: "solar_pharaoh",
    label: "Némès Solaire",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="24" r="12" fill="#f97316" stroke="#fde047" stroke-width="3"/>
      <polygon points="8,48 18,22 26,44 38,44 46,22 56,48" fill="#fbbf24" stroke="#fef08a" stroke-width="2"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#ea580c"/>
    </svg>`,
  },
  {
    name: "blood_emperor",
    label: "Couronne de Lune de Sang",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="6,48 10,16 22,34 32,10 42,34 54,16 58,48" fill="#dc2626" stroke="#fca5a5" stroke-width="3"/>
      <circle cx="32" cy="34" r="5" fill="#18181b" stroke="#f87171" stroke-width="2"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#450a0a"/>
    </svg>`,
  },
  // LÉGENDAIRES (5)
  {
    name: "cyber_emperor",
    label: "Couronne Cyber-Empereur",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="8,48 14,18 26,32 32,10 38,32 50,18 56,48" fill="#22d3ee" stroke="#e0f2fe" stroke-width="3"/>
      <polygon points="32,20 38,34 32,44 26,34" fill="#6366f1"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#4f46e5"/>
    </svg>`,
  },
  {
    name: "seraphim_halo",
    label: "Halo Séraphique Astral",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="30" r="18" fill="none" stroke="#fde047" stroke-width="4"/>
      <polygon points="32,6 36,24 54,30 36,36 32,54 28,36 10,30 28,24" fill="#fbbf24" stroke="#ffffff" stroke-width="2"/>
      <circle cx="32" cy="30" r="5" fill="#ffffff"/>
    </svg>`,
  },
  {
    name: "dragon_sovereign",
    label: "Cornes du Dragon Souverain",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M10,50 C4,30 12,10 24,8 C18,22 20,34 26,42 L32,16 L38,42 C44,34 46,22 40,8 C52,10 60,30 54,50 Z" fill="#f97316" stroke="#fde047" stroke-width="2.5"/>
      <rect x="10" y="50" width="44" height="6" rx="2" fill="#991b1b"/>
    </svg>`,
  },
  {
    name: "quantum_singularity_crown",
    label: "Couronne Singularité Quantique",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="6,48 14,16 24,34 32,8 40,34 50,16 58,48" fill="#c084fc" stroke="#22d3ee" stroke-width="3"/>
      <circle cx="32" cy="28" r="7" fill="#090d16" stroke="#f472b6" stroke-width="2.5"/>
      <rect x="8" y="50" width="48" height="6" rx="2" fill="#3b0764"/>
    </svg>`,
  },
  {
    name: "hexafront_supreme_crown",
    label: "Couronne Suprême BorderConflict",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="4,48 10,14 22,32 32,6 42,32 54,14 60,48" fill="#fbbf24" stroke="#22d3ee" stroke-width="3"/>
      <polygon points="32,16 40,26 40,38 32,46 24,38 24,26" fill="#082f49" stroke="#38bdf8" stroke-width="2.5"/>
      <circle cx="32" cy="31" r="4" fill="#22d3ee"/>
      <rect x="6" y="50" width="52" height="6" rx="2" fill="#0284c7"/>
    </svg>`,
  },
  {
    name: "hyperion_nova_crown",
    label: "Couronne Nova d'Hypérion",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-hyperion_nova_crown" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-hyperion_nova_crown)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#f59e0b" stroke="#ffffff" stroke-width="3">
      <animate attributeName="r" values="3.5;6.5;3.5" dur="1.5s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#dc2626">
      <animate attributeName="fill" values="#dc2626;#fef08a;#dc2626" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fef08a">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fef08a">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fef08a">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#dc2626" stroke="#ffffff" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "void_singularity_diadem",
    label: "Diadème du Vortex Stellaire",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-void_singularity_diadem" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-void_singularity_diadem)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#6366f1" stroke="#38bdf8" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#1e1b4b">
      <animate attributeName="fill" values="#1e1b4b;#c084fc;#1e1b4b" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#c084fc">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#c084fc">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#c084fc">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#1e1b4b" stroke="#38bdf8" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "chono_master_halo",
    label: "Halo Astral de Chronos",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-chono_master_halo" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-chono_master_halo)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#06b6d4" stroke="#ffffff" stroke-width="3">
      <animateTransform attributeName="transform" type="rotate" from="0 32 30" to="360 32 30" dur="8s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#082f49">
      <animate attributeName="fill" values="#082f49;#67e8f9;#082f49" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#67e8f9">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#67e8f9">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#67e8f9">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#082f49" stroke="#ffffff" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "plasma_dragon_crest",
    label: "Cimier du Dragon Éthéré",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-plasma_dragon_crest" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-plasma_dragon_crest)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#ec4899" stroke="#f43f5e" stroke-width="3">
      <animate attributeName="stroke-width" values="2;4.5;2" dur="1.8s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#831843">
      <animate attributeName="fill" values="#831843;#fbcfe8;#831843" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fbcfe8">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fbcfe8">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fbcfe8">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#831843" stroke="#f43f5e" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "titan_oblivion_crown",
    label: "Couronne d'Oblivion Titan",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-titan_oblivion_crown" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-titan_oblivion_crown)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#10b981" stroke="#34d399" stroke-width="3">
      <animate attributeName="r" values="3.5;6.5;3.5" dur="1.5s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#022c22">
      <animate attributeName="fill" values="#022c22;#a7f3d0;#022c22" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#a7f3d0">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#a7f3d0">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#a7f3d0">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#022c22" stroke="#34d399" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "solar_monarch_radiance",
    label: "Rayonnement du Monarque Solaire",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-solar_monarch_radiance" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-solar_monarch_radiance)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#ea580c" stroke="#fde047" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#7c2d12">
      <animate attributeName="fill" values="#7c2d12;#fed7aa;#7c2d12" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fed7aa">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fed7aa">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fed7aa">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#7c2d12" stroke="#fde047" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "arcane_emperor_crown",
    label: "Couronne de l'Empereur Arcanique",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-arcane_emperor_crown" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-arcane_emperor_crown)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#8b5cf6" stroke="#a855f7" stroke-width="3">
      <animate attributeName="stroke-width" values="2;4.5;2" dur="1.8s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#2e1065">
      <animate attributeName="fill" values="#2e1065;#ddd6fe;#2e1065" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#ddd6fe">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#ddd6fe">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#ddd6fe">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#2e1065" stroke="#a855f7" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "cryo_god_coronet",
    label: "Diadème du Seigneur Cryo",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-cryo_god_coronet" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-cryo_god_coronet)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#0284c7" stroke="#ffffff" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#082f49">
      <animate attributeName="fill" values="#082f49;#bae6fd;#082f49" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#bae6fd">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#bae6fd">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#bae6fd">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#082f49" stroke="#ffffff" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "apocalypse_sovereign",
    label: "Souveraineté de l'Apocalypse",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-apocalypse_sovereign" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-apocalypse_sovereign)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#e11d48" stroke="#fb7185" stroke-width="3">
      <animate attributeName="r" values="3.5;6.5;3.5" dur="1.5s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#4c0519">
      <animate attributeName="fill" values="#4c0519;#ffe4e6;#4c0519" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#ffe4e6">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#ffe4e6">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#ffe4e6">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#4c0519" stroke="#fb7185" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "cyber_overlord_apex",
    label: "Apex du Cyber-Overlord",
    rarity: "legendary",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-cyber_overlord_apex" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-cyber_overlord_apex)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#14b8a6" stroke="#22d3ee" stroke-width="3">
      <animate attributeName="stroke-width" values="2;4.5;2" dur="1.8s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#042f2e">
      <animate attributeName="fill" values="#042f2e;#5eead4;#042f2e" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#5eead4">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#5eead4">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#5eead4">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#042f2e" stroke="#22d3ee" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "storm_bringer_helm",
    label: "Casque du Faiseur d'Orages",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-storm_bringer_helm" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-storm_bringer_helm)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#3b82f6" stroke="#60a5fa" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#1e3a8a">
      <animate attributeName="fill" values="#1e3a8a;#93c5fd;#1e3a8a" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#93c5fd">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#93c5fd">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#93c5fd">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "vulcan_forge_crown",
    label: "Couronne de Vulcain",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-vulcan_forge_crown" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-vulcan_forge_crown)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#c2410c" stroke="#ea580c" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#431407">
      <animate attributeName="fill" values="#431407;#fdba74;#431407" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fdba74">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fdba74">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fdba74">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#431407" stroke="#ea580c" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "nebula_queen_tiara",
    label: "Tiare de la Reine des Nébuleuses",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-nebula_queen_tiara" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-nebula_queen_tiara)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#d946ef" stroke="#e879f9" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#4a044e">
      <animate attributeName="fill" values="#4a044e;#f5d0fe;#4a044e" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#f5d0fe">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#f5d0fe">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#f5d0fe">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#4a044e" stroke="#e879f9" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "iron_bastion_diadem",
    label: "Diadème du Bastion de Fer",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-iron_bastion_diadem" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-iron_bastion_diadem)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#475569" stroke="#94a3b8" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#0f172a">
      <animate attributeName="fill" values="#0f172a;#cbd5e1;#0f172a" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#cbd5e1">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#cbd5e1">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#cbd5e1">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "emerald_archdruid",
    label: "Couronne de l'Archidruide",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-emerald_archdruid" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-emerald_archdruid)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#059669" stroke="#10b981" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#064e3b">
      <animate attributeName="fill" values="#064e3b;#6ee7b7;#064e3b" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#6ee7b7">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#6ee7b7">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#6ee7b7">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "gold_valkyrie_wings",
    label: "Ailes d'Or des Valkyries",
    rarity: "epic",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-gold_valkyrie_wings" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-gold_valkyrie_wings)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#eab308" stroke="#facc15" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#713f12">
      <animate attributeName="fill" values="#713f12;#fef08a;#713f12" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fef08a">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fef08a">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fef08a">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#713f12" stroke="#facc15" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "phantom_assassin_cowl",
    label: "Couronne de l'Assassin Spectral",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-phantom_assassin_cowl" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-phantom_assassin_cowl)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#64748b" stroke="#94a3b8" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#1e293b">
      <animate attributeName="fill" values="#1e293b;#e2e8f0;#1e293b" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#e2e8f0">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#e2e8f0">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#e2e8f0">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "toxic_viper_crown",
    label: "Couronne de la Vipère Toxique",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-toxic_viper_crown" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-toxic_viper_crown)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#65a30d" stroke="#84cc16" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#1a2e05">
      <animate attributeName="fill" values="#1a2e05;#bef264;#1a2e05" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#bef264">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#bef264">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#bef264">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#1a2e05" stroke="#84cc16" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "blood_vampire_circlet",
    label: "Diadème Écarlate Sanguin",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-blood_vampire_circlet" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-blood_vampire_circlet)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#b91c1c" stroke="#ef4444" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#450a0a">
      <animate attributeName="fill" values="#450a0a;#fca5a5;#450a0a" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fca5a5">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fca5a5">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fca5a5">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#450a0a" stroke="#ef4444" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "glacier_shard_crest",
    label: "Cimier d'Éclat Glaciaire",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-glacier_shard_crest" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-glacier_shard_crest)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#0284c7" stroke="#38bdf8" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#0c4a6e">
      <animate attributeName="fill" values="#0c4a6e;#7dd3fc;#0c4a6e" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#7dd3fc">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#7dd3fc">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#7dd3fc">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#0c4a6e" stroke="#38bdf8" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "desert_sultan_crown",
    label: "Couronne du Sultan des Dunes",
    rarity: "rare",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-desert_sultan_crown" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-desert_sultan_crown)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#d97706" stroke="#fbbf24" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#451a03">
      <animate attributeName="fill" values="#451a03;#fde68a;#451a03" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fde68a">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fde68a">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fde68a">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#451a03" stroke="#fbbf24" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "scout_bronze_circlet",
    label: "Cercle de Bronze d'Éclaireur",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-scout_bronze_circlet" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-scout_bronze_circlet)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#b45309" stroke="#d97706" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#78350f">
      <animate attributeName="fill" values="#78350f;#fcd34d;#78350f" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fcd34d">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fcd34d">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fcd34d">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#78350f" stroke="#d97706" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "steel_legionnaire_crest",
    label: "Cimier du Légionnaire d'Acier",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-steel_legionnaire_crest" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-steel_legionnaire_crest)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#475569" stroke="#64748b" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#1e293b">
      <animate attributeName="fill" values="#1e293b;#cbd5e1;#1e293b" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#cbd5e1">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#cbd5e1">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#cbd5e1">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "sapphire_officer",
    label: "Diadème de l'Officier Saphir",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-sapphire_officer" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-sapphire_officer)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#2563eb" stroke="#3b82f6" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#1e3a8a">
      <animate attributeName="fill" values="#1e3a8a;#93c5fd;#1e3a8a" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#93c5fd">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#93c5fd">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#93c5fd">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.5"/>
  </g>
</svg>`,
  },
  {
    name: "copper_vanguard",
    label: "Couronne de Cuivre de l'Avant-Garde",
    rarity: "uncommon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <filter id="glow-copper_vanguard" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#glow-copper_vanguard)">
    <polygon points="6,48 12,18 24,34 32,8 40,34 52,18 58,48" fill="#c2410c" stroke="#ea580c" stroke-width="3">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite"/>
    </polygon>
    <polygon points="32,18 39,32 32,44 25,32" fill="#7c2d12">
      <animate attributeName="fill" values="#7c2d12;#fdba74;#7c2d12" dur="2.5s" repeatCount="indefinite"/>
    </polygon>
    <circle cx="32" cy="30" r="5" fill="#fdba74">
      <animate attributeName="r" values="4;6.5;4" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="18" r="3" fill="#fdba74">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="18" r="3" fill="#fdba74">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="50" width="52" height="6" rx="2" fill="#7c2d12" stroke="#ea580c" stroke-width="1.5"/>
  </g>
</svg>`,
  },
];

interface FlagSpec {
  name: string;
  label: string;
  rarity: Rarity;
  bg: string;
  accent: string;
  emblemColor: string;
  shape:
    | "hex"
    | "eagle"
    | "diamond"
    | "cross"
    | "sun"
    | "star"
    | "chevron"
    | "shield";
}

/**
 * 20 Custom Faction SVG Flags.
 */
const TWENTY_FLAG_SPECS: FlagSpec[] = [
  // HALLOWEEN LÉGENDAIRE
  {
    name: "flag_soul_reaper",
    label: "Étendard Faucheuse d'Âmes",
    rarity: "legendary",
    bg: "#0f051d",
    accent: "#39ff14",
    emblemColor: "#a855f7",
    shape: "hex",
  },
  {
    name: "flag_jack_lantern",
    label: "Blason Lanterne d'Effroi",
    rarity: "legendary",
    bg: "#1a0800",
    accent: "#ff5500",
    emblemColor: "#ffaa00",
    shape: "sun",
  },
  {
    name: "hexafront_command",
    label: "Commandement BorderConflict",
    rarity: "epic",
    bg: "#090d16",
    accent: "#22d3ee",
    emblemColor: "#6366f1",
    shape: "hex",
  },
  {
    name: "imperial_phoenix",
    label: "Phénix Impérial",
    rarity: "legendary",
    bg: "#450a0a",
    accent: "#fbbf24",
    emblemColor: "#f43f5e",
    shape: "eagle",
  },
  {
    name: "cyber_syndicate",
    label: "Syndicat Cybernétique",
    rarity: "rare",
    bg: "#022c22",
    accent: "#10b981",
    emblemColor: "#34d399",
    shape: "diamond",
  },
  {
    name: "aegis_coalition",
    label: "Coalition Aegis",
    rarity: "common",
    bg: "#172554",
    accent: "#60a5fa",
    emblemColor: "#ffffff",
    shape: "shield",
  },
  {
    name: "iron_vanguard",
    label: "Avant-Garde de Fer",
    rarity: "common",
    bg: "#1e293b",
    accent: "#94a3b8",
    emblemColor: "#f8fafc",
    shape: "chevron",
  },
  {
    name: "crimson_legion",
    label: "Légion Écarlate",
    rarity: "uncommon",
    bg: "#3f0713",
    accent: "#f43f5e",
    emblemColor: "#fecdd3",
    shape: "cross",
  },
  {
    name: "emerald_republic",
    label: "République d'Émeraude",
    rarity: "uncommon",
    bg: "#064e3b",
    accent: "#34d399",
    emblemColor: "#fef08a",
    shape: "star",
  },
  {
    name: "solar_imperium",
    label: "Impérium Solaire",
    rarity: "rare",
    bg: "#431407",
    accent: "#fb923c",
    emblemColor: "#fde047",
    shape: "sun",
  },
  {
    name: "arctic_directorate",
    label: "Directoire Arctique",
    rarity: "rare",
    bg: "#0f172a",
    accent: "#38bdf8",
    emblemColor: "#e0f2fe",
    shape: "hex",
  },
  {
    name: "void_covenant",
    label: "Pacte du Néant",
    rarity: "epic",
    bg: "#1e1035",
    accent: "#c084fc",
    emblemColor: "#f472b6",
    shape: "diamond",
  },
  {
    name: "toxic_brotherhood",
    label: "Confrérie Rad-Toxique",
    rarity: "rare",
    bg: "#1a2e05",
    accent: "#a3e635",
    emblemColor: "#ecfccb",
    shape: "sun",
  },
  {
    name: "golden_hegemony",
    label: "Hégémonie Dorée",
    rarity: "legendary",
    bg: "#1e1b4b",
    accent: "#fbbf24",
    emblemColor: "#ffffff",
    shape: "star",
  },
  {
    name: "obsidian_ops",
    label: "Division Obsidienne",
    rarity: "uncommon",
    bg: "#050505",
    accent: "#475569",
    emblemColor: "#22d3ee",
    shape: "chevron",
  },
  {
    name: "sakura_shogunate",
    label: "Shogunat Sakura",
    rarity: "epic",
    bg: "#3b0764",
    accent: "#f472b6",
    emblemColor: "#fdf2f8",
    shape: "sun",
  },
  {
    name: "desert_scorpions",
    label: "Scorpions du Désert",
    rarity: "common",
    bg: "#422006",
    accent: "#f59e0b",
    emblemColor: "#fef9c3",
    shape: "shield",
  },
  {
    name: "abyssal_armada",
    label: "Armada Abyssale",
    rarity: "rare",
    bg: "#042f2e",
    accent: "#2dd4bf",
    emblemColor: "#ccfbf1",
    shape: "chevron",
  },
  {
    name: "magma_forge",
    label: "Forge Magmatique",
    rarity: "epic",
    bg: "#270905",
    accent: "#f97316",
    emblemColor: "#fde047",
    shape: "hex",
  },
  {
    name: "starlight_federation",
    label: "Fédération Stellaire",
    rarity: "epic",
    bg: "#090d16",
    accent: "#818cf8",
    emblemColor: "#e0e7ff",
    shape: "star",
  },
  {
    name: "valkyrie_order",
    label: "Ordre des Valkyries",
    rarity: "legendary",
    bg: "#31102f",
    accent: "#fcd34d",
    emblemColor: "#f43f5e",
    shape: "eagle",
  },
  {
    name: "omega_sovereignty",
    label: "Souveraineté Oméga",
    rarity: "legendary",
    bg: "#020617",
    accent: "#22d3ee",
    emblemColor: "#fbbf24",
    shape: "hex",
  },
  {
    name: "stellar_imperium",
    label: "Imperium Stellaire",
    rarity: "legendary",
    bg: "#030712",
    accent: "#fbbf24",
    emblemColor: "#38bdf8",
    shape: "star",
  },
  {
    name: "hyper_void_dominion",
    label: "Dominion du Néant Absolu",
    rarity: "legendary",
    bg: "#0f0728",
    accent: "#c084fc",
    emblemColor: "#f43f5e",
    shape: "hex",
  },
  {
    name: "celestial_valkyries",
    label: "Légion Céleste",
    rarity: "legendary",
    bg: "#1e1b4b",
    accent: "#fde047",
    emblemColor: "#ffffff",
    shape: "eagle",
  },
  {
    name: "solar_sovereignty",
    label: "Souveraineté Phénix",
    rarity: "legendary",
    bg: "#431407",
    accent: "#ea580c",
    emblemColor: "#fde047",
    shape: "sun",
  },
  {
    name: "quantum_vanguard",
    label: "Avant-Garde Quantique",
    rarity: "legendary",
    bg: "#022c22",
    accent: "#22d3ee",
    emblemColor: "#34d399",
    shape: "diamond",
  },
  {
    name: "apocalypse_legion",
    label: "Légion de l'Apocalypse",
    rarity: "legendary",
    bg: "#260505",
    accent: "#f43f5e",
    emblemColor: "#ffffff",
    shape: "cross",
  },
  {
    name: "archangel_crusade",
    label: "Croisade des Archanges",
    rarity: "legendary",
    bg: "#1c1917",
    accent: "#fbbf24",
    emblemColor: "#e0f2fe",
    shape: "shield",
  },
  {
    name: "cyber_dynasty",
    label: "Dynastie Cybernétique",
    rarity: "legendary",
    bg: "#030712",
    accent: "#06b6d4",
    emblemColor: "#ec4899",
    shape: "chevron",
  },
  {
    name: "abyssal_leviathan",
    label: "Pacte du Léviathan",
    rarity: "legendary",
    bg: "#021c24",
    accent: "#14b8a6",
    emblemColor: "#67e8f9",
    shape: "hex",
  },
  {
    name: "omega_order",
    label: "Ordre Souverain Oméga",
    rarity: "legendary",
    bg: "#090d16",
    accent: "#f59e0b",
    emblemColor: "#a855f7",
    shape: "star",
  },
  {
    name: "vulcan_syndicate",
    label: "Syndicat de Vulcain",
    rarity: "epic",
    bg: "#2a0a05",
    accent: "#f97316",
    emblemColor: "#fde047",
    shape: "hex",
  },
  {
    name: "aurora_covenant",
    label: "Pacte Boréal",
    rarity: "epic",
    bg: "#082f49",
    accent: "#38bdf8",
    emblemColor: "#a7f3d0",
    shape: "diamond",
  },
  {
    name: "crimson_vanguard",
    label: "Avant-Garde Pourpre",
    rarity: "epic",
    bg: "#3f0713",
    accent: "#f43f5e",
    emblemColor: "#fecdd3",
    shape: "chevron",
  },
  {
    name: "storm_federation",
    label: "Fédération des Tempêtes",
    rarity: "epic",
    bg: "#0f172a",
    accent: "#60a5fa",
    emblemColor: "#ffffff",
    shape: "cross",
  },
  {
    name: "emerald_dominion",
    label: "Dominion d'Émeraude",
    rarity: "epic",
    bg: "#064e3b",
    accent: "#10b981",
    emblemColor: "#d1fae5",
    shape: "shield",
  },
  {
    name: "obsidian_phantom",
    label: "Ordre de l'Obsidienne",
    rarity: "epic",
    bg: "#09090b",
    accent: "#71717a",
    emblemColor: "#e4e4e7",
    shape: "eagle",
  },
  {
    name: "desert_nomads",
    label: "Union des Nomades",
    rarity: "rare",
    bg: "#451a03",
    accent: "#d97706",
    emblemColor: "#fef3c7",
    shape: "sun",
  },
  {
    name: "glacier_front",
    label: "Front des Glaciers",
    rarity: "rare",
    bg: "#0c4a6e",
    accent: "#0284c7",
    emblemColor: "#e0f2fe",
    shape: "shield",
  },
  {
    name: "toxic_rebellion",
    label: "Front Bio-Rebelle",
    rarity: "rare",
    bg: "#14532d",
    accent: "#84cc16",
    emblemColor: "#d9f99d",
    shape: "diamond",
  },
  {
    name: "plasma_syndicate",
    label: "Syndicat Plasma",
    rarity: "rare",
    bg: "#4c0519",
    accent: "#db2777",
    emblemColor: "#fbcfe8",
    shape: "chevron",
  },
  {
    name: "iron_coalition",
    label: "Coalition du Fer",
    rarity: "rare",
    bg: "#1e293b",
    accent: "#64748b",
    emblemColor: "#f1f5f9",
    shape: "cross",
  },
  {
    name: "frontier_scouts",
    label: "Éclaireurs de Frontière",
    rarity: "uncommon",
    bg: "#1c1917",
    accent: "#78716c",
    emblemColor: "#e7e5e4",
    shape: "chevron",
  },
  {
    name: "coastal_guard",
    label: "Garde Côtière",
    rarity: "uncommon",
    bg: "#172554",
    accent: "#3b82f6",
    emblemColor: "#bfdbfe",
    shape: "shield",
  },
  {
    name: "militia_corps",
    label: "Corps des Milices",
    rarity: "uncommon",
    bg: "#1e1b4b",
    accent: "#6366f1",
    emblemColor: "#c7d2fe",
    shape: "diamond",
  },
  {
    name: "dust_patrol",
    label: "Patrouille des Sables",
    rarity: "uncommon",
    bg: "#292524",
    accent: "#b45309",
    emblemColor: "#fed7aa",
    shape: "star",
  },
];

function renderFactionFlagSvg(spec: FlagSpec): string {
  let centerShape = "";
  switch (spec.shape) {
    case "hex":
      centerShape = `
        <polygon points="45,8 66,20 66,40 45,52 24,40 24,20" fill="none" stroke="${spec.accent}" stroke-width="4"/>
        <polygon points="45,16 58,24 58,36 45,44 32,36 32,24" fill="${spec.emblemColor}"/>
      `;
      break;
    case "eagle":
      centerShape = `
        <path d="M12,46 L45,10 L78,46 L62,46 L45,25 L28,46 Z" fill="${spec.accent}"/>
        <circle cx="45" cy="38" r="7" fill="${spec.emblemColor}"/>
      `;
      break;
    case "diamond":
      centerShape = `
        <rect x="0" y="23" width="90" height="14" fill="${spec.accent}" opacity="0.4"/>
        <polygon points="45,8 65,30 45,52 25,30" fill="${spec.bg}" stroke="${spec.emblemColor}" stroke-width="4"/>
        <circle cx="45" cy="30" r="6" fill="${spec.accent}"/>
      `;
      break;
    case "cross":
      centerShape = `
        <rect x="38" y="0" width="14" height="60" fill="${spec.accent}"/>
        <rect x="0" y="23" width="90" height="14" fill="${spec.accent}"/>
        <circle cx="45" cy="30" r="9" fill="${spec.emblemColor}"/>
      `;
      break;
    case "sun":
      centerShape = `
        <circle cx="45" cy="30" r="16" fill="${spec.accent}"/>
        <circle cx="45" cy="30" r="10" fill="${spec.emblemColor}"/>
      `;
      break;
    case "star":
      centerShape = `
        <polygon points="45,8 51,22 66,22 54,32 58,47 45,38 32,47 36,32 24,22 39,22" fill="${spec.emblemColor}" stroke="${spec.accent}" stroke-width="2"/>
      `;
      break;
    case "chevron":
      centerShape = `
        <polygon points="0,0 38,30 0,60" fill="${spec.accent}"/>
        <polygon points="22,0 56,30 22,60 34,60 68,30 34,0" fill="${spec.emblemColor}"/>
      `;
      break;
    case "shield":
      centerShape = `
        <path d="M27,10 L63,10 L63,32 C63,44 45,52 45,52 C45,52 27,44 27,32 Z" fill="${spec.accent}" stroke="${spec.emblemColor}" stroke-width="3"/>
      `;
      break;
  }
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60">
      <rect width="90" height="60" fill="${spec.bg}"/>
      ${centerShape}
    </svg>
  `);
}

let cachedCatalog: Cosmetics | null = null;

export function getHexaFrontCosmeticsCatalog(): Cosmetics {
  if (cachedCatalog) return cachedCatalog;

  const colorPalettes: Record<string, ColorPalette> = {};
  for (const p of PALETTE_DEFS) {
    registerLabel("territory_patterns.color_palette", p.name, p.label);
    colorPalettes[p.name] = {
      name: p.name,
      primaryColor: p.primaryColor,
      secondaryColor: p.secondaryColor,
    };
  }

  const patterns: Record<string, Pattern> = {};
  for (const spec of HUNDRED_PATTERN_SPECS) {
    registerLabel("territory_patterns.pattern", spec.name, spec.label);
    const prices = RARITY_PRICING[spec.rarity];
    patterns[spec.name] = {
      name: spec.name,
      rarity: spec.rarity,
      priceHard: prices.hard,
      priceSoft: prices.soft,
      product: null,
      artist: "BorderConflict Studio",
      colorPalettes: ALL_PALETTE_REFS,
      pattern: encodePatternGrid(16, 16, spec.scale ?? 2, spec.fn),
    };
  }

  const crowns: Record<string, Crown> = {};
  for (const spec of TWENTY_CROWN_SPECS) {
    registerLabel("crowns", spec.name, spec.label);
    const prices = RARITY_PRICING[spec.rarity];
    crowns[spec.name] = {
      name: spec.name,
      rarity: spec.rarity,
      priceHard: prices.hard,
      priceSoft: prices.soft,
      product: null,
      url: svgDataUri(spec.svg),
    };
  }

  const flags: Record<string, Flag> = {};
  for (const spec of TWENTY_FLAG_SPECS) {
    registerLabel("flags", spec.name, spec.label);
    const prices = RARITY_PRICING[spec.rarity];
    flags[spec.name] = {
      name: spec.name,
      rarity: spec.rarity,
      priceHard: prices.hard,
      priceSoft: prices.soft,
      product: null,
      url: renderFactionFlagSvg(spec),
    };
  }

  const effects: Record<string, Record<string, Effect>> = {
    transportShipTrail: {},
    nukeTrail: {},
    nukeExplosion: {},
    structures: {},
    warship: {},
    train: {},
    railroad: {},
  };

  function addEffect(label: string, effect: Effect): void {
    registerLabel("effects", effect.name, label);
    const standardPricing = RARITY_PRICING[effect.rarity as Rarity];
    if (standardPricing) {
      effect.priceHard = standardPricing.hard;
      effect.priceSoft = standardPricing.soft;
    }
    effects[effect.effectType][effect.name] = effect;
  }

  // ==========================================================================
  // EFFETS ÉVÉNEMENT HALLOWEEN LÉGENDAIRE
  // ==========================================================================
  addEffect("Sillage Ectoplasmique d'Halloween", {
    name: "ectoplasm_wake",
    effectType: "transportShipTrail",
    rarity: "legendary",
    priceHard: 400,
    priceSoft: 3500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#170326", "#a855f7", "#39ff14", "#22c55e"],
      colorSize: 6,
      movementSpeed: 10,
    },
  });

  addEffect("Déflagration Toxique Mort-Vivante", {
    name: "necropolis_toxic_detonation",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 450,
    priceSoft: 4000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#39ff14", "#22c55e", "#a855f7", "#170326"],
      colorSize: 8,
      movementSpeed: 12,
    } as any,
  });

  addEffect("Coque Citrouille Infernale", {
    name: "infernal_pumpkin_hull",
    effectType: "warship",
    rarity: "legendary",
    priceHard: 400,
    priceSoft: 3500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#ff5500", "#ffaa00", "#dc2626"],
      colorSize: 5,
      movementSpeed: 10,
    } as any,
  });

  addEffect("Traînée d'Âmes Enflammées", {
    name: "halloween_soul_trail",
    effectType: "nukeTrail",
    rarity: "legendary",
    priceHard: 380,
    priceSoft: 3200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#ff5500", "#ffaa00", "#ffe600"],
      colorSize: 5,
      movementSpeed: 11,
    } as any,
  });

  // ==========================================================================
  // 8 EFFETS SILLAGE DE NAVIRES (transportShipTrail)
  // ==========================================================================
  addEffect("Sillage Plasma Cyan", {
    name: "plasma_wake_cyan",
    effectType: "transportShipTrail",
    rarity: "rare",
    priceHard: 240,
    priceSoft: 2000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#06b6d4", "#38bdf8", "#818cf8", "#22d3ee"],
      colorSize: 6,
      movementSpeed: 8,
    },
  });
  addEffect("Sillage Solaire Doré", {
    name: "solar_gold_wake",
    effectType: "transportShipTrail",
    rarity: "epic",
    priceHard: 350,
    priceSoft: 3000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#f59e0b", "#fde047", "#ea580c"],
      colorSize: 5,
      movementSpeed: 10,
    },
  });
  addEffect("Écume Émeraude", {
    name: "emerald_foam",
    effectType: "transportShipTrail",
    rarity: "common",
    priceHard: 140,
    priceSoft: 1200,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#10b981", "#34d399", "#059669"],
      frequency: 2.5,
    },
  });
  addEffect("Onde du Néant", {
    name: "void_pulse_wake",
    effectType: "transportShipTrail",
    rarity: "epic",
    priceHard: 380,
    priceSoft: 3200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#a855f7", "#ec4899", "#6366f1"],
      colorSize: 5,
      movementSpeed: 12,
    },
  });
  addEffect("Sillage Écarlate", {
    name: "crimson_tide_wake",
    effectType: "transportShipTrail",
    rarity: "uncommon",
    priceHard: 180,
    priceSoft: 1500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#f43f5e", "#e11d48", "#fda4af"],
      colorSize: 5,
      movementSpeed: 9,
    },
  });
  addEffect("Sillage Cryo-Arctique", {
    name: "arctic_ice_wake",
    effectType: "transportShipTrail",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#e0f2fe", "#38bdf8", "#0284c7"],
      frequency: 3.0,
    },
  });
  addEffect("Sillage Bio-Toxique", {
    name: "toxic_sludge_wake",
    effectType: "transportShipTrail",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#a3e635", "#4d7c0f", "#bef264"],
      colorSize: 4,
      movementSpeed: 7,
    },
  });
  addEffect("Sillage Astral Oméga", {
    name: "omega_astral_wake",
    effectType: "transportShipTrail",
    rarity: "legendary",
    priceHard: 580,
    priceSoft: 5000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#22d3ee", "#c084fc", "#fbbf24", "#ffffff"],
      colorSize: 4,
      movementSpeed: 14,
    },
  });

  // ==========================================================================
  // 8 EFFETS TRAÎNÉES DE MISSILES NUCLÉAIRES (nukeTrail)
  // ==========================================================================
  addEffect("Spirale Quantique Cyan", {
    name: "quantum_spiral_cyan",
    effectType: "nukeTrail",
    rarity: "legendary",
    priceHard: 550,
    priceSoft: 5000,
    product: null,
    attributes: {
      type: "spiral",
      colors: ["#22d3ee", "#818cf8", "#e0f2fe"],
      radius: 3.5,
      strands: 3,
      rotationSpeed: 6,
    },
  });
  addEffect("Hélice Apocalypse Rouge", {
    name: "apocalypse_helix_red",
    effectType: "nukeTrail",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    product: null,
    attributes: {
      type: "spiral",
      colors: ["#f43f5e", "#fb923c", "#fef08a"],
      radius: 3.0,
      strands: 2,
      rotationSpeed: 5,
    },
  });
  addEffect("Comète Impériale Dorée", {
    name: "golden_comet_trail",
    effectType: "nukeTrail",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#fef08a", "#d97706"],
      colorSize: 6,
      movementSpeed: 14,
    },
  });
  addEffect("Hélice Améthyste du Néant", {
    name: "void_vortex_trail",
    effectType: "nukeTrail",
    rarity: "legendary",
    priceHard: 580,
    priceSoft: 5200,
    product: null,
    attributes: {
      type: "spiral",
      colors: ["#c084fc", "#f472b6", "#38bdf8"],
      radius: 3.8,
      strands: 3,
      rotationSpeed: 7,
    },
  });
  addEffect("Sillage Uranium Vert", {
    name: "uranium_helix_trail",
    effectType: "nukeTrail",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3500,
    product: null,
    attributes: {
      type: "spiral",
      colors: ["#a3e635", "#10b981", "#ecfccb"],
      radius: 3.2,
      strands: 2,
      rotationSpeed: 6,
    },
  });
  addEffect("Propulsion Cryo-Bleue", {
    name: "frost_lance_trail",
    effectType: "nukeTrail",
    rarity: "uncommon",
    priceHard: 180,
    priceSoft: 1500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#38bdf8", "#e0f2fe", "#0284c7"],
      colorSize: 5,
      movementSpeed: 12,
    },
  });
  addEffect("Fusée Synthwave Rose", {
    name: "synthwave_beam_trail",
    effectType: "nukeTrail",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#ec4899", "#8b5cf6", "#22d3ee"],
      colorSize: 5,
      movementSpeed: 15,
    },
  });
  addEffect("Triple Hélice Souveraine", {
    name: "sovereign_triple_helix",
    effectType: "nukeTrail",
    rarity: "legendary",
    priceHard: 620,
    priceSoft: 5600,
    product: null,
    attributes: {
      type: "spiral",
      colors: ["#fbbf24", "#f43f5e", "#ffffff"],
      radius: 4.0,
      strands: 3,
      rotationSpeed: 8,
    },
  });

  // ==========================================================================
  // 15 EFFETS EXPLOSIONS NUCLÉAIRES (5 Atom, 5 Hydro, 5 MIRV)
  // ==========================================================================
  addEffect("Étincelles Cyber (Bombe A)", {
    name: "cyber_sparkles_atom",
    effectType: "nukeExplosion",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3400,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "atom",
      colors: ["#22d3ee", "#818cf8", "#f472b6", "#ffffff"],
      size: 38,
      speed: 45,
      thickness: 3.5,
      transitionSpeed: 4,
      density: 85,
    },
  });
  addEffect("Braises Dorées (Bombe A)", {
    name: "golden_embers_atom",
    effectType: "nukeExplosion",
    rarity: "rare",
    priceHard: 300,
    priceSoft: 2600,
    product: null,
    attributes: {
      type: "embers",
      nukeType: "atom",
      colors: ["#fbbf24", "#f97316", "#ef4444", "#fef08a"],
      size: 36,
      speed: 42,
      thickness: 3.2,
      transitionSpeed: 3.5,
      density: 80,
    },
  });
  addEffect("Anneau Toxique (Bombe A)", {
    name: "toxic_shockwave_atom",
    effectType: "nukeExplosion",
    rarity: "uncommon",
    priceHard: 200,
    priceSoft: 1700,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "atom",
      colors: ["#a3e635", "#10b981", "#ecfccb"],
      size: 40,
      speed: 48,
      thickness: 5,
      transitionSpeed: 4,
    },
  });
  addEffect("Nova Écarlate (Bombe A)", {
    name: "crimson_nova_atom",
    effectType: "nukeExplosion",
    rarity: "rare",
    priceHard: 290,
    priceSoft: 2500,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "atom",
      colors: ["#f43f5e", "#fda4af", "#9f1239"],
      size: 42,
      speed: 50,
      thickness: 5.5,
      transitionSpeed: 4.5,
    },
  });
  addEffect("Implosion du Néant (Bombe A)", {
    name: "void_sparkles_atom",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 580,
    priceSoft: 5200,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "atom",
      colors: ["#c084fc", "#e879f9", "#38bdf8", "#ffffff"],
      size: 42,
      speed: 52,
      thickness: 4.0,
      transitionSpeed: 5,
      density: 100,
    },
  });

  // HYDRO (5)
  addEffect("Onde de Choc Supernova (Bombe H)", {
    name: "supernova_shockwave_hydro",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 600,
    priceSoft: 5400,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "hydro",
      colors: ["#22d3ee", "#6366f1", "#ec4899", "#ffffff"],
      size: 95,
      speed: 80,
      thickness: 8,
      transitionSpeed: 5,
    },
  });
  addEffect("Cataclysme Écarlate (Bombe H)", {
    name: "crimson_cataclysm_hydro",
    effectType: "nukeExplosion",
    rarity: "epic",
    priceHard: 460,
    priceSoft: 4000,
    product: null,
    attributes: {
      type: "embers",
      nukeType: "hydro",
      colors: ["#f43f5e", "#fbbf24", "#ea580c"],
      size: 90,
      speed: 75,
      thickness: 4.5,
      transitionSpeed: 4,
      density: 110,
    },
  });
  addEffect("Éruption Solaire Dorée (Bombe H)", {
    name: "solar_monarch_hydro",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 640,
    priceSoft: 5800,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "hydro",
      colors: ["#fbbf24", "#fef08a", "#f97316", "#ffffff"],
      size: 96,
      speed: 82,
      thickness: 5.0,
      transitionSpeed: 5,
      density: 120,
    },
  });
  addEffect("Hiver Cryogénique (Bombe H)", {
    name: "arctic_blizzard_hydro",
    effectType: "nukeExplosion",
    rarity: "rare",
    priceHard: 320,
    priceSoft: 2800,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "hydro",
      colors: ["#38bdf8", "#e0f2fe", "#818cf8"],
      size: 88,
      speed: 70,
      thickness: 4.0,
      transitionSpeed: 4,
      density: 95,
    },
  });
  addEffect("Tempête Bio-Rad (Bombe H)", {
    name: "bio_rad_storm_hydro",
    effectType: "nukeExplosion",
    rarity: "epic",
    priceHard: 440,
    priceSoft: 3800,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "hydro",
      colors: ["#a3e635", "#10b981", "#fef08a"],
      size: 92,
      speed: 78,
      thickness: 7.5,
      transitionSpeed: 4.5,
    },
  });

  // MIRV (5)
  addEffect("Singularité du Néant (MIRV)", {
    name: "void_singularity_mirv",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "mirvWarhead",
      colors: ["#c084fc", "#f472b6", "#38bdf8", "#ffffff"],
      size: 42,
      speed: 55,
      thickness: 3.8,
      transitionSpeed: 5,
      density: 95,
    },
  });
  addEffect("Pluie d'Or Impériale (MIRV)", {
    name: "golden_rain_mirv",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    product: null,
    attributes: {
      type: "embers",
      nukeType: "mirvWarhead",
      colors: ["#fbbf24", "#fef08a", "#f59e0b", "#ffffff"],
      size: 40,
      speed: 52,
      thickness: 3.6,
      transitionSpeed: 4.5,
      density: 95,
    },
  });
  addEffect("Barrage Cyber-Néon (MIRV)", {
    name: "cyber_barrage_mirv",
    effectType: "nukeExplosion",
    rarity: "epic",
    priceHard: 460,
    priceSoft: 4000,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "mirvWarhead",
      colors: ["#22d3ee", "#38bdf8", "#6366f1"],
      size: 44,
      speed: 58,
      thickness: 5.5,
      transitionSpeed: 5,
    },
  });
  addEffect("Tempête Écarlate (MIRV)", {
    name: "crimson_tempest_mirv",
    effectType: "nukeExplosion",
    rarity: "rare",
    priceHard: 320,
    priceSoft: 2800,
    product: null,
    attributes: {
      type: "embers",
      nukeType: "mirvWarhead",
      colors: ["#f43f5e", "#fb923c", "#fecdd3"],
      size: 38,
      speed: 48,
      thickness: 3.4,
      transitionSpeed: 4,
      density: 85,
    },
  });
  addEffect("Pluie Acide Émeraude (MIRV)", {
    name: "emerald_acid_mirv",
    effectType: "nukeExplosion",
    rarity: "epic",
    priceHard: 440,
    priceSoft: 3800,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "mirvWarhead",
      colors: ["#10b981", "#a3e635", "#ecfdf5"],
      size: 40,
      speed: 50,
      thickness: 3.5,
      transitionSpeed: 4.5,
      density: 90,
    },
  });

  // ==========================================================================
  // 7 EFFETS STRUCTURES & BÂTIMENTS (structures)
  // ==========================================================================
  addEffect("Structures Hologrammes Néon", {
    name: "neon_hologram_structures",
    effectType: "structures",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#22d3ee", "#818cf8", "#38bdf8"],
      colorSize: 4,
      movementSpeed: 6,
    },
  });
  addEffect("Citadelles d'Or Impérial", {
    name: "imperial_gold_structures",
    effectType: "structures",
    rarity: "legendary",
    priceHard: 580,
    priceSoft: 5000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#fef08a", "#f59e0b"],
      colorSize: 4,
      movementSpeed: 5,
    },
  });
  addEffect("Bastions Pulsation Écarlate", {
    name: "crimson_pulse_structures",
    effectType: "structures",
    rarity: "rare",
    priceHard: 290,
    priceSoft: 2500,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#f43f5e", "#fb7185", "#e11d48"],
      frequency: 2.2,
    },
  });
  addEffect("Complexes Matrice Émeraude", {
    name: "emerald_matrix_structures",
    effectType: "structures",
    rarity: "uncommon",
    priceHard: 190,
    priceSoft: 1600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#10b981", "#34d399", "#059669"],
      colorSize: 4,
      movementSpeed: 6,
    },
  });
  addEffect("Sanctuaires Améthyste du Néant", {
    name: "void_amethyst_structures",
    effectType: "structures",
    rarity: "epic",
    priceHard: 440,
    priceSoft: 3800,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#c084fc", "#f472b6", "#6366f1"],
      colorSize: 4,
      movementSpeed: 7,
    },
  });
  addEffect("Avant-Postes Cryo-Arctiques", {
    name: "arctic_crystal_structures",
    effectType: "structures",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#38bdf8", "#e0f2fe", "#0284c7"],
      frequency: 2.0,
    },
  });
  addEffect("Architecture Astrale Oméga", {
    name: "omega_astral_structures",
    effectType: "structures",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#22d3ee", "#c084fc", "#fbbf24", "#ffffff"],
      colorSize: 3,
      movementSpeed: 8,
    },
  });

  // ==========================================================================
  // 7 EFFETS NAVIRES DE GUERRE (warship)
  // ==========================================================================
  addEffect("Cuirassé Fantôme Cyan", {
    name: "phantom_cyan_warship",
    effectType: "warship",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#22d3ee", "#38bdf8", "#6366f1"],
      colorSize: 3,
      movementSpeed: 6,
    },
  });
  addEffect("Flotte Écarlate", {
    name: "crimson_fleet_warship",
    effectType: "warship",
    rarity: "epic",
    priceHard: 380,
    priceSoft: 3200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#f43f5e", "#fb923c", "#fecdd3"],
      colorSize: 3,
      movementSpeed: 7,
    },
  });
  addEffect("Armada Impériale Dorée", {
    name: "golden_armada_warship",
    effectType: "warship",
    rarity: "legendary",
    priceHard: 520,
    priceSoft: 4600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#fef08a", "#d97706"],
      colorSize: 3,
      movementSpeed: 5,
    },
  });
  addEffect("Croiseur Émeraude", {
    name: "emerald_corsair_warship",
    effectType: "warship",
    rarity: "uncommon",
    priceHard: 180,
    priceSoft: 1500,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#10b981", "#34d399", "#065f46"],
      frequency: 2.2,
    },
  });
  addEffect("Dreadnought du Néant", {
    name: "void_dreadnought_warship",
    effectType: "warship",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#a855f7", "#ec4899", "#38bdf8"],
      colorSize: 3,
      movementSpeed: 8,
    },
  });
  addEffect("Brise-Glace Arctique", {
    name: "arctic_wolf_warship",
    effectType: "warship",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#e0f2fe", "#38bdf8", "#0369a1"],
      colorSize: 3,
      movementSpeed: 6,
    },
  });
  addEffect("Léviathan Astral Oméga", {
    name: "omega_leviathan_warship",
    effectType: "warship",
    rarity: "legendary",
    priceHard: 620,
    priceSoft: 5500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#22d3ee", "#fbbf24", "#f43f5e", "#ffffff"],
      colorSize: 3,
      movementSpeed: 9,
    },
  });

  // ==========================================================================
  // 6 EFFETS TRAINS LOGISTIQUES (train)
  // ==========================================================================
  addEffect("Train Hyperloop Cyan", {
    name: "hyperloop_cyan_train",
    effectType: "train",
    rarity: "rare",
    priceHard: 240,
    priceSoft: 2000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#22d3ee", "#818cf8", "#e0f2fe"],
      colorSize: 4,
      movementSpeed: 10,
    },
  });
  addEffect("Convoi Blindé Magma", {
    name: "magma_armored_train",
    effectType: "train",
    rarity: "epic",
    priceHard: 360,
    priceSoft: 3000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#f97316", "#ef4444", "#fde047"],
      colorSize: 4,
      movementSpeed: 9,
    },
  });
  addEffect("Express Souverain Doré", {
    name: "golden_sovereign_train",
    effectType: "train",
    rarity: "legendary",
    priceHard: 520,
    priceSoft: 4500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#fef08a", "#d97706"],
      colorSize: 4,
      movementSpeed: 11,
    },
  });
  addEffect("Train Cargo Émeraude", {
    name: "emerald_supply_train",
    effectType: "train",
    rarity: "common",
    priceHard: 140,
    priceSoft: 1200,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#10b981", "#34d399", "#047857"],
      frequency: 2.5,
    },
  });
  addEffect("Convoi Fantôme du Néant", {
    name: "void_phantom_train",
    effectType: "train",
    rarity: "epic",
    priceHard: 380,
    priceSoft: 3200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#c084fc", "#f472b6", "#6366f1"],
      colorSize: 4,
      movementSpeed: 12,
    },
  });
  addEffect("Transsibérien Cryo-Glace", {
    name: "arctic_express_train",
    effectType: "train",
    rarity: "uncommon",
    priceHard: 180,
    priceSoft: 1500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#e0f2fe", "#38bdf8", "#0284c7"],
      colorSize: 4,
      movementSpeed: 8,
    },
  });

  // ==========================================================================
  // 6 EFFETS VOIES FERRÉES (railroad)
  // ==========================================================================
  addEffect("Rails Énergétiques Néon", {
    name: "neon_energy_rails",
    effectType: "railroad",
    rarity: "epic",
    priceHard: 350,
    priceSoft: 3000,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#06b6d4", "#6366f1", "#22d3ee"],
      colorSize: 6,
      movementSpeed: 8,
    },
  });
  addEffect("Voie Ferrée Impériale Dorée", {
    name: "golden_imperial_rails",
    effectType: "railroad",
    rarity: "common",
    priceHard: 150,
    priceSoft: 1200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#d97706", "#fef08a"],
      colorSize: 6,
      movementSpeed: 6,
    },
  });
  addEffect("Lignes Magmatiques Écarlates", {
    name: "crimson_magma_rails",
    effectType: "railroad",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#f43f5e", "#f97316", "#fecdd3"],
      colorSize: 5,
      movementSpeed: 7,
    },
  });
  addEffect("Réseau Bio-Émeraude", {
    name: "emerald_circuit_rails",
    effectType: "railroad",
    rarity: "uncommon",
    priceHard: 180,
    priceSoft: 1500,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#10b981", "#a3e635", "#059669"],
      frequency: 2.2,
    },
  });
  addEffect("Conduits Quantiques du Néant", {
    name: "void_quantum_rails",
    effectType: "railroad",
    rarity: "legendary",
    priceHard: 520,
    priceSoft: 4600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#c084fc", "#f472b6", "#22d3ee"],
      colorSize: 5,
      movementSpeed: 10,
    },
  });
  addEffect("Rails Supraconducteurs Arctiques", {
    name: "arctic_superconductor_rails",
    effectType: "railroad",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#e0f2fe", "#38bdf8", "#818cf8"],
      colorSize: 6,
      movementSpeed: 9,
    },
  });

  // ==========================================================================
  // 15 PACKS MULTI-RARETÉS & COLLECTIONS THÉMATIQUES
  // ==========================================================================
  const packs: Record<string, CosmeticPack> = {
    pack_halloween_necropolis: {
      name: "pack_halloween_necropolis",
      displayName: "🎃 Pack Nécropole Maudite (Événement Halloween)",
      description:
        "Édition Spéciale Halloween : Cornes Démoniaques, Toile Nécromantique, Étendard Faucheuse d'Âmes, Sillage Ectoplasme et Déflagration Toxique Mort-Vivante.",
      priceHard: 399,
      rarity: "legendary",
      items: [
        {
          type: "pattern",
          name: "spider_web_necropolis",
          colorPalette: "halloween_purpur",
        },
        { type: "crown", name: "crown_spectral_horns" },
        { type: "flag", name: "flag_soul_reaper" },
        { type: "effect", name: "ectoplasm_wake" },
        { type: "effect", name: "necropolis_toxic_detonation" },
      ],
    },
    pack_halloween_pumpkin_infernal: {
      name: "pack_halloween_pumpkin_infernal",
      displayName: "🔥 Pack Citrouille Infernale (Édition Limitée)",
      description:
        "Édition Limitée Halloween : Couronne Roi Citrouille, Lanterne d'Effroi, Blason Samhain, Coque Citrouille Infernale et Traînée d'Âmes Enflammées.",
      priceHard: 449,
      rarity: "legendary",
      items: [
        {
          type: "pattern",
          name: "cursed_pumpkin_carve",
          colorPalette: "halloween_blaze",
        },
        { type: "crown", name: "crown_pumpkin_king" },
        { type: "flag", name: "flag_jack_lantern" },
        { type: "effect", name: "infernal_pumpkin_hull" },
        { type: "effect", name: "halloween_soul_trail" },
      ],
    },
    pack_tactical_recruit: {
      name: "pack_tactical_recruit",
      displayName: "Pack Recrue Tactique",
      description:
        "Pack d'initiation comprenant Rayures d'Assaut, Chenilles de Char, Cercle de Fer, Sillage Émeraude et Voie Ferrée Impériale.",
      priceHard: 199,
      rarity: "common",
      items: [
        {
          type: "pattern",
          name: "hazard_stripes",
          colorPalette: "emerald_matrix",
        },
        {
          type: "pattern",
          name: "tank_treads",
          colorPalette: "stealth_obsidian",
        },
        { type: "crown", name: "iron_circlet" },
        { type: "effect", name: "emerald_foam" },
        { type: "effect", name: "golden_imperial_rails" },
      ],
    },
    pack_bunker_engineer: {
      name: "pack_bunker_engineer",
      displayName: "Pack Ingénieur de Forteresse",
      description:
        "Fortifiez vos frontières : Maillage Bunker, Rouages Industriels, Couronne Crénelée, Structures Émeraude et Train Cargo.",
      priceHard: 299,
      rarity: "uncommon",
      items: [
        {
          type: "pattern",
          name: "bunker_weave",
          colorPalette: "titanium_ghost",
        },
        {
          type: "pattern",
          name: "industrial_gears",
          colorPalette: "copper_automaton",
        },
        { type: "crown", name: "steel_battlement" },
        { type: "effect", name: "emerald_matrix_structures" },
        { type: "effect", name: "emerald_supply_train" },
      ],
    },
    pack_arctic_division: {
      name: "pack_arctic_division",
      displayName: "Pack Division Polaire Arctique",
      description:
        "Domination glaciale : Cristaux Cryogéniques, Couronne de Givre, Directoire Arctique, Brise-Glace et Bombe H Blizzard.",
      priceHard: 499,
      rarity: "rare",
      items: [
        {
          type: "pattern",
          name: "cryo_crystals",
          colorPalette: "arctic_frost",
        },
        { type: "crown", name: "frost_monarch" },
        { type: "flag", name: "arctic_directorate" },
        { type: "effect", name: "arctic_wolf_warship" },
        { type: "effect", name: "arctic_blizzard_hydro" },
      ],
    },
    pack_cyber_admiral: {
      name: "pack_cyber_admiral",
      displayName: "Pack Amiral Cybernétique",
      description:
        "Dominez les océans : Grille Hexagonale Cyber-Néon, Couronne du Commandeur, Cuirassé Fantôme, Sillage Plasma et Train Hyperloop.",
      priceHard: 549,
      rarity: "rare",
      items: [
        { type: "pattern", name: "hex_grid", colorPalette: "cyber_neon" },
        { type: "crown", name: "cobalt_commander" },
        { type: "effect", name: "phantom_cyan_warship" },
        { type: "effect", name: "plasma_wake_cyan" },
        { type: "effect", name: "hyperloop_cyan_train" },
      ],
    },
    pack_biohazard_syndicate: {
      name: "pack_biohazard_syndicate",
      displayName: "Pack Syndicat Rad-Toxique",
      description:
        "Guerre chimique et atomique : Sceau Bio-Danger, Trèfle Radioactif, Couronne Rad-Overlord, Hélice Uranium et Tempête Bio-Rad.",
      priceHard: 699,
      rarity: "rare",
      items: [
        { type: "pattern", name: "biohazard_seal", colorPalette: "toxic_rad" },
        {
          type: "pattern",
          name: "radiation_trefoil",
          colorPalette: "bio_luminescence",
        },
        { type: "crown", name: "toxic_overlord" },
        { type: "flag", name: "toxic_brotherhood" },
        { type: "effect", name: "uranium_helix_trail" },
        { type: "effect", name: "bio_rad_storm_hydro" },
      ],
    },
    pack_spartan_phalanx: {
      name: "pack_spartan_phalanx",
      displayName: "Pack Phalange Impériale",
      description:
        "Tradition martiale : Lambda Spartiate, Bouclier des Ordres, Laurier Impérial, Légion Écarlate et Nova Écarlate.",
      priceHard: 649,
      rarity: "rare",
      items: [
        {
          type: "pattern",
          name: "spartan_lambda",
          colorPalette: "crimson_empire",
        },
        {
          type: "pattern",
          name: "templar_shield",
          colorPalette: "golden_sovereign",
        },
        { type: "crown", name: "imperial_laurel" },
        { type: "flag", name: "crimson_legion" },
        { type: "effect", name: "crimson_nova_atom" },
      ],
    },
    pack_sakura_shogunate: {
      name: "pack_sakura_shogunate",
      displayName: "Pack Shogunat Sakura",
      description:
        "Esthétique cyber-féodale : Mon de Shogun, Entrelacs Sakura, Ailes de Valkyrie Plasma, Drapeau Shogunat et Fusée Synthwave.",
      priceHard: 799,
      rarity: "epic",
      items: [
        { type: "pattern", name: "shogun_crest", colorPalette: "sakura_ronin" },
        {
          type: "pattern",
          name: "synth_perspective",
          colorPalette: "synthwave_sunset",
        },
        { type: "crown", name: "plasma_valkyrie" },
        { type: "flag", name: "sakura_shogunate" },
        { type: "effect", name: "synthwave_beam_trail" },
      ],
    },
    pack_hologram_division: {
      name: "pack_hologram_division",
      displayName: "Pack Division Holographique",
      description:
        "Technologie de pointe : Circuits Cybernétiques, Réseau de Qubits, Structures Hologrammes, Rails Énergétiques et Bombe A Étincelles.",
      priceHard: 899,
      rarity: "epic",
      items: [
        { type: "pattern", name: "cyber_circuit", colorPalette: "cyber_neon" },
        {
          type: "pattern",
          name: "quantum_qubits",
          colorPalette: "starlight_aegis",
        },
        { type: "effect", name: "neon_hologram_structures" },
        { type: "effect", name: "neon_energy_rails" },
        { type: "effect", name: "cyber_sparkles_atom" },
        { type: "flag", name: "hexafront_command" },
      ],
    },
    pack_crimson_hegemony: {
      name: "pack_crimson_hegemony",
      displayName: "Pack Hégémonie Écarlate",
      description:
        "Puissance de feu totale : Ondes Radar Écarlates, Couronne Lune de Sang, Hélice Apocalypse, Flotte Écarlate et Cataclysme Bombe H.",
      priceHard: 999,
      rarity: "epic",
      items: [
        {
          type: "pattern",
          name: "radar_waves",
          colorPalette: "crimson_empire",
        },
        {
          type: "pattern",
          name: "iron_eagle_wings",
          colorPalette: "blood_moon",
        },
        { type: "effect", name: "apocalypse_helix_red" },
        { type: "effect", name: "crimson_fleet_warship" },
        { type: "effect", name: "crimson_cataclysm_hydro" },
        { type: "crown", name: "blood_emperor" },
      ],
    },
    pack_solar_pharaoh: {
      name: "pack_solar_pharaoh",
      displayName: "Pack Dynastie Solaire",
      description:
        "Rayonnement ardent : Sceau des Pharaons, Rayonnement Céleste, Némès Solaire, Impérium Solaire et Éruption Bombe H.",
      priceHard: 1199,
      rarity: "epic",
      items: [
        { type: "pattern", name: "pharaoh_ankh", colorPalette: "solar_flare" },
        {
          type: "pattern",
          name: "celestial_sunburst",
          colorPalette: "desert_storm",
        },
        { type: "crown", name: "solar_pharaoh" },
        { type: "flag", name: "solar_imperium" },
        { type: "effect", name: "solar_monarch_hydro" },
        { type: "effect", name: "magma_armored_train" },
      ],
    },
    pack_void_archon: {
      name: "pack_void_archon",
      displayName: "Pack Archonte du Néant",
      description:
        "Mystères dimensionnels : Vortex Trou Noir, Tesseract 4D, Diadème d'Archonte, Dreadnought du Néant et Implosion Bombe A.",
      priceHard: 1399,
      rarity: "legendary",
      items: [
        {
          type: "pattern",
          name: "black_hole_vortex",
          colorPalette: "void_amethyst",
        },
        {
          type: "pattern",
          name: "hypercube_tesseract",
          colorPalette: "plasma_violet",
        },
        { type: "crown", name: "void_archon" },
        { type: "flag", name: "void_covenant" },
        { type: "effect", name: "void_dreadnought_warship" },
        { type: "effect", name: "void_sparkles_atom" },
      ],
    },
    pack_dragon_emperor: {
      name: "pack_dragon_emperor",
      displayName: "Pack Empereur Dragon Mythique",
      description:
        "Rage ancestrale : Écailles de Dragon, Ascension du Phénix, Cornes du Dragon Souverain, Forge Magmatique et Pluie d'Or MIRV.",
      priceHard: 1599,
      rarity: "legendary",
      items: [
        {
          type: "pattern",
          name: "dragon_scales_mythic",
          colorPalette: "magma_core",
        },
        {
          type: "pattern",
          name: "phoenix_ascension",
          colorPalette: "crimson_empire",
        },
        { type: "crown", name: "dragon_sovereign" },
        { type: "flag", name: "magma_forge" },
        { type: "effect", name: "golden_rain_mirv" },
      ],
    },
    pack_golden_sovereign: {
      name: "pack_golden_sovereign",
      displayName: "Pack Souverain Doré",
      description:
        "Prestige impérial absolu : Étoile Supernova Or, Dédale du Souverain, Halo Séraphique, Structures Impériales et Armada Dorée.",
      priceHard: 1799,
      rarity: "legendary",
      items: [
        {
          type: "pattern",
          name: "nova_star",
          colorPalette: "golden_sovereign",
        },
        {
          type: "pattern",
          name: "sovereign_labyrinth",
          colorPalette: "royal_velvet",
        },
        { type: "effect", name: "imperial_gold_structures" },
        { type: "effect", name: "golden_armada_warship" },
        { type: "effect", name: "golden_sovereign_train" },
        { type: "crown", name: "seraphim_halo" },
        { type: "flag", name: "imperial_phoenix" },
      ],
    },
    pack_omega_singularity: {
      name: "pack_omega_singularity",
      displayName: "Pack Oméga Singularity",
      description:
        "Collection Légendaire : Labyrinthe Quantique, Spirale Galactique, Spirale Nucléaire 3D, Supernova Bombe H, Singularité MIRV et Couronne Quantique.",
      priceHard: 1999,
      rarity: "legendary",
      items: [
        {
          type: "pattern",
          name: "quantum_maze",
          colorPalette: "void_amethyst",
        },
        { type: "pattern", name: "galaxy_spiral", colorPalette: "cyber_neon" },
        { type: "effect", name: "quantum_spiral_cyan" },
        { type: "effect", name: "supernova_shockwave_hydro" },
        { type: "effect", name: "void_singularity_mirv" },
        { type: "crown", name: "quantum_singularity_crown" },
      ],
    },
    pack_hexafront_apotheosis: {
      name: "pack_hexafront_apotheosis",
      displayName: "Pack Suprême Apothéose BorderConflict",
      description:
        "Le trésor ultime du Haut Commandement : Apothéose BorderConflict, Mandala Cosmique, Couronne Suprême, Léviathan Astral, Architecture Oméga et Triple Hélice.",
      priceHard: 2499,
      rarity: "legendary",
      items: [
        {
          type: "pattern",
          name: "hexafront_apotheosis",
          colorPalette: "cyber_neon",
        },
        {
          type: "pattern",
          name: "sacred_mandala",
          colorPalette: "golden_sovereign",
        },
        { type: "crown", name: "hexafront_supreme_crown" },
        { type: "flag", name: "omega_sovereignty" },
        { type: "effect", name: "omega_astral_structures" },
        { type: "effect", name: "omega_leviathan_warship" },
        { type: "effect", name: "omega_astral_wake" },
        { type: "effect", name: "sovereign_triple_helix" },
      ],
    },
  };

  // ==========================================================================
  // 25 EXPANDED NEW SPECIAL EFFECTS
  // ==========================================================================
  addEffect("Sillage Nova Lumineux", {
    name: "nova_lumina_wake",
    effectType: "transportShipTrail",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#f43f5e", "#a855f7", "#ffffff"],
      colorSize: 4,
      movementSpeed: 16,
    } as any,
  });

  addEffect("Sillage Tempête IEM", {
    name: "emp_storm_wake",
    effectType: "transportShipTrail",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#38bdf8", "#818cf8", "#c084fc"],
      colorSize: 5,
      movementSpeed: 14,
    } as any,
  });

  addEffect("Sillage Brasier Magmatique", {
    name: "magma_blaze_wake",
    effectType: "transportShipTrail",
    rarity: "epic",
    priceHard: 380,
    priceSoft: 3200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#ea580c", "#dc2626", "#fef08a"],
      colorSize: 5,
      movementSpeed: 11,
    } as any,
  });

  addEffect("Sillage Bio-Corrosion", {
    name: "bio_corrosion_wake",
    effectType: "transportShipTrail",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#84cc16", "#15803d", "#a3e635"],
      frequency: 3.5,
    } as any,
  });

  addEffect("Sillage Furtif Ombre", {
    name: "stealth_shadow_wake",
    effectType: "transportShipTrail",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#0f172a", "#334155", "#64748b"],
      colorSize: 6,
      movementSpeed: 8,
    } as any,
  });

  addEffect("Traînée Rayonnement Oméga", {
    name: "omega_radiation_nuke_trail",
    effectType: "nukeTrail",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#22d3ee", "#c084fc", "#ffffff"],
      colorSize: 3,
      movementSpeed: 18,
    } as any,
  });

  addEffect("Traînée Feu de l'Enfer", {
    name: "hellfire_nuke_trail",
    effectType: "nukeTrail",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#dc2626", "#f97316", "#fef08a"],
      colorSize: 4,
      movementSpeed: 15,
    } as any,
  });

  addEffect("Traînée Foudre d'Arc", {
    name: "arc_lightning_trail",
    effectType: "nukeTrail",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3400,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#38bdf8", "#e0f2fe", "#818cf8"],
      frequency: 5,
    } as any,
  });

  addEffect("Traînée Émeraude Fission", {
    name: "fission_emerald_trail",
    effectType: "nukeTrail",
    rarity: "rare",
    priceHard: 290,
    priceSoft: 2500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#10b981", "#059669", "#6ee7b7"],
      colorSize: 5,
      movementSpeed: 12,
    } as any,
  });

  addEffect("Traînée Cryo-Comète", {
    name: "cryo_comet_trail",
    effectType: "nukeTrail",
    rarity: "rare",
    priceHard: 290,
    priceSoft: 2500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#0284c7", "#38bdf8", "#ffffff"],
      colorSize: 5,
      movementSpeed: 12,
    } as any,
  });

  addEffect("Dôme Anti-Matière", {
    name: "antimatter_blast",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 750,
    priceSoft: 6500,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "hydro",
      colors: ["#a855f7", "#ec4899", "#22d3ee", "#ffffff"],
      size: 45,
      speed: 50,
      thickness: 4,
      transitionSpeed: 4,
    } as any,
  });

  addEffect("Éruption Stellaire Dorée", {
    name: "golden_stellar_eruption",
    effectType: "nukeExplosion",
    rarity: "legendary",
    priceHard: 750,
    priceSoft: 6500,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "atom",
      colors: ["#f59e0b", "#fde047", "#ffffff"],
      size: 42,
      speed: 48,
      thickness: 3.5,
      transitionSpeed: 4,
      density: 95,
    } as any,
  });

  addEffect("Cataclysme Toxique", {
    name: "toxic_cataclysm_blast",
    effectType: "nukeExplosion",
    rarity: "epic",
    priceHard: 450,
    priceSoft: 3900,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "atom",
      colors: ["#65a30d", "#14532d", "#d9f99d"],
      size: 36,
      speed: 40,
      thickness: 3,
      transitionSpeed: 3,
    } as any,
  });

  addEffect("Souffle Cyan IEM", {
    name: "cyan_emp_blast",
    effectType: "nukeExplosion",
    rarity: "epic",
    priceHard: 450,
    priceSoft: 3900,
    product: null,
    attributes: {
      type: "sparkles",
      nukeType: "mirvWarhead",
      colors: ["#06b6d4", "#082f49", "#67e8f9"],
      size: 38,
      speed: 42,
      thickness: 3.5,
      transitionSpeed: 4,
      density: 80,
    } as any,
  });

  addEffect("Vague Cryo-Fractale", {
    name: "cryo_fracture_blast",
    effectType: "nukeExplosion",
    rarity: "rare",
    priceHard: 320,
    priceSoft: 2800,
    product: null,
    attributes: {
      type: "shockwave",
      nukeType: "atom",
      colors: ["#e0f2fe", "#38bdf8", "#0284c7"],
      size: 32,
      speed: 38,
      thickness: 2.8,
      transitionSpeed: 3,
    } as any,
  });

  addEffect("Aura Suprême BorderConflict", {
    name: "borderconflict_supreme_aura",
    effectType: "structures",
    rarity: "legendary",
    priceHard: 700,
    priceSoft: 6200,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#22d3ee", "#fbbf24", "#f43f5e", "#a855f7"],
      colorSize: 3,
      movementSpeed: 12,
    } as any,
  });

  addEffect("Blindage Électro-Magnétique", {
    name: "em_shield_grid",
    effectType: "structures",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#60a5fa", "#3b82f6", "#93c5fd"],
      colorSize: 4,
      movementSpeed: 10,
    } as any,
  });

  addEffect("Dôme de Force Magma", {
    name: "magma_force_dome",
    effectType: "structures",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3400,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#ea580c", "#dc2626", "#fef08a"],
      colorSize: 4,
      movementSpeed: 9,
    } as any,
  });

  addEffect("Réseau Sentinelle Émeraude", {
    name: "emerald_sentinel_grid",
    effectType: "structures",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#10b981", "#34d399", "#059669"],
      frequency: 3,
    } as any,
  });

  addEffect("Défense Cryo-Renforcée", {
    name: "cryo_reinforced_hull",
    effectType: "structures",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#0284c7", "#e0f2fe", "#38bdf8"],
      colorSize: 5,
      movementSpeed: 8,
    } as any,
  });

  addEffect("Blindage Flotte Céleste", {
    name: "celestial_fleet_armor",
    effectType: "warship",
    rarity: "legendary",
    priceHard: 650,
    priceSoft: 5800,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#fbbf24", "#38bdf8", "#ffffff"],
      colorSize: 3,
      movementSpeed: 14,
    } as any,
  });

  addEffect("Cuirassé du Néant", {
    name: "void_dreadnought_hull",
    effectType: "warship",
    rarity: "epic",
    priceHard: 420,
    priceSoft: 3600,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#2e1065", "#c084fc", "#f472b6"],
      colorSize: 4,
      movementSpeed: 10,
    } as any,
  });

  addEffect("Coque Cyber-Plasma", {
    name: "cyber_plasma_hull",
    effectType: "warship",
    rarity: "epic",
    priceHard: 400,
    priceSoft: 3500,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#06b6d4", "#22d3ee", "#818cf8"],
      colorSize: 4,
      movementSpeed: 11,
    } as any,
  });

  addEffect("Cuirasse Sang de Dragon", {
    name: "dragon_blood_hull",
    effectType: "warship",
    rarity: "rare",
    priceHard: 280,
    priceSoft: 2400,
    product: null,
    attributes: {
      type: "gradient",
      colors: ["#991b1b", "#ef4444", "#fca5a5"],
      colorSize: 5,
      movementSpeed: 9,
    } as any,
  });

  addEffect("Camouflage Furtif Naval", {
    name: "stealth_naval_hull",
    effectType: "warship",
    rarity: "rare",
    priceHard: 260,
    priceSoft: 2200,
    product: null,
    attributes: {
      type: "transition",
      colors: ["#1e293b", "#334155", "#475569"],
      frequency: 2,
    } as any,
  });

  cachedCatalog = {
    colorPalettes,
    patterns,
    flags,
    crowns,
    effects,
    packs,
  };

  GameRegistry.cosmetics.applyToCatalog(cachedCatalog);

  return cachedCatalog;
}
