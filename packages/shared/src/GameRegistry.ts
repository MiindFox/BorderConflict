import {
  ColorPalette,
  CosmeticPack,
  Cosmetics,
  Crown,
  Effect,
  Flag,
  Pattern,
  Skin,
} from "./CosmeticSchemas";

// ============================================================================
// 1. GAME PRESETS & MODES REGISTRY
// ============================================================================

export interface GamePresetModifiers {
  troopProductionMult?: number;
  goldProductionMult?: number;
  attackSpeedMult?: number;
  startingGold?: number;
  boatMaxNumber?: number;
  defensePostCostMult?: number;
  nukeCostMult?: number;
  infiniteGold?: boolean;
}

export interface GamePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  isCustom?: boolean;
  modifiers: GamePresetModifiers;
}

class GamePresetRegistry {
  private presets: Map<string, GamePreset> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register({
      id: "standard",
      name: "Standard Compétitif",
      description: "Règles et équilibrage officiels de BorderConflict.",
      icon: "⚖️",
      modifiers: {
        troopProductionMult: 1.0,
        goldProductionMult: 1.0,
        attackSpeedMult: 1.0,
      },
    });

    this.register({
      id: "blitz",
      name: "Mode Blitz",
      description: "Parties rapides : production x2, attaques ultra-rapides.",
      icon: "⚡",
      modifiers: {
        troopProductionMult: 2.0,
        goldProductionMult: 1.5,
        attackSpeedMult: 1.8,
        startingGold: 1000,
      },
    });

    this.register({
      id: "nuclear_escalation",
      name: "Escalade Nucléaire",
      description: "Silos et bombes atomiques à prix réduit et production accélérée.",
      icon: "☢️",
      modifiers: {
        nukeCostMult: 0.35,
        startingGold: 2500,
        troopProductionMult: 1.2,
      },
    });

    this.register({
      id: "mega_empires",
      name: "Méga Empires",
      description: "Revenus commerciaux et métropoles x3, limites de navires doublées.",
      icon: "👑",
      modifiers: {
        goldProductionMult: 3.0,
        boatMaxNumber: 6,
        startingGold: 5000,
      },
    });

    this.register({
      id: "fortress_siege",
      name: "Guerre de Siège",
      description: "Postes de défense imprenables et coût des fortifications divisé par deux.",
      icon: "🛡️",
      modifiers: {
        defensePostCostMult: 0.5,
        attackSpeedMult: 0.8,
      },
    });

    this.register({
      id: "sandbox",
      name: "Bac à Sable (Sandbox)",
      description: "Or illimité, pas de contraintes de ressources.",
      icon: "🏖️",
      modifiers: {
        infiniteGold: true,
        troopProductionMult: 2.5,
        attackSpeedMult: 2.0,
        startingGold: 999999,
      },
    });
  }

  public register(preset: GamePreset): void {
    this.presets.set(preset.id, preset);
  }

  public get(id: string): GamePreset | undefined {
    return this.presets.get(id);
  }

  public getAll(): GamePreset[] {
    return Array.from(this.presets.values());
  }
}

// ============================================================================
// 2. UNIT & STRUCTURE REGISTRY (METADATA & BALANCE)
// ============================================================================

export type UnitCategory =
  | "military"
  | "naval"
  | "economy"
  | "defense"
  | "nuclear";

export interface UnitMetadata {
  id: string;
  name: string;
  description: string;
  category: UnitCategory;
  icon: string;
  baseCost: number;
  maxAllowed?: number;
  tags?: string[];
}

class UnitRegistry {
  private units: Map<string, UnitMetadata> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register({
      id: "city",
      name: "Ville",
      description: "Génère des revenus passifs et des troupes régulières.",
      category: "economy",
      icon: "🏙️",
      baseCost: 200,
    });

    this.register({
      id: "factory",
      name: "Usine",
      description: "Centre de production industrielle pour booster la logistique.",
      category: "economy",
      icon: "🏭",
      baseCost: 500,
    });

    this.register({
      id: "defense_post",
      name: "Poste de Défense",
      description: "Fortifie le territoire environnant et repousse les attaques ennemies.",
      category: "defense",
      icon: "🛡️",
      baseCost: 250,
    });

    this.register({
      id: "sam_launcher",
      name: "Batterie SAM",
      description: "Intercepte et abat les missiles et bombardiers en vol.",
      category: "defense",
      icon: "🎯",
      baseCost: 400,
    });

    this.register({
      id: "port",
      name: "Port Maritime",
      description: "Permet de déployer des navires de commerce et de guerre.",
      category: "naval",
      icon: "⚓",
      baseCost: 350,
    });

    this.register({
      id: "warship",
      name: "Navire de Guerre",
      description: "Patrouille et domine les eaux territoriales.",
      category: "naval",
      icon: "🚢",
      baseCost: 800,
    });

    this.register({
      id: "missile_silo",
      name: "Silo à Missiles",
      description: "Infrastructure souterraine pour stocker et tirer l'arme atomique.",
      category: "nuclear",
      icon: "🚀",
      baseCost: 1500,
    });
  }

  public register(metadata: UnitMetadata): void {
    this.units.set(metadata.id, metadata);
  }

  public get(id: string): UnitMetadata | undefined {
    return this.units.get(id);
  }

  public getAll(): UnitMetadata[] {
    return Array.from(this.units.values());
  }

  public getByCategory(category: UnitCategory): UnitMetadata[] {
    return this.getAll().filter((u) => u.category === category);
  }
}

// ============================================================================
// 3. COSMETICS REGISTRY (MODULAR SKIN & ASSET EXTENSIONS)
// ============================================================================

class CosmeticsRegistry {
  private customPalettes: Record<string, ColorPalette> = {};
  private customPatterns: Record<string, Pattern> = {};
  private customFlags: Record<string, Flag> = {};
  private customCrowns: Record<string, Crown> = {};
  private customSkins: Record<string, Skin> = {};
  private customEffects: Record<string, Record<string, any>> = {};
  private customPacks: Record<string, CosmeticPack> = {};

  public registerPalette(palette: ColorPalette): void {
    this.customPalettes[palette.name] = palette;
  }

  public registerPattern(pattern: Pattern): void {
    this.customPatterns[pattern.name] = pattern;
  }

  public registerFlag(flag: Flag): void {
    this.customFlags[flag.name] = flag;
  }

  public registerCrown(crown: Crown): void {
    this.customCrowns[crown.name] = crown;
  }

  public registerSkin(skin: Skin): void {
    this.customSkins[skin.name] = skin;
  }

  public registerEffect(effect: Effect): void {
    const type = effect.effectType;
    if (!this.customEffects[type]) {
      this.customEffects[type] = {};
    }
    this.customEffects[type][effect.name] = effect;
  }

  public registerPack(pack: CosmeticPack): void {
    this.customPacks[pack.name] = pack;
  }

  public loadFromJson(data: Partial<Cosmetics>): void {
    if (data.colorPalettes) Object.assign(this.customPalettes, data.colorPalettes);
    if (data.patterns) Object.assign(this.customPatterns, data.patterns);
    if (data.flags) Object.assign(this.customFlags, data.flags);
    if (data.crowns) Object.assign(this.customCrowns, data.crowns);
    if (data.skins) Object.assign(this.customSkins, data.skins);
    if (data.packs) Object.assign(this.customPacks, data.packs);
    if (data.effects) {
      for (const [type, effectsObj] of Object.entries(data.effects)) {
        if (!effectsObj) continue;
        if (!this.customEffects[type]) this.customEffects[type] = {};
        Object.assign(this.customEffects[type], effectsObj);
      }
    }
  }

  public applyToCatalog(catalog: Cosmetics): void {
    if (Object.keys(this.customPalettes).length > 0) {
      catalog.colorPalettes ??= {};
      Object.assign(catalog.colorPalettes, this.customPalettes);
    }
    if (Object.keys(this.customPatterns).length > 0) {
      Object.assign(catalog.patterns, this.customPatterns);
    }
    if (Object.keys(this.customFlags).length > 0) {
      Object.assign(catalog.flags, this.customFlags);
    }
    if (Object.keys(this.customCrowns).length > 0) {
      catalog.crowns ??= {};
      Object.assign(catalog.crowns, this.customCrowns);
    }
    if (Object.keys(this.customSkins).length > 0) {
      catalog.skins ??= {};
      Object.assign(catalog.skins, this.customSkins);
    }
    if (Object.keys(this.customEffects).length > 0) {
      catalog.effects ??= {};
      for (const [type, effectsObj] of Object.entries(this.customEffects)) {
        (catalog.effects as any)[type] ??= {};
        Object.assign((catalog.effects as any)[type], effectsObj);
      }
    }
    if (Object.keys(this.customPacks).length > 0) {
      catalog.packs ??= {};
      Object.assign(catalog.packs, this.customPacks);
    }
  }

  public clearCustom(): void {
    this.customPalettes = {};
    this.customPatterns = {};
    this.customFlags = {};
    this.customCrowns = {};
    this.customSkins = {};
    this.customEffects = {};
    this.customPacks = {};
  }
}

// ============================================================================
// 4. UNIFIED GAME REGISTRY EXPORT
// ============================================================================

export class GameRegistry {
  public static readonly presets = new GamePresetRegistry();
  public static readonly units = new UnitRegistry();
  public static readonly cosmetics = new CosmeticsRegistry();
}
