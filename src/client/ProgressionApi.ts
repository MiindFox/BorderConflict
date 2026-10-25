import {
  type GameXpResponse,
  GameXpResponseSchema,
  type PrestigeResponse,
  PrestigeResponseSchema,
  type ProgressionConfig,
  ProgressionConfigSchema,
  type PublicProgress,
  PublicProgressSchema,
} from "@openfront/shared/ApiSchemas";
// ApiBase rather than Api: this module is imported by in-game UI (WinModal)
// whose tests stub Api wholesale.
import { getApiBase } from "./ApiBase";
import { getAuthHeader } from "./Auth";

// Player levels / XP. Every helper here fails closed: progression is purely
// cosmetic, so any error hides the UI rather than surfacing a failure.

export type GameXpFetchResult =
  | { status: "ok"; data: GameXpResponse }
  // 404 (not processed yet, or progression off) or a transient failure —
  // worth asking again while the caller is still polling. `notFound` marks
  // the 404: the one answer that says the game isn't scored yet, rather than
  // that the question went unanswered. `rateLimited` marks a 429: stop
  // asking about other games for now.
  | { status: "pending"; notFound?: true; rateLimited?: true }
  // A conclusion: signed out, or a body we cannot read. Stop asking.
  | { status: "unavailable" };

// The request's own timeout, plus the caller's signal when there is one, so
// aborting cancels a request already in flight rather than leaving it to run
// to its timeout. Without AbortSignal.any (older browsers), just the timeout.
function requestSignal(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(10_000);
  if (signal === undefined || typeof AbortSignal.any !== "function") {
    return timeout;
  }
  return AbortSignal.any([signal, timeout]);
}

// GET /users/@me/xp/:gameId — the XP the caller earned in one game.
export async function fetchMyGameXp(
  gameId: string,
  signal?: AbortSignal,
): Promise<GameXpFetchResult> {
  try {
    const authorization = await getAuthHeader();
    if (authorization === "") return { status: "unavailable" };
    const res = await fetch(
      `${getApiBase()}/users/@me/xp/${encodeURIComponent(gameId)}`,
      {
        headers: { Accept: "application/json", Authorization: authorization },
        signal: requestSignal(signal),
      },
    );
    if (res.status === 404) return { status: "pending", notFound: true };
    if (res.status === 429) return { status: "pending", rateLimited: true };
    if (res.status === 401 || res.status === 403) {
      return { status: "unavailable" };
    }
    if (!res.ok) {
      console.warn("fetchMyGameXp: unexpected status", res.status);
      return { status: "pending" };
    }
    const parsed = GameXpResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      console.warn("fetchMyGameXp: Zod validation failed", parsed.error);
      return { status: "unavailable" };
    }
    return { status: "ok", data: parsed.data };
  } catch (err) {
    // The caller gave up: not a failure worth a warning.
    if (signal?.aborted) return { status: "pending" };
    console.warn("fetchMyGameXp: request failed", err);
    return { status: "pending" };
  }
}

export interface PollGameXpOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  // Injectable for tests.
  fetcher?: (
    gameId: string,
    signal?: AbortSignal,
  ) => Promise<GameXpFetchResult>;
}

/**
 * Asks for a game's XP until it is processed, the deadline passes, or the
 * caller aborts. Resolves to the response, or null when there is nothing to
 * show (timed out, signed out, unreadable, aborted) — never a zero.
 */
export async function pollGameXp(
  gameId: string,
  opts: PollGameXpOptions = {},
): Promise<GameXpResponse | null> {
  const intervalMs = opts.intervalMs ?? 3_000;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const fetcher = opts.fetcher ?? fetchMyGameXp;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (opts.signal?.aborted) return null;
    const result = await fetcher(gameId, opts.signal);
    if (opts.signal?.aborted) return null;
    if (result.status === "ok") return result.data;
    if (result.status === "unavailable") return null;
    if (Date.now() + intervalMs > deadline) return null;
    const signal = opts.signal;
    await new Promise<void>((resolve) => {
      // Whichever fires first tears down the other, so a long poll never
      // piles one abort listener per wait onto the caller's signal.
      const onAbort = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, intervalMs);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}

// GET /public/player/:publicId/progress — another player's level. False on a
// 404 (unknown player, progression off) and every other failure.
export async function fetchPublicPlayerProgress(
  publicId: string,
): Promise<PublicProgress | false> {
  try {
    const res = await fetch(
      `${getApiBase()}/public/player/${encodeURIComponent(publicId)}/progress`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (res.status === 404) return false;
    if (!res.ok) {
      console.warn("fetchPublicPlayerProgress: unexpected status", res.status);
      return false;
    }
    const parsed = PublicProgressSchema.safeParse(await res.json());
    if (!parsed.success) {
      console.warn(
        "fetchPublicPlayerProgress: Zod validation failed",
        parsed.error,
      );
      return false;
    }
    return parsed.data;
  } catch (err) {
    console.warn("fetchPublicPlayerProgress: request failed", err);
    return false;
  }
}

// POST /users/@me/prestige — the opt-in reset at level 100. The caller keeps
// one idempotency key until a prestige succeeds, so a retried request (a
// slow network, a lost response) prestiges once. Unlike the reads above this
// does surface failure: the player asked for it and must be told why.
// - "refused": the server says the player can't prestige (409), usually an
//   earlier prestige whose answer never arrived.
// - "signed_out": no session to send, or the server rejected it (401/403).
// - "failed": anything else. It may or may not have gone through, and a
//   retry with the same key finds out.
export type PrestigeFailure = "refused" | "signed_out" | "failed";

export type PrestigeResult =
  | { ok: true; data: PrestigeResponse }
  | { ok: false; reason: PrestigeFailure };

export async function prestigeMe(
  idempotencyKey: string,
): Promise<PrestigeResult> {
  try {
    const authorization = await getAuthHeader();
    if (authorization === "") return { ok: false, reason: "signed_out" };
    const res = await fetch(`${getApiBase()}/users/@me/prestige`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "Idempotency-Key": idempotencyKey,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn("prestigeMe: unexpected status", res.status);
      if (res.status === 409) return { ok: false, reason: "refused" };
      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: "signed_out" };
      }
      return { ok: false, reason: "failed" };
    }
    const parsed = PrestigeResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      console.warn("prestigeMe: Zod validation failed", parsed.error);
      return { ok: false, reason: "failed" };
    }
    return { ok: true, data: parsed.data };
  } catch (err) {
    console.warn("prestigeMe: request failed", err);
    return { ok: false, reason: "failed" };
  }
}

// The server's max-age for the config: a deploy that changes it has to reach
// open tabs within this.
const PROGRESSION_CONFIG_TTL_MS = 60_000;

let progressionConfig: {
  request: Promise<ProgressionConfig | false>;
  at: number;
} | null = null;

// GET /public/progression/config — the level curve, and whether progression is
// on at all (404 when it is off). Memoised for as long as the server says it
export function getDefaultProgressionConfig(): ProgressionConfig {
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

// stays fresh; a failure is not, so a later caller can try again.
export function fetchProgressionConfig(): Promise<ProgressionConfig | false> {
  if (
    progressionConfig !== null &&
    Date.now() - progressionConfig.at < PROGRESSION_CONFIG_TTL_MS
  ) {
    return progressionConfig.request;
  }
  const request = (async (): Promise<ProgressionConfig | false> => {
    try {
      const res = await fetch(`${getApiBase()}/public/progression/config`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return getDefaultProgressionConfig();
      const parsed = ProgressionConfigSchema.safeParse(await res.json());
      if (!parsed.success) {
        console.warn(
          "fetchProgressionConfig: Zod validation failed",
          parsed.error,
        );
        return getDefaultProgressionConfig();
      }
      return parsed.data;
    } catch (err) {
      console.warn("fetchProgressionConfig: request failed, using default", err);
      return getDefaultProgressionConfig();
    }
  })();
  const entry = { request, at: Date.now() };
  progressionConfig = entry;
  void request.then((config) => {
    if (progressionConfig !== entry) return;
    // Fresh from the response, like the server's max-age.
    if (config === false) progressionConfig = null;
    else entry.at = Date.now();
  });
  return request;
}
