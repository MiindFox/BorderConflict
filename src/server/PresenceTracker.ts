export interface ActiveSession {
  sessionId: string;
  username: string;
  email?: string;
  ip: string;
  userAgent?: string;
  lastSeen: number;
  state: "menu" | "lobby" | "in_game";
  currentPage: string;
}

class PresenceTracker {
  private sessions = new Map<string, ActiveSession>();
  private readonly TTL_MS = 45_000; // 45 seconds

  public recordHeartbeat(
    sessionId: string,
    info: {
      username?: string;
      email?: string;
      ip: string;
      userAgent?: string;
      state?: "menu" | "lobby" | "in_game";
      currentPage?: string;
    },
  ): void {
    if (!sessionId) return;
    const now = Date.now();
    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      sessionId,
      username: info.username || existing?.username || "Anonyme",
      email: info.email || existing?.email,
      ip: info.ip || existing?.ip || "",
      userAgent: info.userAgent || existing?.userAgent,
      lastSeen: now,
      state: info.state || existing?.state || "menu",
      currentPage: info.currentPage || existing?.currentPage || "play",
    });
  }

  public pruneStale(): void {
    const cutoff = Date.now() - this.TTL_MS;
    for (const [id, session] of this.sessions.entries()) {
      if (session.lastSeen < cutoff) {
        this.sessions.delete(id);
      }
    }
  }

  public getActiveSessions(): ActiveSession[] {
    this.pruneStale();
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.lastSeen - a.lastSeen,
    );
  }

  public getOnlineCount(): number {
    this.pruneStale();
    return this.sessions.size;
  }

  public isUserOnline(usernameOrEmail: string): boolean {
    this.pruneStale();
    const target = (usernameOrEmail || "").trim().toLowerCase();
    if (!target) return false;
    for (const s of this.sessions.values()) {
      if (
        s.username.toLowerCase() === target ||
        (s.email && s.email.toLowerCase() === target)
      ) {
        return true;
      }
    }
    return false;
  }
}

export const presenceTracker = new PresenceTracker();
