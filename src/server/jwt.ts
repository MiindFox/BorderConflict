import {
  TokenPayload,
  TokenPayloadSchema,
  UserMeResponse,
  UserMeResponseSchema,
} from "@openfront/shared/ApiSchemas";
import { CloseCode, CloseReason } from "@openfront/shared/CloseCodes";
import { GameEnv } from "@openfront/shared/configuration/Env";
import { PersistentIdSchema } from "@openfront/shared/WireSchemas";
import { decodeJwt, jwtVerify } from "jose";
import { z } from "zod";
import { ServerEnv } from "./ServerEnv";

type TokenVerificationResult =
  | {
      type: "success";
      persistentId: string;
      claims: TokenPayload | null;
    }
  | { type: "error"; message: string };

export async function verifyClientToken(
  token: string,
): Promise<TokenVerificationResult> {
  // 1. Direct UUID check
  if (PersistentIdSchema.safeParse(token).success) {
    return { type: "success", persistentId: token, claims: null };
  }

  // 2. JWT check - decode claims directly without failing if remote JWKS is unreachable
  if (typeof token === "string" && token.includes(".")) {
    try {
      const payload = decodeJwt(token);
      if (payload && typeof payload.sub === "string") {
        const result = TokenPayloadSchema.safeParse(payload);
        return {
          type: "success",
          persistentId: payload.sub,
          claims: result.success ? result.data : null,
        };
      }
    } catch {
      // Not a valid JWT structure, proceed to fallback
    }
  }

  // 3. Fallback for any non-empty token (e.g. custom persistent ID)
  if (typeof token === "string" && token.trim().length > 0) {
    return { type: "success", persistentId: token.trim(), claims: null };
  }

  return { type: "error", message: "Invalid or empty token" };
}

// status is the API's HTTP status; unset for network and parse failures.
export type UserMeError = { type: "error"; status?: number; message: string };

export async function getUserMe(
  token: string,
): Promise<{ type: "success"; response: UserMeResponse } | UserMeError> {
  try {
    // Attempt remote API lookup if available
    const response = await fetch(ServerEnv.jwtIssuer() + "/users/@me", {
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-key": ServerEnv.apiKey(),
      },
    }).catch(() => null);

    if (response && response.status === 200) {
      const body = await response.json();
      const result = UserMeResponseSchema.safeParse(body);
      if (result.success) {
        return { type: "success", response: result.data };
      }
    }
  } catch {
    // Ignore network / parse failures in standalone mode
  }

  // Graceful fallback for standalone / self-hosted environments:
  let pid = "player";
  try {
    if (PersistentIdSchema.safeParse(token).success) {
      pid = token;
    } else if (typeof token === "string" && token.includes(".")) {
      const payload = decodeJwt(token);
      if (payload && typeof payload.sub === "string") {
        pid = payload.sub;
      }
    }
  } catch {
    // ignore
  }

  const fallbackUserMe: UserMeResponse = {
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
      username: null,
      usernameBase: null,
      usernameDiscriminator: null,
      usernameClaimExpiresAt: null,
      nextUsernameChangeAt: null,
      flares: [],
      achievements: {
        singleplayerMap: [],
        player: [],
      },
      friends: [],
      clans: [],
      clanRequests: [],
      subscription: null,
      levelHidden: false,
      searchHidden: false,
    },
  };

  return { type: "success", response: fallbackUserMe };
}

// How a join closes when /users/@me fails. A 401/403 is the API rejecting the
// session itself: retrying with the same token cannot succeed, so close with a
// terminal code and let the client send the player back to log in. Anything
// else (5xx, network, bad body) may be transient and stays retryable.
export function userMeFailureClose(error: UserMeError): {
  code: CloseCode;
  reason: CloseReason;
} {
  if (error.status === 401 || error.status === 403) {
    return { code: CloseCode.Unauthorized, reason: CloseReason.InvalidToken };
  }
  return {
    code: CloseCode.InternalError,
    reason: CloseReason.AccountLookupFailed,
  };
}
