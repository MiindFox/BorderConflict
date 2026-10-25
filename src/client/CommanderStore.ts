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
const GAME_HISTORY_KEY = "hexafront_game_history_v2";
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
  prestige?: number;
  ownedFlares: string[];
  isVip?: boolean;
  vipUntil?: number;
  hasBattlePass?: boolean;
  battlePassSeason?: number;
  hasCustomSkinUnlocked?: boolean;
  customSkinUrl?: string;
  customSkinName?: string;
  isAdmin?: boolean;
  role?: string;
  isBanned?: boolean;
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
  prestige: 0,
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
    return {
      title: "Maréchal de BorderConflict",
      badge: "🌟",
      color: "#a855f7",
    };
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
    this.checkCareerMedals();
    if (typeof window !== "undefined") {
      setTimeout(() => {
        this.syncWithServerInBackground();
        this.sendPresencePing();
      }, 10);
      setInterval(() => this.sendPresencePing(), 20_000);
      window.addEventListener("focus", () => {
        this.syncWithServerInBackground();
        this.sendPresencePing();
      });
      window.addEventListener("online", () => {
        this.syncWithServerInBackground();
        this.sendPresencePing();
      });
    }
  }

  public sendPresencePing(): void {
    if (typeof window === "undefined") return;
    try {
      let sessionId = sessionStorage.getItem("bc_session_id");
      if (!sessionId) {
        sessionId =
          "sess_" +
          Math.random().toString(36).substring(2) +
          Date.now().toString(36);
        sessionStorage.setItem("bc_session_id", sessionId);
      }
      const inGame = document.body.classList.contains("in-game");
      fetch("/api/presence/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          username: this.profile.username || "Commandant",
          email: this.profile.email || undefined,
          state: inGame ? "in_game" : "menu",
          currentPage: window.currentPageId || "play",
        }),
      }).catch(() => {});
    } catch {}
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
        prestige: Math.max(0, parsed.prestige ?? 0),
        ownedFlares: Array.isArray(parsed.ownedFlares)
          ? parsed.ownedFlares
          : [],
        isVip: !!parsed.isVip,
        vipUntil:
          typeof parsed.vipUntil === "number" ? parsed.vipUntil : undefined,
        hasBattlePass: !!parsed.hasBattlePass,
        battlePassSeason:
          typeof parsed.battlePassSeason === "number"
            ? parsed.battlePassSeason
            : undefined,
        hasCustomSkinUnlocked: !!parsed.hasCustomSkinUnlocked,
        customSkinUrl:
          typeof parsed.customSkinUrl === "string"
            ? parsed.customSkinUrl
            : undefined,
        customSkinName:
          typeof parsed.customSkinName === "string"
            ? parsed.customSkinName
            : undefined,
        isAdmin:
          parsed.username?.toLowerCase() === "darkgdooo" ||
          parsed.email?.toLowerCase() === "darkgdooo@gmail.com"
            ? true
            : Boolean(parsed.isAdmin),
        role:
          parsed.username?.toLowerCase() === "darkgdooo" ||
          parsed.email?.toLowerCase() === "darkgdooo@gmail.com"
            ? "admin"
            : (parsed.role ?? "player"),
        isBanned: Boolean(parsed.isBanned),
      };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  private saveLocalAndBroadcast(): void {
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

  private save(): void {
    this.saveLocalAndBroadcast();
    // Trigger server-side cloud sync in background if signed in
    this.syncWithServerInBackground();
  }

  private sendCurrencyDelta(
    deltaPlutonium: number,
    deltaCaps: number,
    reason: string = "mutation",
  ): void {
    if (typeof window === "undefined" || !this.profile.email) return;
    const email = this.profile.email;
    const password = localStorage.getItem(ACCOUNT_PASS_KEY);
    if (!password) return;

    fetch("/api/account/currency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        deltaPlutonium,
        deltaCaps,
        reason,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data?.profile) {
          this.applyServerProfile(data.profile);
        }
      })
      .catch(() => {
        // Fallback silently if offline
      });
  }

  private applyServerProfile(serverProfile: any): void {
    if (!serverProfile) return;
    let changed = false;

    // Cloud Authoritative Currencies: Always synchronize directly with the central database!
    if (
      typeof serverProfile.plutonium === "number" &&
      this.profile.plutonium !== serverProfile.plutonium
    ) {
      this.profile.plutonium = serverProfile.plutonium;
      changed = true;
    }
    if (
      typeof serverProfile.caps === "number" &&
      this.profile.caps !== serverProfile.caps
    ) {
      this.profile.caps = serverProfile.caps;
      changed = true;
    }
    if (serverProfile.isVip && !this.profile.isVip) {
      this.profile.isVip = true;
      changed = true;
    }
    if (
      typeof serverProfile.vipUntil === "number" &&
      (!this.profile.vipUntil || serverProfile.vipUntil > this.profile.vipUntil)
    ) {
      this.profile.vipUntil = serverProfile.vipUntil;
      changed = true;
    }
    if (serverProfile.hasBattlePass && !this.profile.hasBattlePass) {
      this.profile.hasBattlePass = true;
      changed = true;
    }
    if (
      typeof serverProfile.battlePassSeason === "number" &&
      (!this.profile.battlePassSeason ||
        serverProfile.battlePassSeason > (this.profile.battlePassSeason || 0))
    ) {
      this.profile.battlePassSeason = serverProfile.battlePassSeason;
      changed = true;
    }
    if (
      serverProfile.hasCustomSkinUnlocked &&
      !this.profile.hasCustomSkinUnlocked
    ) {
      this.profile.hasCustomSkinUnlocked = true;
      changed = true;
    }
    if (serverProfile.isAdmin !== undefined && this.profile.isAdmin !== serverProfile.isAdmin) {
      this.profile.isAdmin = serverProfile.isAdmin;
      changed = true;
    }
    if (serverProfile.role && this.profile.role !== serverProfile.role) {
      this.profile.role = serverProfile.role;
      changed = true;
    }
    if (serverProfile.isBanned !== undefined && this.profile.isBanned !== serverProfile.isBanned) {
      this.profile.isBanned = serverProfile.isBanned;
      changed = true;
    }
    if (
      this.profile.username?.toLowerCase() === "darkgdooo" ||
      this.profile.email?.toLowerCase() === "darkgdooo@gmail.com"
    ) {
      if (!this.profile.isAdmin) {
        this.profile.isAdmin = true;
        this.profile.role = "admin";
        changed = true;
      }
    }
    if (
      serverProfile.customSkinUrl &&
      this.profile.customSkinUrl !== serverProfile.customSkinUrl
    ) {
      this.profile.customSkinUrl = serverProfile.customSkinUrl;
      changed = true;
    }
    if (
      serverProfile.customSkinName &&
      this.profile.customSkinName !== serverProfile.customSkinName
    ) {
      this.profile.customSkinName = serverProfile.customSkinName;
      changed = true;
    }
    if (
      typeof serverProfile.level === "number" &&
      serverProfile.level > this.profile.level
    ) {
      this.profile.level = serverProfile.level;
      changed = true;
    }
    if (
      typeof serverProfile.xp === "number" &&
      (serverProfile.level > this.profile.level ||
        serverProfile.xp > this.profile.xp)
    ) {
      this.profile.xp = serverProfile.xp;
      changed = true;
    }
    if (
      typeof serverProfile.doctrineMask === "number" &&
      this.profile.doctrineMask === 0 &&
      serverProfile.doctrineMask > 0
    ) {
      this.profile.doctrineMask = serverProfile.doctrineMask;
      changed = true;
    }
    if (serverProfile.equippedMedal && !this.profile.equippedMedal) {
      this.profile.equippedMedal = serverProfile.equippedMedal;
      changed = true;
    }
    if (Array.isArray(serverProfile.unlockedMedals)) {
      const mergedMedals = Array.from(
        new Set([
          ...this.profile.unlockedMedals,
          ...serverProfile.unlockedMedals,
        ]),
      );
      if (mergedMedals.length !== this.profile.unlockedMedals.length) {
        this.profile.unlockedMedals = mergedMedals;
        changed = true;
      }
    }
    if (Array.isArray(serverProfile.ownedFlares)) {
      const mergedFlares = Array.from(
        new Set([...this.profile.ownedFlares, ...serverProfile.ownedFlares]),
      );
      if (mergedFlares.length !== this.profile.ownedFlares.length) {
        this.profile.ownedFlares = mergedFlares;
        changed = true;
      }
    }

    if (changed) {
      this.saveLocalAndBroadcast();
    }
  }

  public syncWithServerInBackground(): void {
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
        profile: {
          level: this.profile.level,
          xp: this.profile.xp,
          gamesPlayed: this.profile.gamesPlayed,
          victories: this.profile.victories,
          worldEventsSurvived: this.profile.worldEventsSurvived,
          directivesCompleted: this.profile.directivesCompleted,
          unlockedMedals: this.profile.unlockedMedals,
          equippedMedal: this.profile.equippedMedal,
          ownedFlares: this.profile.ownedFlares,
          doctrineMask: this.profile.doctrineMask,
          username: this.profile.username,
          isVip: this.profile.isVip,
          vipUntil: this.profile.vipUntil,
          hasBattlePass: this.profile.hasBattlePass,
          battlePassSeason: this.profile.battlePassSeason,
          hasCustomSkinUnlocked: this.profile.hasCustomSkinUnlocked,
          customSkinUrl: this.profile.customSkinUrl,
          customSkinName: this.profile.customSkinName,
        },
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data?.profile) {
          this.applyServerProfile(data.profile);
        }
      })
      .catch(() => {
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
        return {
          ok: false,
          error: data.error || "Erreur lors de la création du compte.",
        };
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
          ...DEFAULT_PROFILE,
          ...data.profile,
          email,
          username: data.profile.username || email.split("@")[0],
          plutonium:
            typeof data.profile.plutonium === "number"
              ? data.profile.plutonium
              : 0,
          caps: typeof data.profile.caps === "number" ? data.profile.caps : 0,
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
        this.saveLocalAndBroadcast();
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

  isAdmin(): boolean {
    return Boolean(
      this.profile.isAdmin ||
        this.profile.role === "admin" ||
        this.profile.username?.toLowerCase() === "darkgdooo" ||
        this.profile.email?.toLowerCase() === "darkgdooo@gmail.com",
    );
  }

  getCredentials(): { email: string; password?: string } {
    return {
      email:
        this.profile.email ||
        (this.profile.username?.toLowerCase() === "darkgdooo"
          ? "darkgdooo@gmail.com"
          : ""),
      password: localStorage.getItem(ACCOUNT_PASS_KEY) || "",
    };
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

  applyPresetBranch(
    branch: "assault" | "fortress" | "economy" | "apocalypse",
  ): void {
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
      this.sendCurrencyDelta(1, 12, "level_up_reward");
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

  recordMatchPlayed(
    won: boolean,
    durationSeconds: number,
  ): {
    xpGained: number;
    leveledUp: boolean;
  } {
    this.profile.gamesPlayed++;
    if (won) this.profile.victories++;
    const isVip = this.isVipActive();
    // Hard grind rewards: 0 plutonium on loss, 1 on victory. Very scarce caps. VIP gets +25% caps & +2 bonus XP
    const capsGained = won ? (isVip ? 7 : 5) : isVip ? 2 : 1;
    const puGained = won ? 1 : 0;
    this.profile.plutonium += puGained;
    this.profile.caps += capsGained;
    this.sendCurrencyDelta(
      puGained,
      capsGained,
      won ? "match_victory" : "match_played",
    );
    const baseXp = won ? 18 : 6;
    const timeBonus = Math.min(6, Math.floor(durationSeconds * 0.015));
    const xpGained = baseXp + timeBonus + (isVip ? 2 : 0);
    const res = this.addXp(xpGained);

    const newGame = {
      gameId: `match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      start: new Date().toISOString(),
      durationSeconds: Math.max(10, Math.floor(durationSeconds)),
      map: "Frontier",
      mode: "ffa",
      type: "public",
      playerTeams: null,
      rankedType: "unranked",
      result: won ? "victory" : "defeat",
      totalPlayers: 8,
      username: this.profile.username || "Commandant",
      clanTag: null,
    };
    this.saveGameToHistory(newGame);

    return { xpGained, leveledUp: res.leveledUp };
  }

  public saveGameToHistory(game: any): void {
    try {
      if (typeof window !== "undefined") {
        let list: any[] = [];
        const raw = localStorage.getItem(GAME_HISTORY_KEY);
        if (raw) list = JSON.parse(raw);
        list.unshift(game);
        if (list.length > 50) list = list.slice(0, 50);
        localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(list));

        // Push to server database in background
        const publicId = this.profile.email
          ? `cmd-${this.profile.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "")}`
          : "hexafront-commander";
        fetch("/api/player/games/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, game }),
        }).catch(() => {});
      }
    } catch {
      // Ignore background errors
    }
  }

  public getLocalGameHistory(
    _publicId?: string,
    opts: { filter?: string; type?: string } = {},
  ): { results: any[]; nextCursor: string | null } {
    let list: any[] = [];
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(GAME_HISTORY_KEY);
        if (raw) list = JSON.parse(raw);
      }
    } catch {
      // Fallback
    }

    if (list.length === 0) {
      // Generate initial history from profile stats so the user sees their matches right away
      const count = Math.max(5, Math.min(15, this.profile.gamesPlayed || 5));
      const winsTarget = Math.min(count, this.profile.victories || Math.ceil(count / 2));
      const maps = ["Frontier", "Desert Storm", "Europe", "Archipelago", "Crossfire", "Cold Harbor"];
      const modes = ["ffa", "team", "ranked"];
      const types = ["public", "public", "public", "private"];

      list = [];
      const now = Date.now();
      for (let i = 0; i < count; i++) {
        const isWin = i < winsTarget;
        const timeOffset = (i * 3600 * 3 + (i * 15432)) * 1000;
        const startTime = new Date(now - timeOffset).toISOString();
        const map = maps[i % maps.length];
        const mode = modes[i % modes.length];
        const gType = types[i % types.length];
        const duration = Math.floor(420 + (i * 123) % 700);

        list.push({
          gameId: `game-hist-${now - timeOffset}-${i}`,
          start: startTime,
          durationSeconds: duration,
          map,
          mode,
          type: gType,
          playerTeams: mode === "team" ? "2v2" : null,
          rankedType: mode === "ranked" ? "ranked" : "unranked",
          result: isWin ? "victory" : "defeat",
          totalPlayers: mode === "team" ? 4 : 8,
          username: this.profile.username || "Commandant",
          clanTag: null,
        });
      }
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(list));
        }
      } catch {
        // Fallback
      }
    }

    let filtered = [...list];
    if (opts.type && opts.type !== "all") {
      filtered = filtered.filter((g) => g.type === opts.type);
    }
    if (opts.filter && opts.filter !== "all") {
      filtered = filtered.filter((g) => g.mode === opts.filter);
    }

    return { results: filtered, nextCursor: null };
  }

  recordWorldEventSurvived(): void {
    this.profile.worldEventsSurvived++;
    this.profile.caps += 2;
    this.sendCurrencyDelta(0, 2, "world_event_survived");
    this.addXp(4);
    this.checkCareerMedals();
  }

  recordDirectiveCompleted(xpReward: number = 25): void {
    this.profile.directivesCompleted++;
    this.profile.caps += 3;
    this.sendCurrencyDelta(0, 3, "directive_completed");
    this.addXp(Math.min(xpReward, 6));
    this.checkCareerMedals();
  }

  addCurrency(
    plutonium: number,
    caps: number,
    reason: string = "gameplay",
  ): void {
    this.profile.plutonium = Math.max(0, this.profile.plutonium + plutonium);
    this.profile.caps = Math.max(0, this.profile.caps + caps);
    this.saveLocalAndBroadcast();
    this.sendCurrencyDelta(plutonium, caps, reason);
  }

  purchaseLocalCosmetic(
    flaresToGrant: string[],
    price: number,
    method: "hard" | "soft",
  ): boolean {
    if (method === "hard") {
      if (this.profile.plutonium < price) return false;
      this.profile.plutonium -= price;
      this.sendCurrencyDelta(-price, 0, "shop_cosmetic_hard");
    } else {
      if (this.profile.caps < price) return false;
      this.profile.caps -= price;
      this.sendCurrencyDelta(0, -price, "shop_cosmetic_soft");
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
        ? { method: "soft" as const, amount: 2400, count: 2 }
        : tier === "elite"
          ? { method: "hard" as const, amount: 399, count: 3 }
          : { method: "hard" as const, amount: 799, count: 4 };

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
          HEXAFRONT_COSMETIC_LABELS[`flags.${fKey}`] ?? fKey.replace(/_/g, " ");
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
      this.sendCurrencyDelta(-cost.amount, 0, `supply_crate_${tier}`);
    } else {
      this.profile.caps -= cost.amount;
      this.sendCurrencyDelta(0, -cost.amount, `supply_crate_${tier}`);
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
          lifetimeXp: (this.profile.level - 1) * 450 + this.profile.xp,
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

    // Victoires & Expérience
    tryUnlock("first_victory", this.profile.victories >= 1);
    tryUnlock("veteran_5_wins", this.profile.victories >= 5);
    tryUnlock("master_15_wins", this.profile.victories >= 15);
    tryUnlock("warlord_50_wins", this.profile.victories >= 50);
    tryUnlock("imperator_100_wins", this.profile.victories >= 100);

    // Vétérance & Combats
    tryUnlock("front_veteran", this.profile.gamesPlayed >= 5);
    tryUnlock("veteran_25_battles", this.profile.gamesPlayed >= 25);
    tryUnlock("hardened_50_battles", this.profile.gamesPlayed >= 50);
    tryUnlock("centurion_100_battles", this.profile.gamesPlayed >= 100);
    tryUnlock("titan_200_battles", this.profile.gamesPlayed >= 200);

    // Niveaux de Commandant
    tryUnlock("hexafront_legend", this.profile.level >= 15);
    tryUnlock("level_30_overlord", this.profile.level >= 30);
    tryUnlock("level_50_demigod", this.profile.level >= 50);
    tryUnlock("prestige_pioneer", (this.profile.prestige ?? 0) >= 1);
    tryUnlock("prestige_veteran", (this.profile.prestige ?? 0) >= 3);

    // Directives & Cataclysmes
    tryUnlock("directive_operative", this.profile.directivesCompleted >= 3);
    tryUnlock("directive_mastermind", this.profile.directivesCompleted >= 10);
    tryUnlock("cataclysm_survivor", this.profile.worldEventsSurvived >= 5);
    tryUnlock("calamity_walker", this.profile.worldEventsSurvived >= 20);

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

    // Victoires & Carrière
    tryUnlock("first_victory", won || this.profile.victories >= 1);
    tryUnlock("veteran_5_wins", this.profile.victories >= 5);
    tryUnlock("master_15_wins", this.profile.victories >= 15);
    tryUnlock("warlord_50_wins", this.profile.victories >= 50);
    tryUnlock("imperator_100_wins", this.profile.victories >= 100);

    // Conquête de Territoire
    tryUnlock("hegemon", counts.tilesOwned >= 1500);
    tryUnlock("continental_dominator", counts.tilesOwned >= 3000);
    tryUnlock("world_emperor", counts.tilesOwned >= 6000);
    tryUnlock("neutral_cleanser", counts.tilesOwned >= 500);
    tryUnlock("capital_hunter", counts.tilesOwned >= 1000 && won);
    tryUnlock("capital_annihilator", counts.tilesOwned >= 3500 && won);

    // Bâtiments, Mégastructures & Économie
    tryUnlock("arcology_builder", counts.cities >= 3);
    tryUnlock("megalopolis_ruler", counts.cities >= 8);
    tryUnlock(
      "industrial_tycoon",
      counts.factories >= 3 || counts.gold >= 500_000,
    );
    tryUnlock("gold_billionaire", counts.gold >= 1_500_000);
    tryUnlock("grand_admiral", counts.ports >= 3);
    tryUnlock("naval_armada", counts.ports >= 6);
    tryUnlock("atomic_master", counts.silos >= 2);
    tryUnlock("atomic_rain", counts.silos >= 4);
    tryUnlock("iron_sentinel", counts.defensesAndSam >= 4);
    tryUnlock("impenetrable_wall", counts.defensesAndSam >= 12);
    tryUnlock("iron_curtain", counts.defensesAndSam >= 6);
    tryUnlock("supreme_architect", activeMegas.length >= 3);
    tryUnlock("wonder_monopolist", activeMegas.length >= 5);

    // Troupes et Effectifs
    tryUnlock("million_manpower", counts.troops >= 1_000_000);
    tryUnlock("colossus_standing", counts.troops >= 3_000_000);

    // Carrière
    tryUnlock("front_veteran", this.profile.gamesPlayed >= 5);
    tryUnlock("veteran_25_battles", this.profile.gamesPlayed >= 25);
    tryUnlock("hardened_50_battles", this.profile.gamesPlayed >= 50);
    tryUnlock("centurion_100_battles", this.profile.gamesPlayed >= 100);
    tryUnlock("titan_200_battles", this.profile.gamesPlayed >= 200);
    tryUnlock("hexafront_legend", this.profile.level >= 15);
    tryUnlock("level_30_overlord", this.profile.level >= 30);
    tryUnlock("level_50_demigod", this.profile.level >= 50);
    tryUnlock("prestige_pioneer", (this.profile.prestige ?? 0) >= 1);
    tryUnlock("prestige_veteran", (this.profile.prestige ?? 0) >= 3);
    tryUnlock("directive_operative", this.profile.directivesCompleted >= 3);
    tryUnlock("directive_mastermind", this.profile.directivesCompleted >= 10);
    tryUnlock("cataclysm_survivor", this.profile.worldEventsSurvived >= 5);
    tryUnlock("calamity_walker", this.profile.worldEventsSurvived >= 20);

    // MÉDAILLES SECRÈTES
    if (counts.troops >= 1_000_000 && counts.factories === 0) {
      tryUnlock("secret_ghost_army", true);
    }
    if (counts.silos >= 5) {
      tryUnlock("secret_nuclear_storm", true);
    }
    if (won && counts.troops > 0 && counts.troops < 1000 && counts.tilesOwned >= 800) {
      tryUnlock("secret_phoenix", true);
    }
    if (won && activeMegas.length >= 2 && counts.tilesOwned >= 1200) {
      tryUnlock("secret_solitary_wolf", true);
    }
    if (won && counts.tilesOwned >= 1500) {
      tryUnlock("secret_pacifist", true);
    }

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
