import crypto from "crypto";
import fs from "fs";
import path from "path";

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
            description:
              "Clan tactique d'élite de BorderConflict. Stratégie, défense et coordination.",
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
            description:
              "Assaut total, expansion rapide et domination des mégastructures mondiales.",
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
            description:
              "Défense impénétrable de bunkers et missiles nucléaires de représailles.",
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
      fs.writeFileSync(
        CLANS_FILE,
        JSON.stringify(this.clans, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("Failed to save Clans Database:", e);
    }
  }

  public register(
    emailRaw: string,
    passwordRaw: string,
    usernameRaw?: string,
  ): { ok: boolean; error?: string; account?: StoredServerAccount } {
    const email = emailRaw.trim().toLowerCase();
    if (!email || !passwordRaw) {
      return { ok: false, error: "Email et mot de passe requis." };
    }
    if (this.db[email]) {
      return {
        ok: false,
        error: "Un compte existe déjà avec cette adresse email.",
      };
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
        ownedFlares: [],
      },
    };

    this.db[email] = account;
    this.save();
    return { ok: true, account };
  }

  public login(
    emailRaw: string,
    passwordRaw: string,
  ): { ok: boolean; error?: string; account?: StoredServerAccount } {
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

  public getProfile(
    emailRaw: string,
    passwordRaw: string,
  ): { ok: boolean; error?: string; profile?: any } {
    const email = emailRaw.trim().toLowerCase();
    const account = this.db[email];
    if (!account) {
      return { ok: false, error: "Compte introuvable." };
    }
    const hash = hashPassword(passwordRaw, account.salt);
    if (hash !== account.passwordHash) {
      return { ok: false, error: "Mot de passe incorrect." };
    }
    return { ok: true, profile: account.profile };
  }

  public adjustCurrency(
    emailRaw: string,
    passwordRaw: string,
    deltaPlutonium: number,
    deltaCaps: number,
    reason?: string,
  ): { ok: boolean; error?: string; profile?: any } {
    const email = emailRaw.trim().toLowerCase();
    const account = this.db[email];
    if (!account) {
      return { ok: false, error: "Compte introuvable." };
    }
    const hash = hashPassword(passwordRaw, account.salt);
    if (hash !== account.passwordHash) {
      return { ok: false, error: "Non autorisé." };
    }

    account.profile = account.profile || {};
    const curPu =
      typeof account.profile.plutonium === "number"
        ? account.profile.plutonium
        : 0;
    const curCaps =
      typeof account.profile.caps === "number" ? account.profile.caps : 0;

    const newPu = Math.max(0, curPu + (Number(deltaPlutonium) || 0));
    const newCaps = Math.max(0, curCaps + (Number(deltaCaps) || 0));

    account.profile.plutonium = newPu;
    account.profile.caps = newCaps;
    account.updatedAt = Date.now();
    this.save();

    console.log(
      `[AccountDatabase] Currency mutation for ${email}: Pu ${curPu}->${newPu} (${deltaPlutonium}), Caps ${curCaps}->${newCaps} (${deltaCaps}) [${reason || "mutation"}]`,
    );

    return { ok: true, profile: account.profile };
  }

  public syncProfile(
    emailRaw: string,
    passwordRaw: string,
    profile: any,
  ): { ok: boolean; error?: string; profile?: any } {
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

    // Cloud Authoritative Balance Protection:
    // The server is the sole source of truth for plutonium and caps.
    // We only mutate currencies if explicit deltas are passed in the sync payload.
    let updatedPlutonium =
      typeof current.plutonium === "number" ? current.plutonium : 0;
    let updatedCaps = typeof current.caps === "number" ? current.caps : 0;

    if (
      typeof profile?.deltaPlutonium === "number" &&
      profile.deltaPlutonium !== 0
    ) {
      updatedPlutonium = Math.max(0, updatedPlutonium + profile.deltaPlutonium);
    }
    if (typeof profile?.deltaCaps === "number" && profile.deltaCaps !== 0) {
      updatedCaps = Math.max(0, updatedCaps + profile.deltaCaps);
    }

    const merged = {
      ...current,
      ...profile,
      level: Math.max(current.level || 0, profile.level || 0),
      xp: Math.max(current.xp || 0, profile.xp || 0),
      gamesPlayed: Math.max(current.gamesPlayed || 0, profile.gamesPlayed || 0),
      victories: Math.max(current.victories || 0, profile.victories || 0),
      worldEventsSurvived: Math.max(
        current.worldEventsSurvived || 0,
        profile.worldEventsSurvived || 0,
      ),
      directivesCompleted: Math.max(
        current.directivesCompleted || 0,
        profile.directivesCompleted || 0,
      ),
      plutonium: updatedPlutonium,
      caps: updatedCaps,
      unlockedMedals: Array.from(
        new Set([
          ...(current.unlockedMedals || []),
          ...(profile.unlockedMedals || []),
        ]),
      ),
      ownedFlares: Array.from(
        new Set([
          ...(current.ownedFlares || []),
          ...(profile.ownedFlares || []),
        ]),
      ),
      doctrineMask:
        profile.doctrineMask !== undefined
          ? profile.doctrineMask
          : current.doctrineMask,
      equippedMedal:
        profile.equippedMedal !== undefined
          ? profile.equippedMedal
          : current.equippedMedal,
      username: profile.username || current.username,
      isVip: current.isVip || profile.isVip || false,
      vipUntil:
        Math.max(current.vipUntil || 0, profile.vipUntil || 0) || undefined,
      hasBattlePass: current.hasBattlePass || profile.hasBattlePass || false,
      battlePassSeason:
        Math.max(
          current.battlePassSeason || 0,
          profile.battlePassSeason || 0,
        ) || undefined,
      hasCustomSkinUnlocked:
        current.hasCustomSkinUnlocked || profile.hasCustomSkinUnlocked || false,
      customSkinUrl:
        profile.customSkinUrl || current.customSkinUrl || undefined,
      customSkinName:
        profile.customSkinName || current.customSkinName || undefined,
    };

    // Remove temporary deltas from persisted profile object
    delete (merged as any).deltaPlutonium;
    delete (merged as any).deltaCaps;

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

  public creditBundle(
    emailRaw: string,
    bundleId: string,
  ): { ok: boolean; error?: string; granted?: any } {
    const email = emailRaw.trim().toLowerCase();
    const account = this.db[email];
    if (!account) {
      return { ok: false, error: "Compte introuvable." };
    }

    const current = account.profile || {};
    let addPlutonium = 0;
    let addCaps = 0;
    const addFlares: string[] = [];

    if (bundleId === "halloween_necropolis") {
      addPlutonium = 500;
      addCaps = 8000;
      addFlares.push(
        "crown:crown_spectral_horns",
        "pattern:spider_web_necropolis:halloween_purpur",
        "flag:flag_soul_reaper",
        "effect:ectoplasm_wake",
        "effect:necropolis_toxic_detonation",
      );
    } else if (bundleId === "halloween_pumpkin_infernal") {
      addPlutonium = 600;
      addCaps = 10000;
      addFlares.push(
        "crown:crown_pumpkin_king",
        "pattern:cursed_pumpkin_carve:halloween_blaze",
        "flag:flag_jack_lantern",
        "effect:infernal_pumpkin_hull",
        "effect:halloween_soul_trail",
      );
    } else if (bundleId === "bundle_recrue") {
      addPlutonium = 150;
      addCaps = 2000;
      addFlares.push("crown:vanguard_silver");
    } else if (bundleId === "bundle_officier") {
      addPlutonium = 500;
      addCaps = 7000;
      addFlares.push("crown:plasma_pulsar", "boat_trail:electric_plasma");
    } else if (bundleId === "bundle_supreme") {
      addPlutonium = 1100;
      addCaps = 18000;
      addFlares.push("crown:supernova_royale", "nuke_impact:mirv_custom");
    } else if (bundleId === "battle_pass_s1") {
      current.hasBattlePass = true;
      current.battlePassSeason = 1;
      addPlutonium = 300;
      addCaps = 6000;
      addFlares.push(
        "crown:atomic_conqueror",
        "pattern:nuclear_hazard:rad_active",
      );
    } else if (bundleId === "vip_status_30d") {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const currentExpiry =
        current.vipUntil && current.vipUntil > now ? current.vipUntil : now;
      current.vipUntil = currentExpiry + thirtyDaysMs;
      current.isVip = true;
      addPlutonium = 150;
      addCaps = 3000;
    } else if (bundleId === "plutonium_250") {
      addPlutonium = 250;
    } else if (bundleId === "plutonium_600") {
      addPlutonium = 600;
    } else if (bundleId === "plutonium_1350") {
      addPlutonium = 1350;
    } else if (bundleId === "plutonium_1700") {
      addPlutonium = 1700;
    } else if (bundleId === "plutonium_3000") {
      addPlutonium = 3000;
    } else if (bundleId === "plutonium_7500") {
      addPlutonium = 7500;
    } else if (bundleId === "custom_skin_pass") {
      current.hasCustomSkinUnlocked = true;
      addPlutonium = 100;
      addCaps = 2000;
      addFlares.push("skin:*");
    }

    current.plutonium = (current.plutonium || 0) + addPlutonium;
    current.caps = (current.caps || 0) + addCaps;
    current.ownedFlares = Array.from(
      new Set([...(current.ownedFlares || []), ...addFlares]),
    );

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
      const emailPrefix = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_-]/g, "");
      const usernameClean = (account.username || "")
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_-]/g, "");
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

  public getClansBrowse(
    filter: string = "all",
    sort: string = "memberCount",
  ): any {
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
      score: c.members.length * 1500 + parseInt(c.softBalance || "0", 10) / 10,
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

  public getAllClanTags(): string[] {
    return Object.keys(this.clans);
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
    creatorUsername: string,
  ): { ok: boolean; error?: string; clan?: StoredServerClan } {
    const tag = tagRaw
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const name = nameRaw.trim();
    const description = descriptionRaw.trim();

    if (tag.length < 2 || tag.length > 5) {
      return {
        ok: false,
        error:
          "Le Tag du Clan doit contenir entre 2 et 5 caractères alphanumériques.",
      };
    }
    if (name.length < 3 || name.length > 35) {
      return {
        ok: false,
        error: "Le nom du Clan doit contenir entre 3 et 35 caractères.",
      };
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
    username: string,
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

  public getConquestMap(): any {
    const getClanInfo = (
      tag: string,
      defaultName: string,
      defaultColor: string,
    ) => {
      const clan = this.clans[tag];
      if (clan) {
        return {
          tag: clan.tag,
          name: clan.name,
          color:
            tag === "FOX" ? "#38bdf8" : tag === "APEX" ? "#f59e0b" : "#a855f7",
          membersCount: clan.members.length,
          leader:
            clan.members.find((m) => m.role === "leader")?.username ||
            "Commandant",
        };
      }
      return {
        tag,
        name: defaultName,
        color: defaultColor,
        membersCount: 1,
        leader: "Commandant",
      };
    };

    const c1 = getClanInfo("FOX", "Fox Vanguard", "#38bdf8");
    const c2 = getClanInfo("APEX", "Apex Predators", "#f59e0b");
    const c3 = getClanInfo("IRON", "Iron Fortress", "#a855f7");

    const sectors = [
      {
        id: "eu_west",
        name: "Secteur Europe Occidentale",
        code: "EUR-01",
        coords: { x: 50, y: 31 },
        controllingClan: c1,
        influence: 78,
        contestedWith: c2.tag,
        status: "secure",
        statusLabel: "Sécurisé",
        perk: "+15% Caps en fin de partie",
        dailyReward: "250 Caps / 24h",
        defenseLevel: 4,
        garrison: "14 200 Troupes Tactiques",
        lastEvent: `Victoire écrasante de [${c1.tag}] face aux assauts de [${c2.tag}]`,
        description:
          "Centre névralgique de commandement européen. Contrôle les carrefours de télécommunications et les usines de blindés.",
      },
      {
        id: "na_east",
        name: "Secteur Silos Nord-Américains",
        code: "USA-02",
        coords: { x: 23, y: 34 },
        controllingClan: c2,
        influence: 85,
        contestedWith: c3.tag,
        status: "fortified",
        statusLabel: "Forteresse Silo",
        perk: "+2 XP par victoire tactique",
        dailyReward: "15 Plutonium / 24h",
        defenseLevel: 5,
        garrison: "19 500 Troupes de Choc",
        lastEvent: `Infiltration repoussée par la garnison d'élite de [${c2.tag}]`,
        description:
          "Complexe de lancement balistique et usines lourdes. Assure l'enrichissement en isotopes et la supériorité technologique.",
      },
      {
        id: "asia_east",
        name: "Secteur Eurasie & Forteresses Est",
        code: "RUS-03",
        coords: { x: 74, y: 26 },
        controllingClan: c3,
        influence: 72,
        contestedWith: c1.tag,
        status: "fortified",
        statusLabel: "Blindage Lourd",
        perk: "+20% Portée radar & vision",
        dailyReward: "300 Caps / 24h",
        defenseLevel: 4,
        garrison: "16 800 Troupes Blindées",
        lastEvent: `Barrage d'artillerie lourde soutenu par [${c3.tag}]`,
        description:
          "Bunkers souterrains fortifiés à l'épreuve des frappes orbitales. Déploie des systèmes radar avancés sur tout le continent.",
      },
      {
        id: "mea_south",
        name: "Secteur Gisements & Désert Sud",
        code: "MEA-04",
        coords: { x: 56, y: 54 },
        controllingClan: c1,
        influence: 64,
        contestedWith: c3.tag,
        status: "contested",
        statusLabel: "Zone Contestée",
        perk: "+10% Revenu d'or par seconde",
        dailyReward: "200 Caps / 24h",
        defenseLevel: 3,
        garrison: "9 400 Combattants",
        lastEvent: `Offensive majeure lancée par [${c3.tag}] pour contester le puits pétrolier`,
        description:
          "Bassin de réserves stratégiques et oléoducs clés. Les revenus d'or générés ici permettent des réapprovisionnements militaires continus.",
      },
      {
        id: "pac_oceania",
        name: "Secteur Archipels & Bases Pacifique",
        code: "PAC-05",
        coords: { x: 84, y: 68 },
        controllingClan: c2,
        influence: 91,
        contestedWith: c1.tag,
        status: "secure",
        statusLabel: "Domination Totale",
        perk: "+15% Vitesse navale & débarquements",
        dailyReward: "20 Plutonium / 24h",
        defenseLevel: 5,
        garrison: "23 000 Forces Maritimes",
        lastEvent: `Flotte de débarquement déployée avec succès par [${c2.tag}]`,
        description:
          "Réseau insulaire ultra-sécurisé garantissant la mobilité rapide et des attaques côtières foudroyantes sur toutes les côtes.",
      },
      {
        id: "sa_south",
        name: "Secteur Silos Amazonie & Andes",
        code: "SAM-06",
        coords: { x: 31, y: 66 },
        controllingClan: c3,
        influence: 59,
        contestedWith: c2.tag,
        status: "contested",
        statusLabel: "Zone Contestée",
        perk: "+10% Régénération d'infanterie",
        dailyReward: "180 Caps / 24h",
        defenseLevel: 3,
        garrison: "8 200 Gardes Frontières",
        lastEvent: `Ermitage tactique : embuscade menée par [${c3.tag}]`,
        description:
          "Relais satellitaires dissimulés dans les massifs montagneux et laboratoires de bio-stimulation accélérant les renforts.",
      },
    ];

    const dominationMap: Record<
      string,
      { tag: string; name: string; color: string; count: number }
    > = {};
    sectors.forEach((s) => {
      const tag = s.controllingClan.tag;
      if (!dominationMap[tag]) {
        dominationMap[tag] = {
          tag,
          name: s.controllingClan.name,
          color: s.controllingClan.color,
          count: 0,
        };
      }
      dominationMap[tag].count++;
    });

    const recentActivity = [
      {
        id: 1,
        time: "Il y a 4 min",
        clanTag: c1.tag,
        type: "defense",
        text: `[${c1.tag}] a consolidé la défense de ${sectors[0].name} (+450 Influence)`,
      },
      {
        id: 2,
        time: "Il y a 12 min",
        clanTag: c2.tag,
        type: "conquest",
        text: `[${c2.tag}] a écrasé une rébellion dans ${sectors[4].name} (Domination 91%)`,
      },
      {
        id: 3,
        time: "Il y a 28 min",
        clanTag: c3.tag,
        type: "assault",
        text: `[${c3.tag}] a lancé un raid éclair sur ${sectors[3].name}`,
      },
      {
        id: 4,
        time: "Il y a 45 min",
        clanTag: c2.tag,
        type: "reward",
        text: `Récompense de secteur débloquée : +15 Plutonium crédités pour [${c2.tag}]`,
      },
    ];

    return {
      season: "Saison 1 : Tempête Nucléaire",
      cycleEndsIn: "13 jours, 18 heures",
      sectors,
      dominationSummary: Object.values(dominationMap).sort(
        (a, b) => b.count - a.count,
      ),
      recentActivity,
    };
  }

  public saveCustomSkin(
    emailRaw: string,
    imageBase64: string,
    publicId: string,
  ): { ok: boolean; error?: string; skinUrl?: string } {
    const email = emailRaw ? emailRaw.trim().toLowerCase() : "";
    let account = email ? this.db[email] : null;

    if (!account) {
      for (const acc of Object.values(this.db)) {
        if (`cmd-${acc.username}` === publicId || acc.username === publicId) {
          account = acc;
          break;
        }
      }
    }

    const current = account?.profile || {};
    const isVip =
      current.isVip && current.vipUntil && current.vipUntil > Date.now();
    const hasUnlocked = current.hasCustomSkinUnlocked || isVip;

    if (account && !hasUnlocked) {
      if ((current.plutonium || 0) >= 750) {
        current.plutonium -= 750;
        current.hasCustomSkinUnlocked = true;
      } else {
        return {
          ok: false,
          error:
            "Débloquez la Forge de Skin (3,99 € ou 750 Plutonium, ou devenez VIP) pour sauvegarder votre skin.",
        };
      }
    }

    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const customSkinsDir = path.join(
        process.cwd(),
        "static",
        "skins",
        "custom",
      );
      if (!fs.existsSync(customSkinsDir)) {
        fs.mkdirSync(customSkinsDir, { recursive: true });
      }

      const safeId = (publicId || account?.username || "commander").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      const filename = `skin_${safeId}.png`;
      const filePath = path.join(customSkinsDir, filename);
      fs.writeFileSync(filePath, buffer);

      const skinUrl = `/static/skins/custom/${filename}`;
      if (account) {
        current.customSkinUrl = skinUrl;
        current.customSkinName = `custom_${safeId}`;
        current.hasCustomSkinUnlocked = true;
        current.ownedFlares = Array.from(
          new Set([
            ...(current.ownedFlares || []),
            "skin:*",
            `skin:${current.customSkinName}`,
          ]),
        );
        account.profile = current;
        account.updatedAt = Date.now();
        this.save();
      }

      return { ok: true, skinUrl };
    } catch (e: any) {
      console.error("saveCustomSkin error:", e);
      return { ok: false, error: "Erreur lors de la sauvegarde de l'image." };
    }
  }
}

export const accountDb = new AccountDatabase();
