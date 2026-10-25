import { UserMeResponse } from "@openfront/shared/ApiSchemas";
import { GameEnv } from "@openfront/shared/configuration/Env";
import { GameRegistry } from "@openfront/shared/GameRegistry";
import { maps as allMaps, GameMode } from "@openfront/engine-api/game/GameTypes";
import cluster, { Worker } from "cluster";
import crypto from "crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { getHexaFrontCosmeticsCatalog } from "../client/HexaFrontCosmeticsCatalog";
import { verifyClientToken } from "./jwt";
import { purchaseTracker } from "./PurchaseTracker";
import { presenceTracker } from "./PresenceTracker";
import {
  applyCheckinState,
  CHECKIN_INTERVAL_MS,
  checkinBody,
  isRefusal,
  registeredSite,
  sendCheckin,
} from "./ClusterCheckin";
import { getDescriptor } from "./DesktopRelease";
import {
  coordinatorUrl,
  LobbyCoordinatorClient,
} from "./LobbyCoordinatorClient";
import { logger } from "./Logger";
import { MapPlaylist } from "./MapPlaylist";
import { fetchMapWeights, MAP_WEIGHTS_POLL_MS } from "./MapWeights";
import { MasterLobbyService } from "./MasterLobbyService";
import { setNoStoreHeaders } from "./NoStoreHeaders";
import { startPolling } from "./PollingLoop";
import { renderAppShell } from "./RenderHtml";
import { ServerEnv } from "./ServerEnv";
import { applyStaticAssetCacheControl } from "./StaticAssetCache";

const playlist = new MapPlaylist();
let lobbyService: MasterLobbyService;

const app = express();
const server = http.createServer(app);

const log = logger.child({ comp: "m" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Serve the shared app shell for the root document.
app.use(async (req, res, next) => {
  if (req.path === "/") {
    try {
      await renderAppShell(
        res,
        path.join(__dirname, "../../static/index.html"),
      );
    } catch (error) {
      log.error("Error rendering index.html:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    next();
  }
});

// Desktop (Steam) shell release descriptor. See openfront-desktop's
// docs/superpowers/specs/2026-08-20-runtime-asset-updating-design.md.
//
// version.json is polled once a minute by every running desktop client, so it
// is deliberately tiny and separately cacheable; release.json is fetched only
// when that pointer changes. Both must be reachable without a bot challenge --
// see OPE-192.
const staticDir = path.join(__dirname, "../../static");
const descriptorOpts = () => ({
  clientVersion: ServerEnv.gitCommit(),
  cdnBase: ServerEnv.cdnBase(),
  // Production must have a CDN: without one this descriptor would point every
  // Steam client at this app server for ~570MB of assets. Dev and preprod have
  // no CDN, and same-origin is what the web client already does there.
  requireCdnBase: ServerEnv.env() === GameEnv.Prod,
});

app.get("/desktop/version.json", async (_req, res) => {
  try {
    const d = await getDescriptor(staticDir, descriptorOpts());
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    res.json({ clientVersion: d.clientVersion, coreVersion: d.coreVersion });
  } catch (error) {
    log.error("Error building desktop version pointer:", error);
    res.status(500).json({ error: "unavailable" });
  }
});

app.get("/desktop/release.json", async (_req, res) => {
  try {
    const d = await getDescriptor(staticDir, descriptorOpts());
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    res.json(d);
  } catch (error) {
    log.error("Error building desktop release descriptor:", error);
    res.status(500).json({ error: "unavailable" });
  }
});

app.use("/static", express.static(path.join(__dirname, "../../static")));
app.use("/icons", express.static(path.join(__dirname, "../../resources/icons")));

app.get("/manifest.json", (_req, res) => {
  res.type("application/manifest+json");
  res.sendFile(path.join(__dirname, "../../resources/manifest.json"));
});

app.use(
  express.static(path.join(__dirname, "../../static"), {
    maxAge: "1y", // Set max-age to 1 year for all static assets
    setHeaders: (res) => {
      applyStaticAssetCacheControl(
        res.setHeader.bind(res),
        res.req.originalUrl,
      );
    },
  }),
);

app.set("trust proxy", 3);
app.use(
  rateLimit({
    windowMs: 1000, // 1 second
    max: 100, // 100 requests per IP per second (allow fast parallel asset & map fetches)
  }),
);

// Apple Pay domain verification (Stripe's universal association file,
// vendored in resources/public/). Apple fetches this exact path over HTTPS when the
// domain is registered in the Stripe dashboard, and it must get the raw file:
// express.static above ignores dotfile paths (so it falls through to here)
// and the SPA fallback below would answer with the app shell, which makes
// registration fail with no error anywhere we can see. Registered after the
// rate limiter so the file read is covered by it. Verify with
// `curl https://<domain>/.well-known/apple-developer-merchantid-domain-association`.
app.get(
  "/.well-known/apple-developer-merchantid-domain-association",
  (_req, res) => {
    res.type("text/plain");
    res.sendFile(
      path.join(
        __dirname,
        "../../resources/public/.well-known/apple-developer-merchantid-domain-association",
      ),
      // sendFile refuses dotfile path segments (".well-known") by default.
      // maxAge matters beyond browsers: nginx's proxy cache honours the
      // upstream Cache-Control, and sendFile's default max-age=0 would veto
      // the nginx.conf location block that shields this route.
      { dotfiles: "allow", maxAge: "1d" },
      (err) => {
        if (err && !res.headersSent) res.status(404).end();
      },
    );
  },
);

// Android TWA Digital Asset Links (removes URL bar in Android app)
app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.type("application/json");
  res.sendFile(
    path.join(__dirname, "../../assetlinks.json"),
    { dotfiles: "allow", maxAge: "1d" },
    (err) => {
      if (err && !res.headersSent) res.status(404).end();
    },
  );
});

// Direct APK download route for mobile testing
app.get(["/apk", "/download/apk", "/BorderConflict.apk"], (_req, res) => {
  const apkPath = path.join(__dirname, "../../BorderConflict.apk");
  res.download(apkPath, "BorderConflict.apk", (err) => {
    if (err && !res.headersSent) res.status(404).send("APK not found");
  });
});

import Stripe from "stripe";
import { accountDb } from "./AccountDatabase";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20" as any,
    })
  : null;

const BUNDLE_DEFINITIONS: Record<
  string,
  { name: string; description: string; priceCents: number }
> = {
  // Packs Événement Spécial Halloween
  halloween_necropolis: {
    name: "🎃 Pack Nécropole Maudite (Édition Halloween)",
    description:
      "Cornes Démoniaques, Toile Nécromantique, Étendard Faucheuse d'Âmes, Sillage Ectoplasme, Déflagration Toxique + 500 Plutonium & 8 000 Caps offerts !",
    priceCents: 399, // 3.99 EUR
  },
  halloween_pumpkin_infernal: {
    name: "🔥 Pack Citrouille Infernale (Édition Halloween)",
    description:
      "Couronne Roi Citrouille, Lanterne d'Effroi, Blason Samhain, Coque Citrouille Infernale, Traînée d'Âmes + 600 Plutonium & 10 000 Caps offerts !",
    priceCents: 449, // 4.49 EUR
  },

  // 3 Starter Bundles
  bundle_recrue: {
    name: "Kit de Recrue Stratégique",
    description: "150 Plutonium + 2 000 Caps + Couronne Vanguard d'Argent",
    priceCents: 99, // 0.99 EUR
  },
  bundle_officier: {
    name: "Pack Officier de Terrain",
    description:
      "500 Plutonium + 7 000 Caps + Couronne Animée Plasma Pulsar + Sillage Plasma",
    priceCents: 299, // 2.99 EUR
  },
  bundle_supreme: {
    name: "Édition Suprême Commandant",
    description:
      "1 100 Plutonium + 18 000 Caps + Couronne Animée Supernova Royale + Impact MIRV",
    priceCents: 499, // 4.99 EUR
  },

  // Point 1: Pass de Saison (Battle Pass)
  battle_pass_s1: {
    name: "Pass de Saison 1 : Tempête Nucléaire",
    description:
      "Débloque la voie Premium du Pass de Saison : couronnes légendaires, caisses et bonus exclusifs",
    priceCents: 499, // 4.99 EUR
  },

  // Point 2: Statut VIP / Vétéran
  vip_status_30d: {
    name: "Abonnement Statut VIP Commandant (30 Jours)",
    description:
      "Pseudo doré, Badge VIP, +25% de Caps par partie, création de clan débloquée, hébergement prioritaire",
    priceCents: 299, // 2.99 EUR
  },

  // Point 5: Recharges directes de Plutonium
  plutonium_250: {
    name: "Réserve de 250 Plutonium",
    description: "250 Plutonium pour la boutique et les caisses",
    priceCents: 149, // 1.49 EUR
  },
  plutonium_600: {
    name: "Cargaison de 600 Plutonium",
    description: "600 Plutonium pour la boutique et les caisses",
    priceCents: 299, // 2.99 EUR
  },
  plutonium_1350: {
    name: "Stock Tactique de 1 350 Plutonium (1 200 + 150 Offerts)",
    description: "1 350 Plutonium pour la boutique et les caisses",
    priceCents: 499, // 4.99 EUR
  },
  plutonium_1700: {
    name: "Stock Stratégique de 1 700 Plutonium (1 500 + 200 Offerts)",
    description: "1 700 Plutonium pour la boutique et les caisses",
    priceCents: 699, // 6.99 EUR
  },
  plutonium_3000: {
    name: "Réserve Suprême de 3 000 Plutonium (2 500 + 500 Offerts)",
    description: "3 000 Plutonium pour la boutique et les caisses",
    priceCents: 999, // 9.99 EUR
  },
  plutonium_7500: {
    name: "Dépôt d'Arsenal de 7 500 Plutonium (6 000 + 1 500 Offerts)",
    description: "7 500 Plutonium pour la boutique et les caisses",
    priceCents: 2299, // 22.99 EUR
  },

  // Module Forge de Skin de Territoire Personnalisé
  custom_skin_pass: {
    name: "Pass Forge de Skin de Territoire Personnalisé",
    description:
      "Débloque la création, l'importation illimitée d'images et l'équipement de votre propre skin de territoire en jeu",
    priceCents: 399, // 3.99 EUR
  },
};

// Stripe Checkout Session Creation for 3 Bundles
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  if (!stripeClient) {
    return res
      .status(500)
      .json({ error: "Stripe non configuré sur ce serveur." });
  }

  const { bundleId, email } = req.body || {};
  if (!email || !bundleId) {
    return res.status(400).json({ error: "Email et bundleId requis." });
  }

  const item = BUNDLE_DEFINITIONS[bundleId];
  if (!item) {
    return res.status(400).json({ error: "Bundle inconnu." });
  }

  const domain = process.env.DOMAIN || "borderconflict.cloud";
  const protocol = domain.includes("localhost") ? "http" : "https";

  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `BorderConflict : ${item.name}`,
              description: item.description,
            },
            unit_amount: item.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        email,
        bundleId,
      },
      success_url: `${protocol}://${domain}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${protocol}://${domain}/?payment_cancel=true`,
    } as any);

    return res.json({ ok: true, checkoutUrl: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Erreur de création de session Stripe." });
  }
});

// Verify & credit session upon redirect or query
app.post("/api/stripe/verify-session", async (req, res) => {
  if (!stripeClient) {
    return res.status(500).json({ error: "Stripe non configuré." });
  }
  const { sessionId } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId manquant." });
  }

  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      const email = session.metadata?.email;
      const bundleId = session.metadata?.bundleId;
      if (email && bundleId) {
        const creditRes = accountDb.creditBundle(email, bundleId);
        const itemDef = BUNDLE_DEFINITIONS[bundleId];
        purchaseTracker.record({
          type: "stripe",
          email,
          username:
            accountDb.getProfile(email, "")?.profile?.username ||
            email.split("@")[0],
          itemId: bundleId,
          itemName: itemDef ? itemDef.name : bundleId,
          priceEur: itemDef ? itemDef.priceCents / 100 : 0,
          granted: creditRes.granted,
          timestamp: Date.now(),
        });
        return res.json({ ok: true, paid: true, granted: creditRes.granted });
      }
    }
    return res.json({ ok: true, paid: false });
  } catch (err: any) {
    console.error("Stripe Verify Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.use("/api", (_req, res, next) => {
  setNoStoreHeaders(res);
  next();
});

// Proxy new game creation to a random game worker if the request reached Master directly
app.post(["/api/create_game", "/api/adminbot/create_game"], async (req, res) => {
  const workerIndex = Math.floor(Math.random() * ServerEnv.numWorkers());
  const workerPort = ServerEnv.workerPortByIndex(workerIndex);
  try {
    const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    const targetUrl = `http://127.0.0.1:${workerPort}${req.path}${query}`;
    const forwardHeaders: Record<string, string> = {
      "content-type": "application/json",
    };
    if (req.headers.authorization) {
      forwardHeaders.authorization = req.headers.authorization as string;
    }
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    log.error(`Failed to proxy ${req.path} to worker:`, err);
    return res.status(502).json({ error: "Failed to connect to game worker" });
  }
});

// Centralized Account & Progression Endpoints
app.post("/api/account/register", (req, res) => {
  const { email, password, username } = req.body || {};
  const result = accountDb.register(email, password, username);
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, profile: result.account?.profile });
});

app.post("/api/account/login", (req, res) => {
  const { email, password } = req.body || {};
  const result = accountDb.login(email, password);
  if (!result.ok) {
    return res.status(401).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, profile: result.account?.profile });
});

app.all("/api/account/me", (req, res) => {
  const email = (req.body?.email ||
    req.query?.email ||
    req.headers["x-account-email"]) as string;
  const password = (req.body?.password ||
    req.query?.password ||
    req.headers["x-account-pass"]) as string;
  if (!email || !password) {
    return res.status(401).json({ ok: false, error: "Identifiants requis." });
  }
  const result = accountDb.getProfile(email, password);
  if (!result.ok) {
    return res.status(401).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, profile: result.profile });
});

app.post("/api/account/currency", (req, res) => {
  const { email, password, deltaPlutonium, deltaCaps, reason } = req.body || {};
  if (!email || !password) {
    return res.status(401).json({ ok: false, error: "Identifiants requis." });
  }
  const result = accountDb.adjustCurrency(
    email,
    password,
    Number(deltaPlutonium) || 0,
    Number(deltaCaps) || 0,
    reason,
  );
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }

  if (Number(deltaPlutonium) < 0 || Number(deltaCaps) < 0) {
    const isCrate =
      reason?.toLowerCase().includes("crate") ||
      reason?.toLowerCase().includes("coffre");
    const isPack = reason?.toLowerCase().includes("pack");
    purchaseTracker.record({
      type: isCrate ? "crate" : isPack ? "pack" : "crate",
      email,
      username: result.profile?.username || email.split("@")[0],
      itemId: reason || "boutique_purchase",
      itemName: reason || "Achat Boutique",
      pricePlutonium: Math.abs(Number(deltaPlutonium) || 0),
      priceCaps: Math.abs(Number(deltaCaps) || 0),
      timestamp: Date.now(),
    });
  }

  return res.json({
    ok: true,
    profile: result.profile,
    plutonium: result.profile?.plutonium,
    caps: result.profile?.caps,
  });
});

// Broadcast state in memory
let activeGlobalBroadcast: {
  text: string;
  level: "info" | "warning" | "alert";
  author: string;
  expiresAt: number;
} | null = null;

// Public Broadcast query for all game clients
app.get("/api/system/broadcast", (_req, res) => {
  const active =
    activeGlobalBroadcast && activeGlobalBroadcast.expiresAt > Date.now()
      ? activeGlobalBroadcast
      : null;
  return res.json({ ok: true, broadcast: active });
});

// Explicit in-game purchase logging endpoint
app.post("/api/shop/log-purchase", (req, res) => {
  const {
    email,
    type,
    itemId,
    itemName,
    pricePlutonium,
    priceCaps,
    grantedCount,
  } = req.body || {};
  if (email) {
    purchaseTracker.record({
      type: type || "crate",
      email,
      username: email.split("@")[0],
      itemId: itemId || "item",
      itemName: itemName || "Achat Boutique",
      pricePlutonium: Number(pricePlutonium) || 0,
      priceCaps: Number(priceCaps) || 0,
      granted: {
        cosmetics: grantedCount ? new Array(grantedCount).fill("drop") : [],
      },
      timestamp: Date.now(),
    });
  }
  return res.json({ ok: true });
});

// Dedicated Administrator Authentication Guard
function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const email = (req.body?.adminEmail ||
    req.query?.adminEmail ||
    req.headers["x-admin-email"] ||
    req.headers["x-account-email"]) as string;
  const password = (req.body?.adminPassword ||
    req.query?.adminPassword ||
    req.headers["x-admin-pass"] ||
    req.headers["x-account-pass"]) as string;

  if (!email) {
    return res
      .status(401)
      .json({ ok: false, error: "Identifiant administrateur requis." });
  }

  if (!accountDb.isAdmin(email, password)) {
    return res
      .status(403)
      .json({ ok: false, error: "Accès refusé : privilèges administrateur requis." });
  }

  next();
}

// ============================================================================
// Presence heartbeat endpoint for all online commanders
app.post("/api/presence/ping", (req, res) => {
  const { sessionId, username, email, isGuest, state, currentPage } = req.body || {};
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "";
  const userAgent = req.headers["user-agent"] || "";
  const key = sessionId || `${ip}_${username || email || "anon"}`;

  if (presenceTracker.isKicked(key) || (sessionId && presenceTracker.isKicked(sessionId))) {
    return res.json({
      ok: false,
      kicked: true,
      onlineCount: presenceTracker.getOnlineCount(),
      serverTime: Date.now(),
    });
  }

  presenceTracker.recordHeartbeat(key, {
    username,
    email,
    isGuest,
    ip,
    userAgent,
    state,
    currentPage,
  });

  return res.json({
    ok: true,
    onlineCount: presenceTracker.getOnlineCount(),
    guestCount: presenceTracker.getGuestCount(),
    registeredCount: presenceTracker.getRegisteredCount(),
    serverTime: Date.now(),
  });
});

// ADMIN PANEL BACKEND ROUTES
// ============================================================================

app.all("/api/admin/overview", requireAdmin, (_req, res) => {
  const accounts = accountDb.getAllAccounts();
  const stats = purchaseTracker.getStats();
  const activeSessions = presenceTracker.getActiveSessions();
  const guestSessions = presenceTracker.getGuestSessions();
  const registeredSessions = presenceTracker.getRegisteredSessions();
  const onlineCount = activeSessions.length;
  const lobbyPlayers = lobbyService?.getLobbyPlayerCount() ?? 0;
  const liveGames = lobbyService?.liveGames() ?? 0;

  return res.json({
    ok: true,
    overview: {
      totalAccounts: accounts.length,
      bannedCount: accounts.filter((a) => a.isBanned).length,
      vipCount: accounts.filter((a) => a.isVip).length,
      livePlayers: {
        totalOnline: Math.max(onlineCount, lobbyPlayers),
        registeredCount: registeredSessions.length,
        guestsCount: guestSessions.length,
        inMenus: Math.max(0, onlineCount - lobbyPlayers),
        inLobbies: lobbyPlayers,
        liveGames: liveGames,
        sessions: activeSessions.slice(0, 100).map((s) => ({
          sessionId: s.sessionId,
          username: s.username,
          email: s.email,
          ip: s.ip,
          state: s.state,
          isGuest: s.isGuest,
          currentPage: s.currentPage,
          connectedDurationSeconds: Math.floor((Date.now() - s.connectedAt) / 1000),
          lastSeenAgoSeconds: Math.floor((Date.now() - s.lastSeen) / 1000),
        })),
        guestSessions: guestSessions.slice(0, 100).map((s) => ({
          sessionId: s.sessionId,
          username: s.username,
          ip: s.ip,
          userAgent: s.userAgent,
          state: s.state,
          currentPage: s.currentPage,
          connectedDurationSeconds: Math.floor((Date.now() - s.connectedAt) / 1000),
          lastSeenAgoSeconds: Math.floor((Date.now() - s.lastSeen) / 1000),
        })),
      },
      totalRevenueEur: stats.totalRevenueEur,
      totalPlutoniumSpent: stats.totalPlutoniumSpent,
      totalCapsSpent: stats.totalCapsSpent,
      totalTransactions: stats.totalTransactions,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      serverTime: Date.now(),
      activeBroadcast:
        activeGlobalBroadcast && activeGlobalBroadcast.expiresAt > Date.now()
          ? activeGlobalBroadcast
          : null,
    },
  });
});

app.all("/api/admin/guests", requireAdmin, (_req, res) => {
  const guestSessions = presenceTracker.getGuestSessions();
  return res.json({
    ok: true,
    count: guestSessions.length,
    guests: guestSessions.map((s) => ({
      sessionId: s.sessionId,
      username: s.username,
      ip: s.ip,
      userAgent: s.userAgent,
      state: s.state,
      currentPage: s.currentPage,
      connectedAt: s.connectedAt,
      connectedDurationSeconds: Math.floor((Date.now() - s.connectedAt) / 1000),
      lastSeenAgoSeconds: Math.floor((Date.now() - s.lastSeen) / 1000),
    })),
  });
});

app.post("/api/admin/guests/action", requireAdmin, (req, res) => {
  const { action, sessionId } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: "SessionId requis." });
  }
  if (action === "kick") {
    const kicked = presenceTracker.kickSession(sessionId);
    return res.json({ ok: true, message: "Session invité éjectée.", kicked });
  }
  return res.status(400).json({ ok: false, error: "Action inconnue." });
});

app.all("/api/admin/players", requireAdmin, (_req, res) => {
  const rawPlayers = accountDb.getAllAccounts();
  const playersWithStatus = rawPlayers.map((p) => ({
    ...p,
    isOnline:
      presenceTracker.isUserOnline(p.username) ||
      presenceTracker.isUserOnline(p.email),
  }));
  return res.json({ ok: true, players: playersWithStatus });
});

app.post("/api/admin/players/action", requireAdmin, (req, res) => {
  const { action, targetEmail, payload } = req.body || {};
  if (!targetEmail || !action) {
    return res
      .status(400)
      .json({ ok: false, error: "Action et targetEmail requis." });
  }

  let result: { ok: boolean; error?: string } = {
    ok: false,
    error: "Action inconnue.",
  };

  if (action === "ban") {
    result = accountDb.setPlayerBan(targetEmail, true);
  } else if (action === "unban") {
    result = accountDb.setPlayerBan(targetEmail, false);
  } else if (action === "set_vip") {
    result = accountDb.setPlayerVip(
      targetEmail,
      Boolean(payload?.isVip),
      payload?.durationDays || 30,
    );
  } else if (action === "set_role") {
    result = accountDb.setPlayerRole(targetEmail, payload?.role || "player");
  } else if (action === "set_currency") {
    result = accountDb.setPlayerCurrency(
      targetEmail,
      payload?.plutonium,
      payload?.caps,
    );
  } else if (action === "unlock_all") {
    result = accountDb.setPlayerUnlockAll(targetEmail);
  } else if (action === "reset_password") {
    result = accountDb.resetPlayerPassword(targetEmail, payload?.newPassword);
  } else if (action === "update_stats") {
    result = accountDb.updatePlayerStats(targetEmail, payload || {});
  } else if (action === "delete_account") {
    result = accountDb.deleteAccount(targetEmail);
  }

  if (!result.ok) {
    return res.status(400).json(result);
  }
  return res.json({ ok: true, players: accountDb.getAllAccounts() });
});

app.all("/api/admin/purchases", requireAdmin, (_req, res) => {
  return res.json({
    ok: true,
    stats: purchaseTracker.getStats(),
    purchases: purchaseTracker.getPurchases(250),
  });
});

app.all("/api/admin/rotation", requireAdmin, (_req, res) => {
  const allLobbies = lobbyService ? (lobbyService as any).getAllLobbies().games : {};
  return res.json({
    ok: true,
    rotation: playlist.getPlaylistSnapshot(),
    currentLobbies: {
      ffa: allLobbies.ffa?.[0]?.gameConfig?.gameMap || null,
      team: allLobbies.team?.[0]?.gameConfig?.gameMap || null,
      special: allLobbies.special?.[0]?.gameConfig?.gameMap || null,
    },
    allMaps: allMaps.map((m) => ({
      type: m.type,
      category: m.categories ? m.categories.join(", ") : "Standard",
      multiplayerFrequency: m.multiplayerFrequency,
      specialTeamCount: m.specialTeamCount,
    })),
    gameModes: ["FFA", "Team", "Duos", "Trios", "Quads", "HumansVsNations"],
  });
});

app.post("/api/admin/rotation/set-next", requireAdmin, (req, res) => {
  const { slot, mapType, mode } = req.body || {};
  if (!slot || !mapType) {
    return res
      .status(400)
      .json({ ok: false, error: "slot et mapType requis." });
  }
  const typedSlot =
    slot === "ffa" ? "ffa" : slot === "team" ? "team" : "special";
  const typedMode = mode === "Team" ? GameMode.Team : GameMode.FFA;
  
  // 1. Force dans la playlist pour les futures générations
  playlist.forceNextMap(typedSlot, mapType, typedMode);

  // 2. Mettre à jour immédiatement le salon en direct actuellement ouvert aux joueurs !
  let updatedLiveLobby = false;
  if (lobbyService) {
    const allLobbies = (lobbyService as any).getAllLobbies().games;
    const activeLobbies = allLobbies[typedSlot] || [];
    if (activeLobbies.length > 0) {
      const liveLobby = activeLobbies[0];
      lobbyService.updateLobbyConfig(liveLobby.gameID, {
        gameMap: mapType,
        gameMode: typedMode,
      });
      updatedLiveLobby = true;
    }
    lobbyService.broadcastLobbies();
  }

  const allLobbies = lobbyService ? (lobbyService as any).getAllLobbies().games : {};
  return res.json({
    ok: true,
    message: updatedLiveLobby
      ? `🗺️ Carte "${mapType}" appliquée IMMÉDIATEMENT au salon ouvert (${typedSlot.toUpperCase()}) !`
      : `🗺️ Prochaine carte pour ${slot} définie sur "${mapType}".`,
    rotation: playlist.getPlaylistSnapshot(),
    currentLobbies: {
      ffa: allLobbies.ffa?.[0]?.gameConfig?.gameMap || null,
      team: allLobbies.team?.[0]?.gameConfig?.gameMap || null,
      special: allLobbies.special?.[0]?.gameConfig?.gameMap || null,
    },
    updatedLiveLobby,
  });
});

app.post("/api/admin/rotation/set-weights", requireAdmin, (req, res) => {
  const { weights } = req.body || {};
  if (!weights)
    return res.status(400).json({ ok: false, error: "Poids manquants." });
  playlist.setWeightOverrides(weights);
  return res.json({ ok: true, rotation: playlist.getPlaylistSnapshot() });
});

app.post("/api/admin/rotation/spawn-lobby", requireAdmin, async (req, res) => {
  const { type, map, mode, maxPlayers, modifiers } = req.body || {};
  try {
    const gameID = await lobbyService.spawnCustomLobby(type || "special", {
      gameMap: map,
      gameMode: mode === "FFA" ? GameMode.FFA : GameMode.Team,
      maxPlayers: Number(maxPlayers) || 50,
      publicGameModifiers: modifiers || {},
    });
    return res.json({ ok: true, gameID, message: "Salon lancé avec succès !" });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/admin/broadcast", requireAdmin, (req, res) => {
  const { text, level, durationMinutes, adminEmail } = req.body || {};
  if (!text || text.trim() === "") {
    activeGlobalBroadcast = null;
    return res.json({
      ok: true,
      broadcast: null,
      message: "Annonce retirée.",
    });
  }
  activeGlobalBroadcast = {
    text: text.trim(),
    level:
      level === "alert" ? "alert" : level === "warning" ? "warning" : "info",
    author: adminEmail || "Commandement Suprême",
    expiresAt: Date.now() + (Number(durationMinutes) || 60) * 60 * 1000,
  };
  return res.json({ ok: true, broadcast: activeGlobalBroadcast });
});

app.all("/api/admin/backup", requireAdmin, (_req, res) => {
  return res.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    backup: accountDb.getDatabaseBackup(),
    purchases: purchaseTracker.getPurchases(1000),
  });
});

app.post("/api/account/sync", (req, res) => {
  const { email, password, profile } = req.body || {};
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "";
  if (email || profile?.username) {
    presenceTracker.recordHeartbeat(email || profile?.username, {
      username: profile?.username,
      email,
      ip,
      state: "menu",
      currentPage: "sync",
    });
  }
  const result = accountDb.syncProfile(email, password, profile);
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, profile: result.profile });
});

// Legacy Shop Endpoints compatibility
app.post(["/shop/purchase", "/api/shop/purchase"], (_req, res) => {
  return res.json({ ok: true });
});

app.post(["/shop/purchase/pack", "/api/shop/purchase/pack"], (_req, res) => {
  return res.json({ ok: true });
});

// Custom Territory Skin Upload
app.post("/api/custom-skin/upload", (req, res) => {
  const { email, imageBase64, publicId } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ ok: false, error: "Image requise." });
  }
  const result = accountDb.saveCustomSkin(
    email || "",
    imageBase64,
    publicId || "cmd",
  );
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, skinUrl: result.skinUrl });
});

// Tactical Multiplayer Store (Bounties, Pacts)
interface ActiveBountyRecord {
  targetId: string;
  targetName: string;
  amount: number;
  sponsorName: string;
  sponsorId: string;
  placedAt: number;
}

interface ActivePnaRecord {
  p1Id: string;
  p2Id: string;
  p1Name: string;
  p2Name: string;
  expiresAt: number;
}

const gameBounties = new Map<string, Map<string, ActiveBountyRecord>>();
const gamePnas = new Map<string, ActivePnaRecord[]>();

app.post("/api/tactical/bounty", (req, res) => {
  const { gameId, targetId, targetName, amount, sponsorName, sponsorId } =
    req.body || {};
  if (!gameId || !targetId || !amount) {
    return res.status(400).json({ ok: false, error: "Missing parameters" });
  }
  if (!gameBounties.has(gameId)) {
    gameBounties.set(gameId, new Map());
  }
  const map = gameBounties.get(gameId)!;
  const existing = map.get(String(targetId));
  const newAmount = (existing?.amount || 0) + Number(amount);
  map.set(String(targetId), {
    targetId: String(targetId),
    targetName: String(targetName || "Commandant"),
    amount: newAmount,
    sponsorName: String(sponsorName || "Anonyme"),
    sponsorId: String(sponsorId || ""),
    placedAt: Date.now(),
  });
  return res.json({ ok: true, bounty: map.get(String(targetId)) });
});

app.get("/api/tactical/bounties/:gameId", (req, res) => {
  const gameId = req.params.gameId;
  const map = gameBounties.get(gameId);
  const list = map ? Array.from(map.values()) : [];
  return res.json({ ok: true, bounties: list });
});

app.post("/api/tactical/bounty/claim", (req, res) => {
  const { gameId, conqueredId } = req.body || {};
  if (!gameId || !conqueredId) return res.status(400).json({ ok: false });
  const map = gameBounties.get(gameId);
  if (!map) return res.json({ ok: true, claimed: null });
  const bounty = map.get(String(conqueredId));
  if (bounty) {
    map.delete(String(conqueredId));
    return res.json({ ok: true, claimed: bounty });
  }
  return res.json({ ok: true, claimed: null });
});

app.post("/api/tactical/pna", (req, res) => {
  const { gameId, p1Id, p2Id, p1Name, p2Name, durationSec } = req.body || {};
  if (!gameId || !p1Id || !p2Id) return res.status(400).json({ ok: false });
  if (!gamePnas.has(gameId)) gamePnas.set(gameId, []);
  const list = gamePnas.get(gameId)!;
  const sec = Number(durationSec) || 180;
  const filtered = list.filter(
    (p) =>
      !(
        (p.p1Id === p1Id && p.p2Id === p2Id) ||
        (p.p1Id === p2Id && p.p2Id === p1Id)
      ),
  );
  filtered.push({
    p1Id: String(p1Id),
    p2Id: String(p2Id),
    p1Name: String(p1Name || "Joueur"),
    p2Name: String(p2Name || "Joueur"),
    expiresAt: Date.now() + sec * 1000,
  });
  gamePnas.set(gameId, filtered);
  return res.json({ ok: true });
});

app.get("/api/tactical/pna/:gameId", (req, res) => {
  const list = gamePnas.get(req.params.gameId) || [];
  const now = Date.now();
  const active = list.filter((p) => p.expiresAt > now);
  gamePnas.set(req.params.gameId, active);
  return res.json({ ok: true, pnas: active });
});

app.post("/api/tactical/pna/break", (req, res) => {
  const { gameId, p1Id, p2Id } = req.body || {};
  if (!gameId) return res.status(400).json({ ok: false });
  const list = gamePnas.get(gameId) || [];
  const filtered = list.filter(
    (p) =>
      !(
        (p.p1Id === p1Id && p.p2Id === p2Id) ||
        (p.p1Id === p2Id && p.p2Id === p1Id)
      ),
  );
  gamePnas.set(gameId, filtered);
  return res.json({ ok: true });
});

app.get(["/api/public/player/:publicId", "/public/player/:publicId"], (req, res) => {
  const profile = accountDb.getPublicProfile(String(req.params.publicId));
  if (!profile) {
    return res.status(404).json({ error: "Player not found" });
  }
  return res.json(profile);
});

app.get(["/api/public/player/:publicId/games", "/public/player/:publicId/games"], (req, res) => {
  const filter = typeof req.query.filter === "string" ? req.query.filter : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const result = accountDb.getPublicPlayerGames(String(req.params.publicId), filter, type, cursor);
  return res.json(result);
});

app.post(["/api/player/games/record", "/player/games/record"], (req, res) => {
  const { publicId, game } = req.body || {};
  if (!publicId || !game) return res.status(400).json({ error: "Missing publicId or game payload" });
  const result = accountDb.recordPlayerGame(publicId, game);
  return res.json(result);
});

function buildProgressionConfig() {
  const levels = [];
  let cumXp = 0;
  for (let lvl = 1; lvl <= 100; lvl++) {
    const xpToNext = Math.floor(400 + Math.pow(lvl, 1.5) * 80);
    cumXp += xpToNext;
    const caps = lvl <= 10 ? 50 : lvl <= 25 ? 100 : lvl <= 50 ? 200 : lvl <= 75 ? 350 : 500;
    const plutonium = lvl % 25 === 0 ? 25 : lvl % 5 === 0 ? 5 : 0;
    levels.push({
      level: lvl,
      xpToNext,
      cumulativeXp: cumXp,
      caps,
      plutonium,
    });
  }

  return {
    version: 1,
    maxLevel: 100,
    maxPrestige: 10,
    scoresSingleplayer: true,
    requireStatsAgreed: false,
    levels,
    levelRewards: {
      capsBands: [
        { fromLevel: 1, toLevel: 25, caps: 50 },
        { fromLevel: 26, toLevel: 50, caps: 100 },
        { fromLevel: 51, toLevel: 75, caps: 200 },
        { fromLevel: 76, toLevel: 100, caps: 350 },
      ],
      plutonium: {
        fromLevel: 5,
        everyLevels: 5,
        amount: 5,
      },
    },
    prestige: { caps: 1000 },
    flares: [
      { kind: "level", level: 5, prestige: null, flareName: "flag:hexafront_command", cosmetic: { type: "flag", name: "hexafront_command", url: null } },
      { kind: "level", level: 10, prestige: null, flareName: "pattern:cyber_circuit:emerald_matrix", cosmetic: { type: "pattern", name: "cyber_circuit:emerald_matrix", url: null } },
      { kind: "level", level: 15, prestige: null, flareName: "effect:plasma_wake_cyan", cosmetic: { type: "effect", name: "plasma_wake_cyan", url: null } },
      { kind: "level", level: 20, prestige: null, flareName: "crown:iron_circlet", cosmetic: { type: "crown", name: "iron_circlet", url: null } },
      { kind: "level", level: 25, prestige: null, flareName: "pattern:tactical_checker:titanium_ghost", cosmetic: { type: "pattern", name: "tactical_checker:titanium_ghost", url: null } },
      { kind: "level", level: 30, prestige: null, flareName: "pattern:hazard_stripes:solar_flare", cosmetic: { type: "pattern", name: "hazard_stripes:solar_flare", url: null } },
      { kind: "level", level: 35, prestige: null, flareName: "crown:cyber_emperor", cosmetic: { type: "crown", name: "cyber_emperor", url: null } },
      { kind: "level", level: 50, prestige: null, flareName: "effect:neon_hologram_structures", cosmetic: { type: "effect", name: "neon_hologram_structures", url: null } },
      { kind: "level", level: 75, prestige: null, flareName: "pattern:nova_star:golden_sovereign", cosmetic: { type: "pattern", name: "nova_star:golden_sovereign", url: null } },
      { kind: "legend", level: null, prestige: null, flareName: "effect:supreme_sovereign_aura", cosmetic: { type: "effect", name: "supreme_sovereign_aura", url: null } },
    ],
  };
}

app.get(["/cluster.json", "/api/cluster.json"], (req, res) => {
  const commit = ServerEnv.gitCommit();
  const host = (req.headers.host as string) || process.env.DOMAIN || "borderconflict.cloud";
  return res.json({
    latest: commit,
    servers: {
      a: {
        host: host,
        numWorkers: 2,
        version: commit,
        state: "open",
      },
    },
  });
});

app.get(["/api/public/progression/config", "/public/progression/config"], (_req, res) => {
  return res.json(buildProgressionConfig());
});

app.get(["/api/public/player/:publicId/progress", "/public/player/:publicId/progress"], (req, res) => {
  const profile = accountDb.getPublicProfile(String(req.params.publicId));
  const lvl = profile?.stats?.level || 1;
  const xp = profile?.stats?.xp || 0;
  const milestones = [];
  if (lvl >= 10) milestones.push({ level: 10, prestige: 0, at: new Date().toISOString() });
  if (lvl >= 25) milestones.push({ level: 25, prestige: 0, at: new Date().toISOString() });
  if (lvl >= 50) milestones.push({ level: 50, prestige: 0, at: new Date().toISOString() });
  if (lvl >= 75) milestones.push({ level: 75, prestige: 0, at: new Date().toISOString() });
  if (lvl >= 100) milestones.push({ level: 100, prestige: 0, at: new Date().toISOString() });

  return res.json({
    prestige: 0,
    level: lvl,
    xpInLevel: xp,
    xpForNext: Math.floor(400 + Math.pow(lvl, 1.5) * 80),
    lifetimeXp: (lvl - 1) * 450 + xp,
    legend: lvl >= 36,
    prestigeHistory: [],
    milestones,
  });
});

// Centralized Leaderboards
app.get("/api/leaderboard/ranked", (_req, res) => {
  return res.json(accountDb.getRankedLeaderboard());
});

app.get("/api/leaderboard/tribes", (_req, res) => {
  return res.json({ tribes: [] });
});

app.get("/api/public/clans/leaderboard", (_req, res) => {
  return res.json(accountDb.getClanLeaderboard());
});

app.get("/api/clans/conquest-map", (_req, res) => {
  return res.json(accountDb.getConquestMap());
});

app.get("/api/public/clans/conquest-map", (_req, res) => {
  return res.json(accountDb.getConquestMap());
});

// Centralized Clans Endpoints
app.get("/api/clans", (req, res) => {
  const filter =
    typeof req.query.filter === "string" ? req.query.filter : "all";
  const sort =
    typeof req.query.sort === "string" ? req.query.sort : "memberCount";
  return res.json(accountDb.getClansBrowse(filter, sort));
});

app.get("/api/clans/:tag", (req, res) => {
  const clan = accountDb.getClan(req.params.tag);
  if (!clan) return res.status(404).json({ error: "Clan not found" });
  return res.json(clan);
});

app.post("/api/clans/create", (req, res) => {
  const { tag, name, description, isOpen, creatorPublicId, creatorUsername } =
    req.body || {};
  const result = accountDb.createClan(
    tag,
    name,
    description,
    isOpen ?? true,
    creatorPublicId || "cmd-leader",
    creatorUsername || "Leader",
  );
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, clan: result.clan });
});

app.post("/api/clans/:tag/join", (req, res) => {
  const { publicId, username } = req.body || {};
  const result = accountDb.joinClan(
    req.params.tag,
    publicId || "cmd-member",
    username || "Membre",
  );
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, clan: result.clan });
});

// --- STANDALONE BACKEND ADAPTER ROUTES ---
app.get("/cosmetics.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(getHexaFrontCosmeticsCatalog());
});

app.get("/reserved_clan_tags", (_req, res) => {
  res.json(accountDb.getAllClanTags());
});

app.post("/cluster/checkin", (_req, res) => {
  res.json({ state: "open" });
});

app.post("/matchmaking/checkin", (_req, res) => {
  res.json({ assignment: null });
});

app.get("/custom_tribes", (_req, res) => {
  res.json([]);
});

app.get("/api/game_presets", (_req, res) => {
  res.json(GameRegistry.presets.getAll());
});

app.get("/api/game_units", (_req, res) => {
  res.json(GameRegistry.units.getAll());
});

app.get("/map_weights", (_req, res) => {
  res.json({});
});

app.all("/game/:id", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/.well-known/jwks.json", (_req, res) => {
  res.json({
    keys: [
      {
        kty: "OKP",
        crv: "Ed25519",
        alg: "EdDSA",
        x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo",
      },
    ],
  });
});

app.get("/users/@me", async (req, res) => {
  let pid = "commander";
  let username: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring("Bearer ".length);
    try {
      const auth = await verifyClientToken(token);
      if (auth.type === "success") {
        pid = auth.persistentId;
      }
    } catch {}
  }

  const publicProfile = accountDb.getPublicProfile(pid);
  if (publicProfile) {
    username = publicProfile.username;
  }

  const userMeResponse: UserMeResponse = {
    user: {},
    steamLicence: false,
    steamLicenceSince: null,
    noticesSeen: [],
    pendingMessages: [],
    tierConversion: null,
    player: {
      publicId: pid,
      adfree: true,
      canCreatePublicLobbies: true,
      trustTier: "trusted",
      username,
      usernameBase: username,
      usernameDiscriminator: null,
      usernameClaimExpiresAt: null,
      nextUsernameChangeAt: null,
      flares: publicProfile?.ownedFlares ?? [],
      achievements: {
        singleplayerMap: [],
        player: [],
      },
      friends: [],
      clans: accountDb.getPlayerClans(pid),
      clanRequests: [],
      subscription: null,
      levelHidden: false,
      searchHidden: false,
    },
  };

  res.json(userMeResponse);
});

// Start the master process
export async function startMaster() {
  if (!cluster.isPrimary) {
    throw new Error(
      "startMaster() should only be called in the primary process",
    );
  }

  log.info(`Primary ${process.pid} is running`);
  log.info(`Setting up ${ServerEnv.numWorkers()} workers...`);

  const customCosmeticsPath = path.resolve("data/custom_cosmetics.json");
  if (fs.existsSync(customCosmeticsPath)) {
    try {
      const raw = fs.readFileSync(customCosmeticsPath, "utf-8");
      const parsed = JSON.parse(raw);
      GameRegistry.cosmetics.loadFromJson(parsed);
      log.info("Loaded custom cosmetics from data/custom_cosmetics.json");
    } catch (err) {
      log.warn(`Failed to parse data/custom_cosmetics.json: ${err}`);
    }
  }

  // A server that registers schedules nothing until the API calls it open: a
  // mistyped letter must not mint lobbies under a letter routed elsewhere.
  const registers = checkinBody(0) !== null;
  lobbyService = new MasterLobbyService(playlist, log, registers);

  const INSTANCE_ID =
    ServerEnv.env() === GameEnv.Dev
      ? "DEV_ID"
      : crypto.randomBytes(4).toString("hex");
  process.env.INSTANCE_ID = INSTANCE_ID;

  log.info(`Instance ID: ${INSTANCE_ID}`);

  // Join the site's shared public-lobby roster (LobbyCoordinatorClient.ts)
  // when LOBBY_COORDINATOR=api and this server has a public host to
  // register under, the same test as the check-in below. Started before the
  // workers fork so the first roster normally lands before scheduling
  // begins; until it does, and whenever it stops, the master schedules its
  // own lobbies exactly as it does without a coordinator.
  const hello = checkinBody(0);
  const coordinator = coordinatorUrl(registeredSite());
  if (coordinator !== null && hello !== null) {
    log.info(`Joining lobby coordinator at ${coordinator}`);
    const client = new LobbyCoordinatorClient({
      url: coordinator,
      apiKey: ServerEnv.apiKey(),
      hello: {
        letter: hello.letter,
        host: hello.host,
        version: hello.version,
        numWorkers: hello.numWorkers,
        instanceId: INSTANCE_ID,
      },
      handlers: lobbyService.coordinatorHandlers(),
      log,
    });
    lobbyService.attachCoordinator(client);
    client.start();
  }

  // A worker that dies within this long of being forked counts as a
  // startup crash; one that stayed up at least this long is treated as
  // healthy, restarts immediately, and clears its backoff.
  const STARTUP_CRASH_MS = 30_000;
  const BACKOFF_CAP_MS = 30_000;

  // Map each cluster Worker to the WORKER_ID it was forked with, plus the
  // fork time. A Worker's env is not readable after exit (worker.process
  // has no .env), so the id must be captured here, at fork time.
  const forkedWorkers = new Map<Worker, { id: number; forkedAt: number }>();

  // Consecutive startup crashes per worker id, driving the backoff delay.
  const startupCrashes = new Map<number, number>();

  const forkWorker = (workerId: number): Worker => {
    const worker = cluster.fork({
      WORKER_ID: workerId,
      INSTANCE_ID,
    });

    forkedWorkers.set(worker, { id: workerId, forkedAt: Date.now() });
    lobbyService.registerWorker(workerId, worker);
    return worker;
  };

  // Fork workers
  for (let i = 0; i < ServerEnv.numWorkers(); i++) {
    const worker = forkWorker(i);
    log.info(`Started worker ${i} (PID: ${worker.process.pid})`);
  }

  // Handle worker crashes. A worker that dies during startup may crash on
  // boot again (bad env, bad file), so its restart is delayed with an
  // exponential backoff (1s doubling, capped) to avoid fork-looping many
  // times a second. Normal crashes restart straight away, and the backoff
  // resets once a worker has stayed up past STARTUP_CRASH_MS.
  cluster.on("exit", (worker, code, signal) => {
    const info = forkedWorkers.get(worker);
    forkedWorkers.delete(worker);
    if (info === undefined) {
      log.error(`worker crashed could not find id`);
      return;
    }

    const workerId = info.id;
    const uptimeMs = Date.now() - info.forkedAt;

    lobbyService.removeWorker(workerId);

    log.warn(
      `Worker ${workerId} (PID: ${worker.process.pid}) died with code: ${code} and signal: ${signal}`,
    );

    if (uptimeMs < STARTUP_CRASH_MS) {
      const crashes = (startupCrashes.get(workerId) ?? 0) + 1;
      startupCrashes.set(workerId, crashes);
      const delayMs = Math.min(1_000 * 2 ** (crashes - 1), BACKOFF_CAP_MS);
      log.warn(
        `Worker ${workerId} died during startup (${uptimeMs}ms after fork, crash #${crashes}); delaying restart by ${delayMs}ms`,
      );
      setTimeout(() => {
        log.info(`Restarting worker ${workerId}...`);
        const newWorker = forkWorker(workerId);
        log.info(
          `Restarted worker ${workerId} (New PID: ${newWorker.process.pid})`,
        );
      }, delayMs);
      return;
    }

    // Stayed up past STARTUP_CRASH_MS: a normal crash, restart straight
    // away and reset this slot's backoff.
    startupCrashes.delete(workerId);
    log.info(`Restarting worker ${workerId}...`);

    const newWorker = forkWorker(workerId);
    log.info(
      `Restarted worker ${workerId} (New PID: ${newWorker.process.pid})`,
    );
  });
  const PORT = 3000;
  server.listen(PORT, () => {
    log.info(`Master HTTP server listening on port ${PORT}`);
  });

  // Register with the API and keep checking in (docs/MultiServer.md,
  // "Server list v2"): the API's list is what clients read to find a
  // server, so a server that isn't checking in isn't offered to anyone.
  // Local development (`npm run dev`, no SUBDOMAIN) has no public host and
  // registers nowhere; every deployed host registers under its own site.
  if (registers) {
    log.info(
      `Checking in with ${ServerEnv.jwtIssuer()}/cluster/checkin every ${CHECKIN_INTERVAL_MS / 1000}s`,
    );
    let lastRefusal: string | null = null;
    startPolling(async () => {
      const body = checkinBody(lobbyService.liveGames());
      if (body === null) return;
      const result = await sendCheckin(body);
      if (isRefusal(result)) {
        if (result.refused !== lastRefusal) {
          log.error(
            `API refused check-in as letter ${body.letter} from ${body.host}: ${result.refused}. Scheduling no public lobbies until it is accepted.`,
          );
        }
        lastRefusal = result.refused;
      } else if (result !== null) {
        lastRefusal = null;
      }
      applyCheckinState(result, (active) => lobbyService.setActive(active));
    }, CHECKIN_INTERVAL_MS);

    // Public-lobby rotation weight overrides set in the API. Until the first
    // fetch lands, and while it keeps failing, the last known weights (or the
    // build's info.json) stay in effect.
    startPolling(async () => {
      playlist.setWeightOverrides(await fetchMapWeights());
    }, MAP_WEIGHTS_POLL_MS);
  }
}

app.get("/api/health", (_req, res) => {
  const ready = lobbyService?.isHealthy() ?? false;
  // instanceId is diagnostics: it tells the machines behind an apex apart.
  const instanceId = ServerEnv.instanceId();
  if (ready) {
    res.json({ status: "ok", instanceId });
  } else {
    res.status(503).json({ status: "unavailable", instanceId });
  }
});

// SPA fallback route
app.get("/{*splat}", async function (_req, res) {
  try {
    const htmlPath = path.join(__dirname, "../../static/index.html");
    await renderAppShell(res, htmlPath);
  } catch (error) {
    log.error("Error rendering SPA fallback:", error);
    res.status(500).send("Internal Server Error");
  }
});
