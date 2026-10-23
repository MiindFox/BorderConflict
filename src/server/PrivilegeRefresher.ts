import { ReservedClanTagsResponseSchema } from "@openfront/shared/ClanApiSchemas";
import { CosmeticsSchema } from "@openfront/shared/CosmeticSchemas";
import { base64url } from "jose";
import { Logger } from "winston";
import { startPolling } from "./PollingLoop";
import {
  FailOpenPrivilegeChecker,
  PrivilegeChecker,
  PrivilegeCheckerImpl,
} from "./Privilege";

// Refreshes the privilege checker every 3 minutes.
// WARNING: This fails open if cosmetics.json is not available.
export class PrivilegeRefresher {
  private privilegeChecker: PrivilegeChecker | null = null;
  private failOpenPrivilegeChecker: PrivilegeChecker =
    new FailOpenPrivilegeChecker();

  private log: Logger;

  constructor(
    private cosmeticsEndpoint: string,
    private apiKey: string,
    private reservedClanTagsEndpoint: string,
    parentLog: Logger,
    private refreshInterval: number = 1000 * 60 * 3,
  ) {
    this.log = parentLog.child({ comp: "privilege-refresher" });
  }

  public async start() {
    this.log.info(
      `Starting privilege refresher with interval ${this.refreshInterval}`,
    );
    startPolling(() => this.loadPrivilegeChecker(), this.refreshInterval);
  }

  public get(): PrivilegeChecker {
    return this.privilegeChecker ?? this.failOpenPrivilegeChecker;
  }

  private async loadPrivilegeChecker(): Promise<void> {
    try {
      const fetchWithTimeout = async (url: string) => {
        try {
          return await fetch(url, {
            signal: AbortSignal.timeout(3000),
            headers: { "x-api-key": this.apiKey },
          });
        } catch {
          return null;
        }
      };

      const [cosmeticsResponse, reservedClanTagsResponse] = await Promise.all([
        fetchWithTimeout(this.cosmeticsEndpoint),
        fetchWithTimeout(this.reservedClanTagsEndpoint),
      ]);

      if (!cosmeticsResponse || !cosmeticsResponse.ok) {
        // Fallback silently: FailOpenPrivilegeChecker handles offline or local mode
        return;
      }

      const cosmeticsData = await cosmeticsResponse.json();
      const result = CosmeticsSchema.safeParse(cosmeticsData);

      if (!result.success) {
        return;
      }

      if (!reservedClanTagsResponse || !reservedClanTagsResponse.ok) {
        return;
      }
      const reservedClanTagsData = await reservedClanTagsResponse.json();
      const reservedClanTagsResult =
        ReservedClanTagsResponseSchema.safeParse(reservedClanTagsData);
      if (!reservedClanTagsResult.success) {
        return;
      }
      const reservedClanTags = new Set(
        reservedClanTagsResult.data.map((tag) => tag.toUpperCase()),
      );

      this.privilegeChecker = new PrivilegeCheckerImpl(
        result.data,
        base64url.decode,
        reservedClanTags,
      );
    } catch {
      // Keep fail-open privilege checker active without noisy error logs
    }
  }
}
