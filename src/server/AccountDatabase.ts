import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StoredServerAccount {
  email: string;
  passwordHash: string;
  salt: string;
  username: string;
  createdAt: number;
  updatedAt: number;
  profile: any;
}

const DB_FILE = path.join(process.cwd(), "data", "accounts.json");

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

class AccountDatabase {
  private db: Record<string, StoredServerAccount> = {};

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.db = JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to load AccountDatabase:", e);
      this.db = {};
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save AccountDatabase:", e);
    }
  }

  public register(emailRaw: string, passwordRaw: string, usernameRaw?: string): { ok: boolean; error?: string; account?: StoredServerAccount } {
    const email = emailRaw.trim().toLowerCase();
    if (!email || !passwordRaw) {
      return { ok: false, error: "Email et mot de passe requis." };
    }
    if (this.db[email]) {
      return { ok: false, error: "Un compte existe déjà avec cette adresse email." };
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(passwordRaw, salt);
    const username = (usernameRaw?.trim() || email.split("@")[0]).slice(0, 20);

    const account: StoredServerAccount = {
      email,
      passwordHash,
      salt,
      username,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      profile: {
        email,
        username,
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
        ownedFlares: []
      }
    };

    this.db[email] = account;
    this.save();
    return { ok: true, account };
  }

  public login(emailRaw: string, passwordRaw: string): { ok: boolean; error?: string; account?: StoredServerAccount } {
    const email = emailRaw.trim().toLowerCase();
    const account = this.db[email];
    if (!account) {
      // Auto-register if not existing yet to provide seamless cross-device onboarding
      return this.register(email, passwordRaw);
    }
    const hash = hashPassword(passwordRaw, account.salt);
    if (hash !== account.passwordHash) {
      return { ok: false, error: "Mot de passe incorrect." };
    }
    return { ok: true, account };
  }

  public syncProfile(emailRaw: string, passwordRaw: string, profile: any): { ok: boolean; error?: string; profile?: any } {
    const email = emailRaw.trim().toLowerCase();
    const account = this.db[email];
    if (!account) {
      return { ok: false, error: "Compte introuvable." };
    }
    const hash = hashPassword(passwordRaw, account.salt);
    if (hash !== account.passwordHash) {
      return { ok: false, error: "Non autorisé." };
    }

    // Merge logic: ensure level/xp/stats don't regress
    const current = account.profile || {};
    const merged = {
      ...current,
      ...profile,
      level: Math.max(current.level || 0, profile.level || 0),
      xp: Math.max(current.xp || 0, profile.xp || 0),
      gamesPlayed: Math.max(current.gamesPlayed || 0, profile.gamesPlayed || 0),
      victories: Math.max(current.victories || 0, profile.victories || 0),
      worldEventsSurvived: Math.max(current.worldEventsSurvived || 0, profile.worldEventsSurvived || 0),
      directivesCompleted: Math.max(current.directivesCompleted || 0, profile.directivesCompleted || 0),
      plutonium: Math.max(current.plutonium || 0, profile.plutonium || 0),
      caps: Math.max(current.caps || 0, profile.caps || 0),
      unlockedMedals: Array.from(new Set([...(current.unlockedMedals || []), ...(profile.unlockedMedals || [])])),
      ownedFlares: Array.from(new Set([...(current.ownedFlares || []), ...(profile.ownedFlares || [])])),
      doctrineMask: profile.doctrineMask !== undefined ? profile.doctrineMask : current.doctrineMask,
      equippedMedal: profile.equippedMedal !== undefined ? profile.equippedMedal : current.equippedMedal,
      username: profile.username || current.username
    };

    account.profile = merged;
    if (profile.username) {
      account.username = profile.username;
    }
    account.updatedAt = Date.now();
    this.save();

    return { ok: true, profile: merged };
  }
}

export const accountDb = new AccountDatabase();
