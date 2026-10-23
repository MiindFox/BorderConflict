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

export interface StoredServerClan {
  tag: string;
  name: string;
  description: string;
  isOpen: boolean;
  createdAt: string;
  createdBy: string;
  members: {
    publicId: string;
    username: string;
    role: "leader" | "officer" | "member";
    joinedAt: string;
  }[];
  discordUrl?: string | null;
  softBalance: string;
  hardBalance: string;
}

const DB_FILE = path.join(process.cwd(), "data", "accounts.json");
const CLANS_FILE = path.join(process.cwd(), "data", "clans.json");

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

class AccountDatabase {
  private db: Record<string, StoredServerAccount> = {};
  private clans: Record<string, StoredServerClan> = {};

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
      if (fs.existsSync(CLANS_FILE)) {
        const rawClans = fs.readFileSync(CLANS_FILE, "utf-8");
        this.clans = JSON.parse(rawClans);
      } else {
        // Seed default starter clans so the browse list & leaderboard have real clans immediately
        this.clans = {
          FOX: {
            tag: "FOX",
            name: "Fox Vanguard",
            description: "Clan tactique d'élite de BorderConflict. Stratégie, défense et coordination.",
            isOpen: true,
            createdAt: new Date().toISOString(),
            createdBy: "CommanderAlpha",
            members: [
              {
                publicId: "cmd-alpha",
                username: "CommanderAlpha",
                role: "leader",
                joinedAt: new Date().toISOString(),
              },
            ],
            softBalance: "50000",
            hardBalance: "2500",
          },
          APEX: {
            tag: "APEX",
            name: "Apex Predators",
            description: "Assaut total, expansion rapide et domination des mégastructures mondiales.",
            isOpen: true,
            createdAt: new Date().toISOString(),
            createdBy: "ApexGeneral",
            members: [
              {
                publicId: "cmd-apex",
                username: "ApexGeneral",
                role: "leader",
                joinedAt: new Date().toISOString(),
              },
            ],
            softBalance: "38000",
            hardBalance: "1800",
          },
          IRON: {
            tag: "IRON",
            name: "Iron Fortress",
            description: "Défense impénétrable de bunkers et missiles nucléaires de représailles.",
            isOpen: false,
            createdAt: new Date().toISOString(),
            createdBy: "IronWarden",
            members: [
              {
                publicId: "cmd-iron",
                username: "IronWarden",
                role: "leader",
                joinedAt: new Date().toISOString(),
              },
            ],
            softBalance: "42000",
            hardBalance: "1200",
          },
        };
        this.saveClans();
      }
    } catch (e) {
      console.error("Failed to load AccountDatabase:", e);
      this.db = {};
      this.clans = {};
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

  private saveClans(): void {
    try {
      const dir = path.dirname(CLANS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CLANS_FILE, JSON.stringify(this.clans, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save Clans Database:", e);
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

  public getAccountByEmail(emailRaw: string): StoredServerAccount | null {
    const email = emailRaw.trim().toLowerCase();
    return this.db[email] || null;
  }

  public creditBundle(emailRaw: string, bundleId: string): { ok: boolean; error?: string; granted?: any } {
    const email = emailRaw.trim().toLowerCase();
    const account = this.db[email];
    if (!account) {
      return { ok: false, error: "Compte introuvable." };
    }

    const current = account.profile || {};
    let addPlutonium = 0;
    let addCaps = 0;
    const addFlares: string[] = [];

    if (bundleId === "bundle_recrue") {
      addPlutonium = 120;
      addCaps = 1500;
      addFlares.push("crown:vanguard_silver");
    } else if (bundleId === "bundle_officier") {
      addPlutonium = 450;
      addCaps = 6000;
      addFlares.push("crown:plasma_pulsar", "boat_trail:electric_plasma");
    } else if (bundleId === "bundle_supreme") {
      addPlutonium = 950;
      addCaps = 15000;
      addFlares.push("crown:supernova_royale", "nuke_impact:mirv_custom");
    }

    current.plutonium = (current.plutonium || 0) + addPlutonium;
    current.caps = (current.caps || 0) + addCaps;
    current.ownedFlares = Array.from(new Set([...(current.ownedFlares || []), ...addFlares]));

    account.profile = current;
    account.updatedAt = Date.now();
    this.save();

    return {
      ok: true,
      granted: {
        plutonium: addPlutonium,
        caps: addCaps,
        flares: addFlares,
        newBalance: {
          plutonium: current.plutonium,
          caps: current.caps,
        },
      },
    };
  }

  public getPublicProfile(publicId: string): any | null {
    const cleanId = publicId.toLowerCase().replace(/^cmd-/, "");
    for (const [email, account] of Object.entries(this.db)) {
      const emailPrefix = email.split("@")[0].toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "");
      const usernameClean = (account.username || "").toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "");
      if (
        cleanId === emailPrefix ||
        cleanId === usernameClean ||
        publicId === `cmd-${emailPrefix}`
      ) {
        const p = account.profile || {};
        return {
          publicId: `cmd-${emailPrefix}`,
          username: account.username || email.split("@")[0],
          clans: this.getPlayerClans(`cmd-${emailPrefix}`),
          displayClanTag: null,
          stats: {
            gamesPlayed: p.gamesPlayed || 0,
            victories: p.victories || 0,
            winRate: p.gamesPlayed ? (p.victories || 0) / p.gamesPlayed : 0,
            worldEventsSurvived: p.worldEventsSurvived || 0,
            directivesCompleted: p.directivesCompleted || 0,
            level: p.level || 0,
            xp: p.xp || 0,
          },
        };
      }
    }
    return null;
  }

  public getRankedLeaderboard(): any {
    const allAccounts = Object.values(this.db).map((acc) => {
      const p = acc.profile || {};
      const wins = p.victories || 0;
      const games = p.gamesPlayed || 0;
      const losses = Math.max(0, games - wins);
      const elo = 1000 + wins * 25 - losses * 10;
      return {
        public_id: `cmd-${acc.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "")}`,
        accountUsername: acc.username || acc.email.split("@")[0],
        wins,
        losses,
        total: games,
        elo: Math.max(800, elo),
        peakElo: Math.max(800, elo),
        level: p.level || 0,
        prestige: 0,
        legend: (p.level || 0) >= 36,
      };
    });

    allAccounts.sort((a, b) => b.elo - a.elo);
    const ranked1v1 = allAccounts.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

    return {
      "1v1": ranked1v1,
      "2v2": ranked1v1,
      ffa: ranked1v1,
    };
  }

  public getClansBrowse(filter: string = "all", sort: string = "memberCount"): any {
    const list = Object.values(this.clans).map((c) => ({
      name: c.name,
      tag: c.tag,
      description: c.description,
      isOpen: c.isOpen,
      createdAt: c.createdAt,
      memberCount: c.members.length,
      softBalance: c.softBalance,
      hardBalance: c.hardBalance,
      boosted: false,
    }));

    let filtered = list;
    if (filter === "open") {
      filtered = list.filter((c) => c.isOpen);
    } else if (filter === "inviteOnly") {
      filtered = list.filter((c) => !c.isOpen);
    }

    if (sort === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    }

    return {
      results: filtered,
      total: filtered.length,
      page: 1,
      limit: 20,
    };
  }

  public getClanLeaderboard(): any {
    const clans = Object.values(this.clans).map((c, idx) => ({
      tag: c.tag,
      name: c.name,
      score: (c.members.length * 1500) + parseInt(c.softBalance || "0", 10) / 10,
      rank: idx + 1,
      membersCount: c.members.length,
      softBalance: c.softBalance,
    }));
    clans.sort((a, b) => b.score - a.score);
    clans.forEach((c, idx) => (c.rank = idx + 1));
    return {
      start: new Date(Date.now() - 7 * 86400000).toISOString(),
      end: new Date(Date.now() + 7 * 86400000).toISOString(),
      clans,
      total: clans.length,
    };
  }

  public getClan(tag: string): StoredServerClan | null {
    return this.clans[tag.toUpperCase()] || null;
  }

  public getPlayerClans(publicId: string): any[] {
    const res: any[] = [];
    for (const clan of Object.values(this.clans)) {
      const m = clan.members.find((mem) => mem.publicId === publicId);
      if (m) {
        res.push({
          tag: clan.tag,
          name: clan.name,
          role: m.role,
          memberCount: clan.members.length,
        });
      }
    }
    return res;
  }

  public createClan(
    tagRaw: string,
    nameRaw: string,
    descriptionRaw: string,
    isOpen: boolean,
    creatorPublicId: string,
    creatorUsername: string
  ): { ok: boolean; error?: string; clan?: StoredServerClan } {
    const tag = tagRaw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const name = nameRaw.trim();
    const description = descriptionRaw.trim();

    if (tag.length < 2 || tag.length > 5) {
      return { ok: false, error: "Le Tag du Clan doit contenir entre 2 et 5 caractères alphanumériques." };
    }
    if (name.length < 3 || name.length > 35) {
      return { ok: false, error: "Le nom du Clan doit contenir entre 3 et 35 caractères." };
    }
    if (this.clans[tag]) {
      return { ok: false, error: "Un Clan existe déjà avec ce Tag." };
    }

    const clan: StoredServerClan = {
      tag,
      name,
      description,
      isOpen,
      createdAt: new Date().toISOString(),
      createdBy: creatorUsername,
      members: [
        {
          publicId: creatorPublicId,
          username: creatorUsername,
          role: "leader",
          joinedAt: new Date().toISOString(),
        },
      ],
      softBalance: "0",
      hardBalance: "0",
    };

    this.clans[tag] = clan;
    this.saveClans();
    return { ok: true, clan };
  }

  public joinClan(
    tagRaw: string,
    publicId: string,
    username: string
  ): { ok: boolean; error?: string; clan?: StoredServerClan } {
    const tag = tagRaw.toUpperCase();
    const clan = this.clans[tag];
    if (!clan) {
      return { ok: false, error: "Clan introuvable." };
    }
    if (clan.members.some((m) => m.publicId === publicId)) {
      return { ok: true, clan };
    }
    clan.members.push({
      publicId,
      username,
      role: "member",
      joinedAt: new Date().toISOString(),
    });
    this.saveClans();
    return { ok: true, clan };
  }
}

export const accountDb = new AccountDatabase();
