import {
  computeDoctrineModifiers,
  getActiveMegastructures,
  getTalentRankFromMask,
  getTotalSpentPointsInMask,
  MEDAL_DEFINITIONS,
  MedalDefinition,
  MedalId,
  PlayerStructureCounts,
  setTalentRankInMask,
  TALENT_DEFINITIONS,
  TalentId,
} from "@openfront/engine-lib/configuration/HexaFrontSystems";
import { UserMeResponse } from "@openfront/shared/ApiSchemas";
import {
  getHexaFrontCosmeticsCatalog,
  HEXAFRONT_COSMETIC_LABELS,
} from "./HexaFrontCosmeticsCatalog";

const STORAGE_KEY = "hexafront_commander_profile_v2";
const ACCOUNTS_STORAGE_KEY = "hexafront_email_accounts_v2";
const ACCOUNT_PASS_KEY = "hexafront_email_pass_v2";
export const COMMANDER_UPDATED_EVENT = "hexafront-commander-updated";

export interface CommanderProfile {
  email?: string | null;
  username?: string | null;
  level: number;
  xp: number;
  doctrineMask: number;
  gamesPlayed: number;
  victories: number;
  worldEventsSurvived: number;
  directivesCompleted: number;
  unlockedMedals: MedalId[];
  equippedMedal: MedalId | null;
  plutonium: number;
  caps: number;
  ownedFlares: string[];
  isVip?: boolean;
  vipUntil?: number;
  hasBattlePass?: boolean;
  battlePassSeason?: number;
  hasCustomSkinUnlocked?: boolean;
  customSkinUrl?: string;
  customSkinName?: string;
}

interface StoredEmailAccount {
  email: string;
  password: string;
  username: string;
  createdAt: number;
  profile: CommanderProfile;
}

export const MAX_COMMANDER_LEVEL = 36;

const STARTER_FLARES = [
  "pattern:hex_grid:cyber_neon",
  "pattern:hazard_stripes:solar_flare",
  "pattern:tactical_checker:titanium_ghost",
  "pattern:cyber_circuit:emerald_matrix",
  "pattern:nova_star:golden_sovereign",
  "crown:iron_circlet",
  "crown:cyber_emperor",
  "effect:plasma_wake_cyan",
  "effect:neon_hologram_structures",
  "flag:hexafront_command",
];

const DEFAULT_PROFILE: CommanderProfile = {
  email: null,
  username: null,
  level: 0,
  xp: 0,
  doctrineMask: 0,
  gamesPlayed: 0,
  victories: 0,
  worldEventsSurvived: 0,
  directivesCompleted: 0,
  unlockedMedals: [],
  equippedMedal: null,
  plutonium: 0,
  caps: 0,
  ownedFlares: [],
};

export function xpRequiredForLevel(level: number): number {
  if (level <= 0) return 400;
  // Real hardcore grind: requires ~200-250 hours of active play to reach max level 36
  return Math.floor(400 + Math.pow(level, 1.6) * 110);
}

export function getCommanderRankTitle(level: number): {
  title: string;
  badge: string;
  color: string;
} {
  if (level >= 30) {
    return { title: "Stratège Suprême", badge: "👑", color: "#f43f5e" };
  }
  if (level >= 22) {
    return { title: "Maréchal de BorderConflict", badge: "🌟", color: "#a855f7" };
  }
  if (level >= 15) {
    return { title: "Général de Division", badge: "🎖️", color: "#f59e0b" };
  }
  if (level >= 10) {
    return { title: "Colonel Tactique", badge: "🦅", color: "#06b6d4" };
  }
  if (level >= 5) {
    return { title: "Commandant de Front", badge: "⚔️", color: "#38bdf8" };
  }
  if (level >= 1) {
    return { title: "Sous-Lieutenant", badge: "🔰", color: "#94a3b8" };
  }
  return { title: "Recrue", badge: "🎖️", color: "#64748b" };
}

class CommanderStore {
  private profile: CommanderProfile;

  constructor() {
    this.profile = this.load();
  }

  private load(): CommanderProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROFILE };
      const parsed = JSON.parse(raw) as Partial<CommanderProfile>;
      return {
        email: typeof parsed.email === "string" ? parsed.email : null,
        username: typeof parsed.username === "string" ? parsed.username : null,
        level: Math.max(
          0,
          Math.min(MAX_COMMANDER_LEVEL, parsed.level ?? DEFAULT_PROFILE.level),
        ),
        xp: Math.max(0, parsed.xp ?? DEFAULT_PROFILE.xp),
        doctrineMask: Math.max(0, parsed.doctrineMask ?? 0),
        gamesPlayed: Math.max(0, parsed.gamesPlayed ?? 0),
        victories: Math.max(0, parsed.victories ?? 0),
        worldEventsSurvived: Math.max(0, parsed.worldEventsSurvived ?? 0),
        directivesCompleted: Math.max(0, parsed.directivesCompleted ?? 0),
        unlockedMedals: Array.isArray(parsed.unlockedMedals)
          ? parsed.unlockedMedals
          : [],
        equippedMedal: parsed.equippedMedal ?? null,
        plutonium: Math.max(0, parsed.plutonium ?? DEFAULT_PROFILE.plutonium),
        caps: Math.max(0, parsed.caps ?? DEFAULT_PROFILE.caps),
        ownedFlares: Array.isArray(parsed.ownedFlares)
          ? parsed.ownedFlares
          : [],
      };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      if (this.profile.email) {
        const accounts = this.loadAccountsDb();
        const key = this.profile.email.toLowerCase();
        if (accounts[key]) {
          accounts[key].profile = { ...this.profile };
          if (this.profile.username) {
            accounts[key].username = this.profile.username;
          }
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        }
      }
    } catch {
      // Ignore storage quota issues
    }

    // Trigger server-side cloud sync in background if signed in
    this.syncWithServerInBackground();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(COMMANDER_UPDATED_EVENT, { detail: this.getProfile() }),
      );
      document.dispatchEvent(
        new CustomEvent("userMeResponse", {
          detail: this.getLocalUserMeResponse(),
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  }

  private syncWithServerInBackground(): void {
    if (typeof window === "undefined" || !this.profile.email) return;
    const email = this.profile.email;
    const password = localStorage.getItem(ACCOUNT_PASS_KEY);
    if (!password) return;

    fetch("/api/account/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        profile: this.profile,
      }),
    }).catch(() => {
      // Silently fall back to offline/local
    });
  }

  private loadAccountsDb(): Record<string, StoredEmailAccount> {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, StoredEmailAccount>;
    } catch {
      return {};
    }
  }

  private saveAccountsDb(db: Record<string, StoredEmailAccount>): void {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore storage quota issues
    }
  }

  async registerWithEmail(
    emailRaw: string,
    passwordRaw: string,
    usernameRaw?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const email = emailRaw.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        ok: false,
        error: "Veuillez saisir une adresse e-mail valide.",
      };
    }
    if (passwordRaw.length < 4) {
      return {
        ok: false,
        error: "Le mot de passe doit contenir au moins 4 caractères.",
      };
    }

    const fallbackName = email.split("@")[0].slice(0, 18) || "Commandant";
    const username = (usernameRaw?.trim() || fallbackName).slice(0, 20);

    // Call Centralized Database API
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: passwordRaw, username }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || "Erreur lors de la création du compte." };
      }
      if (data.profile) {
        this.profile = { ...data.profile };
      }
    } catch {
      // Local fallback
    }

    this.profile.email = email;
    this.profile.username = username;

    const db = this.loadAccountsDb();
    db[email] = {
      email,
      password: passwordRaw,
      username,
      createdAt: Date.now(),
      profile: { ...this.profile },
    };
    this.saveAccountsDb(db);
    localStorage.setItem(ACCOUNT_PASS_KEY, passwordRaw);
    this.save();
    return { ok: true };
  }

  async loginWithEmail(
    emailRaw: string,
    passwordRaw: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const email = emailRaw.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        ok: false,
        error: "Veuillez saisir une adresse e-mail valide.",
      };
    }
    if (!passwordRaw) {
      return {
        ok: false,
        error: "Veuillez saisir votre mot de passe.",
      };
    }

    // Call Centralized Database API first
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: passwordRaw }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.profile) {
        this.profile = {
          ...data.profile,
          email,
          username: data.profile.username || email.split("@")[0],
          ownedFlares: Array.from(
            new Set([...STARTER_FLARES, ...(data.profile.ownedFlares ?? [])]),
          ),
        };
        const db = this.loadAccountsDb();
        db[email] = {
          email,
          password: passwordRaw,
          username: this.profile.username || email.split("@")[0],
          createdAt: Date.now(),
          profile: { ...this.profile },
        };
        this.saveAccountsDb(db);
        localStorage.setItem(ACCOUNT_PASS_KEY, passwordRaw);
        this.save();
        return { ok: true };
      } else if (res.status === 401) {
        return { ok: false, error: data.error || "Mot de passe incorrect." };
      }
    } catch {
      // Fallback to local accounts db if offline
    }

    const db = this.loadAccountsDb();
    const existing = db[email];
    if (!existing) {
      return this.registerWithEmail(email, passwordRaw);
    }
    if (existing.password !== passwordRaw) {
      return {
        ok: false,
        error: "Mot de passe incorrect pour cette adresse e-mail.",
      };
    }
    this.profile = {
      ...existing.profile,
      email: existing.email,
      username: existing.username,
      ownedFlares: Array.from(
        new Set([...STARTER_FLARES, ...(existing.profile.ownedFlares ?? [])]),
      ),
    };
    localStorage.setItem(ACCOUNT_PASS_KEY, passwordRaw);
    this.save();
    return { ok: true };
  }

  logoutEmail(): void {
    this.profile.email = null;
    localStorage.removeItem(ACCOUNT_PASS_KEY);
    this.save();
  }

  getEmail(): string | null {
    return this.profile.email ?? null;
  }

  getProfile(): CommanderProfile {
    return { ...this.profile };
  }

  getDoctrineMask(): number {
    return this.profile.doctrineMask;
  }

  getSpentPoints(): number {
    return getTotalSpentPointsInMask(this.profile.doctrineMask);
  }

  getAvailablePoints(): number {
    return Math.max(0, this.profile.level - this.getSpentPoints());
  }

  getTalentRank(talentId: TalentId): number {
    return getTalentRankFromMask(this.profile.doctrineMask, talentId);
  }

  canUnlockTalent(talentId: TalentId): boolean {
    const def = TALENT_DEFINITIONS.find((t) => t.id === talentId);
    if (!def) return false;
    if (!def.prerequisite) return true;
    return this.getTalentRank(def.prerequisite) >= 1;
  }

  upgradeTalent(talentId: TalentId): boolean {
    if (this.getAvailablePoints() <= 0) return false;
    if (!this.canUnlockTalent(talentId)) return false;
    const current = this.getTalentRank(talentId);
    if (current >= 3) return false;
    this.profile.doctrineMask = setTalentRankInMask(
      this.profile.doctrineMask,
      talentId,
      current + 1,
    );
    this.save();
    return true;
  }

  resetTalents(): void {
    this.profile.doctrineMask = 0;
    this.save();
  }

  applyPresetBranch(branch: "assault" | "fortress" | "economy" | "apocalypse"): void {
    this.profile.doctrineMask = 0;
    const branchTalents = TALENT_DEFINITIONS.filter((t) => t.branch === branch);
    for (const talent of branchTalents) {
      while (
        this.getAvailablePoints() > 0 &&
        this.getTalentRank(talent.id) < 3
      ) {
        this.profile.doctrineMask = setTalentRankInMask(
          this.profile.doctrineMask,
          talent.id,
          this.getTalentRank(talent.id) + 1,
        );
      }
    }
    this.save();
  }

  addXp(amount: number): { leveledUp: boolean; newLevel: number } {
    let leveledUp = false;
    this.profile.xp += Math.max(0, Math.floor(amount));
    while (
      this.profile.level < MAX_COMMANDER_LEVEL &&
      this.profile.xp >= xpRequiredForLevel(this.profile.level)
    ) {
      this.profile.xp -= xpRequiredForLevel(this.profile.level);
      this.profile.level++;
      // Level-up reward: 1 plutonium, 12 caps
      this.profile.plutonium += 1;
      this.profile.caps += 12;
      leveledUp = true;
    }
    this.save();
    return { leveledUp, newLevel: this.profile.level };
  }

  isVipActive(): boolean {
    if (!this.profile.isVip) return false;
    if (!this.profile.vipUntil) return true;
    return Date.now() < this.profile.vipUntil;
  }

  hasSeasonPass(): boolean {
    return !!this.profile.hasBattlePass;
  }

  hasCustomSkinUnlocked(): boolean {
    if (this.isVipActive()) return true;
    return !!this.profile.hasCustomSkinUnlocked;
  }

  getCustomSkinUrl(): string | null {
    return this.profile.customSkinUrl || null;
  }

  getCustomSkinName(): string | null {
    return this.profile.customSkinName || null;
  }

  setCustomSkin(url: string, name: string) {
    this.profile.customSkinUrl = url;
    this.profile.customSkinName = name;
    this.profile.hasCustomSkinUnlocked = true;
    if (!this.profile.ownedFlares.includes("skin:*")) {
      this.profile.ownedFlares.push("skin:*");
    }
    if (!this.profile.ownedFlares.includes(`skin:${name}`)) {
      this.profile.ownedFlares.push(`skin:${name}`);
    }
    this.save();
    window.dispatchEvent(
      new CustomEvent(COMMANDER_UPDATED_EVENT, { detail: this.getProfile() }),
    );
  }

  recordMatchPlayed(won: boolean, durationSeconds: number): {
    xpGained: number;
    leveledUp: boolean;
  } {
    this.profile.gamesPlayed++;
    if (won) this.profile.victories++;
    const isVip = this.isVipActive();
    // Hard grind rewards: 0 plutonium on loss, 1 on victory. Very scarce caps. VIP gets +25% caps & +2 bonus XP
    const capsGained = won ? (isVip ? 7 : 5) : (isVip ? 2 : 1);
    this.profile.plutonium += won ? 1 : 0;
    this.profile.caps += capsGained;
    const baseXp = won ? 18 : 6;
    const timeBonus = Math.min(6, Math.floor(durationSeconds * 0.015));
    const xpGained = baseXp + timeBonus + (isVip ? 2 : 0);
    const res = this.addXp(xpGained);
    return { xpGained, leveledUp: res.leveledUp };
  }

  recordWorldEventSurvived(): void {
    this.profile.worldEventsSurvived++;
    this.profile.plutonium += 0;
    this.profile.caps += 2;
    this.addXp(4);
    this.checkCareerMedals();
  }

  recordDirectiveCompleted(xpReward: number = 25): void {
    this.profile.directivesCompleted++;
    this.profile.plutonium += 0;
    this.profile.caps += 3;
    this.addXp(Math.min(xpReward, 6));
    this.checkCareerMedals();
  }

  addCurrency(plutonium: number, caps: number): void {
    this.profile.plutonium = Math.max(0, this.profile.plutonium + plutonium);
    this.profile.caps = Math.max(0, this.profile.caps + caps);
    this.save();
  }

  purchaseLocalCosmetic(
    flaresToGrant: string[],
    price: number,
    method: "hard" | "soft",
  ): boolean {
    if (method === "hard") {
      if (this.profile.plutonium < price) return false;
      this.profile.plutonium -= price;
    } else {
      if (this.profile.caps < price) return false;
      this.profile.caps -= price;
    }
    const merged = new Set([...this.profile.ownedFlares, ...flaresToGrant]);
    this.profile.ownedFlares = Array.from(merged);
    this.save();
    return true;
  }

  openSupplyCrate(tier: "standard" | "elite" | "supreme"): {
    ok: boolean;
    error?: string;
    granted: { flare: string; label: string; rarity: string }[];
  } {
    const cost =
      tier === "standard"
        ? { method: "soft" as const, amount: 2500, count: 2 }
        : tier === "elite"
          ? { method: "hard" as const, amount: 450, count: 3 }
          : { method: "hard" as const, amount: 900, count: 4 };

    if (cost.method === "hard" && this.profile.plutonium < cost.amount) {
      return {
        ok: false,
        error: `Plutonium insuffisant (${cost.amount} 💎 requis)`,
        granted: [],
      };
    }
    if (cost.method === "soft" && this.profile.caps < cost.amount) {
      return {
        ok: false,
        error: `Caps insuffisants (${cost.amount} 🪙 requis)`,
        granted: [],
      };
    }

    const catalog = getHexaFrontCosmeticsCatalog();
    const pool: { flare: string; label: string; rarity: string }[] = [];

    for (const [pKey, pVal] of Object.entries(catalog.patterns)) {
      const pLabel =
        HEXAFRONT_COSMETIC_LABELS[`territory_patterns.pattern.${pKey}`] ??
        pKey.replace(/_/g, " ");
      for (const cp of pVal.colorPalettes ?? []) {
        const cpLabel =
          HEXAFRONT_COSMETIC_LABELS[
            `territory_patterns.color_palette.${cp.name}`
          ] ?? cp.name.replace(/_/g, " ");
        const flare = `pattern:${pKey}:${cp.name}`;
        if (!this.profile.ownedFlares.includes(flare)) {
          pool.push({
            flare,
            label: `Skin ${pLabel} (${cpLabel})`,
            rarity: String(pVal.rarity),
          });
        }
      }
    }
    for (const [, byName] of Object.entries(catalog.effects ?? {})) {
      for (const [eKey, eVal] of Object.entries(byName ?? {})) {
        const flare = `effect:${eKey}`;
        if (!this.profile.ownedFlares.includes(flare)) {
          const eLabel =
            HEXAFRONT_COSMETIC_LABELS[`effects.${eKey}`] ??
            eKey.replace(/_/g, " ");
          pool.push({
            flare,
            label: `Effet ${eLabel}`,
            rarity: String(eVal.rarity),
          });
        }
      }
    }
    for (const [cKey, cVal] of Object.entries(catalog.crowns ?? {})) {
      const flare = `crown:${cKey}`;
      if (!this.profile.ownedFlares.includes(flare)) {
        const cLabel =
          HEXAFRONT_COSMETIC_LABELS[`crowns.${cKey}`] ??
          cKey.replace(/_/g, " ");
        pool.push({
          flare,
          label: `Couronne ${cLabel}`,
          rarity: String(cVal.rarity),
        });
      }
    }
    for (const [fKey, fVal] of Object.entries(catalog.flags ?? {})) {
      const flare = `flag:${fKey}`;
      if (!this.profile.ownedFlares.includes(flare)) {
        const fLabel =
          HEXAFRONT_COSMETIC_LABELS[`flags.${fKey}`] ??
          fKey.replace(/_/g, " ");
        pool.push({
          flare,
          label: `Bannière ${fLabel}`,
          rarity: String(fVal.rarity),
        });
      }
    }

    if (pool.length === 0) {
      return {
        ok: false,
        error: "Vous possédez déjà 100% des cosmétiques du catalogue !",
        granted: [],
      };
    }

    if (cost.method === "hard") {
      this.profile.plutonium -= cost.amount;
    } else {
      this.profile.caps -= cost.amount;
    }

    // Filter/bias pool for supreme or elite crates
    let weightedPool = pool;
    if (tier === "supreme") {
      const highRarity = pool.filter(
        (i) => i.rarity === "legendary" || i.rarity === "epic",
      );
      if (highRarity.length >= cost.count) weightedPool = highRarity;
    } else if (tier === "elite") {
      const midHigh = pool.filter((i) => i.rarity !== "common");
      if (midHigh.length >= cost.count) weightedPool = midHigh;
    }

    const shuffled = [...weightedPool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(cost.count, shuffled.length));
    for (const item of picked) {
      if (!this.profile.ownedFlares.includes(item.flare)) {
        this.profile.ownedFlares.push(item.flare);
      }
    }
    this.save();
    return { ok: true, granted: picked };
  }

  getLocalUserMeResponse(): UserMeResponse {
    const xpMax = xpRequiredForLevel(this.profile.level);
    return {
      user: this.profile.email
        ? {
            email: this.profile.email,
          }
        : {},
      steamLicence: true,
      steamLicenceSince: null,
      noticesSeen: [],
      pendingMessages: [],
      player: {
        publicId: this.profile.email
          ? `cmd-${this.profile.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "")}`
          : "hexafront-commander",
        username: this.profile.username ?? undefined,
        adfree: true,
        canCreatePublicLobbies: true,
        trustTier: "trusted",
        flares: [...this.profile.ownedFlares],
        achievements: {
          singleplayerMap: [],
          player: [],
        },
        currency: {
          hard: this.profile.plutonium,
          soft: this.profile.caps,
        },
        progress: {
          prestige: 0,
          level: this.profile.level,
          xpInLevel: this.profile.xp,
          xpForNext: xpMax,
          lifetimeXp:
            (this.profile.level - 1) * 450 + this.profile.xp,
          legend: this.profile.level >= MAX_COMMANDER_LEVEL,
          canPrestige: false,
        },
        friends: [],
        levelHidden: false,
        searchHidden: false,
        subscription: null,
      },
    };
  }

  equipMedal(medalId: MedalId | null): void {
    if (medalId === null || this.profile.unlockedMedals.includes(medalId)) {
      this.profile.equippedMedal = medalId;
      this.save();
    }
  }

  getEquippedMedalDef(): MedalDefinition | null {
    if (!this.profile.equippedMedal) return null;
    return (
      MEDAL_DEFINITIONS.find((m) => m.id === this.profile.equippedMedal) ?? null
    );
  }

  private unlockMedalInternal(id: MedalId): MedalDefinition | null {
    if (this.profile.unlockedMedals.includes(id)) return null;
    const def = MEDAL_DEFINITIONS.find((m) => m.id === id);
    if (!def) return null;
    this.profile.unlockedMedals = [...this.profile.unlockedMedals, id];
    if (!this.profile.equippedMedal) {
      this.profile.equippedMedal = id;
    }
    return def;
  }

  private checkCareerMedals(): MedalDefinition[] {
    const newlyUnlocked: MedalDefinition[] = [];
    const tryUnlock = (id: MedalId, cond: boolean) => {
      if (!cond) return;
      const def = this.unlockMedalInternal(id);
      if (def) newlyUnlocked.push(def);
    };

    tryUnlock("first_victory", this.profile.victories >= 1);
    tryUnlock("directive_operative", this.profile.directivesCompleted >= 3);
    tryUnlock("cataclysm_survivor", this.profile.worldEventsSurvived >= 5);
    tryUnlock("front_veteran", this.profile.gamesPlayed >= 5);
    tryUnlock("hexafront_legend", this.profile.level >= 15);

    if (newlyUnlocked.length > 0) {
      let bonusXp = 0;
      for (const m of newlyUnlocked) bonusXp += m.xpBonus;
      this.addXp(bonusXp);
    }
    return newlyUnlocked;
  }

  evaluateMatchMedals(
    won: boolean,
    counts: PlayerStructureCounts,
  ): MedalDefinition[] {
    const newlyUnlocked: MedalDefinition[] = [];
    const activeMegas = getActiveMegastructures(counts);
    const tryUnlock = (id: MedalId, cond: boolean) => {
      if (!cond) return;
      const def = this.unlockMedalInternal(id);
      if (def) newlyUnlocked.push(def);
    };

    tryUnlock("first_victory", won || this.profile.victories >= 1);
    tryUnlock("hegemon", counts.tilesOwned >= 1500);
    tryUnlock("arcology_builder", counts.cities >= 3);
    tryUnlock(
      "industrial_tycoon",
      counts.factories >= 3 || counts.gold >= 500_000,
    );
    tryUnlock("grand_admiral", counts.ports >= 3);
    tryUnlock("atomic_master", counts.silos >= 2);
    tryUnlock("iron_sentinel", counts.defensesAndSam >= 4);
    tryUnlock("directive_operative", this.profile.directivesCompleted >= 3);
    tryUnlock("cataclysm_survivor", this.profile.worldEventsSurvived >= 5);
    tryUnlock("front_veteran", this.profile.gamesPlayed >= 5);
    tryUnlock("supreme_architect", activeMegas.length >= 3);
    tryUnlock("hexafront_legend", this.profile.level >= 15);

    if (newlyUnlocked.length > 0) {
      let bonusXp = 0;
      for (const m of newlyUnlocked) bonusXp += m.xpBonus;
      this.addXp(bonusXp);
    }
    return newlyUnlocked;
  }

  getActiveModifiers() {
    return computeDoctrineModifiers(this.profile.doctrineMask);
  }
}

export const commanderStore = new CommanderStore();
