export interface ActiveSession {
  sessionId: string;
  username: string;
  email?: string;
  ip: string;
  userAgent?: string;
  connectedAt: number;
  lastSeen: number;
  state: "menu" | "lobby" | "in_game";
  currentPage: string;
  isGuest: boolean;
}

class PresenceTracker {
  private sessions = new Map<string, ActiveSession>();
  private kickedSessions = new Set<string>();
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
      isGuest?: boolean;
    },
  ): void {
    if (!sessionId) return;
    const now = Date.now();
    const existing = this.sessions.get(sessionId);
    const isGuest =
      info.isGuest !== undefined
        ? info.isGuest
        : !info.email || info.email.trim() === "";

    this.sessions.set(sessionId, {
      sessionId,
      username:
        info.username ||
        existing?.username ||
        (isGuest ? `Invité_${sessionId.slice(-4)}` : "Commandant"),
      email: info.email || existing?.email,
      ip: info.ip || existing?.ip || "",
      userAgent: info.userAgent || existing?.userAgent,
      connectedAt: existing?.connectedAt || now,
      lastSeen: now,
      state: info.state || existing?.state || "menu",
      currentPage: info.currentPage || existing?.currentPage || "play",
      isGuest,
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

  public getGuestSessions(): ActiveSession[] {
    this.pruneStale();
    return Array.from(this.sessions.values())
      .filter((s) => s.isGuest)
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  public getRegisteredSessions(): ActiveSession[] {
    this.pruneStale();
    return Array.from(this.sessions.values())
      .filter((s) => !s.isGuest)
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  public getOnlineCount(): number {
    this.pruneStale();
    return this.sessions.size;
  }

  public getGuestCount(): number {
    return this.getGuestSessions().length;
  }

  public getRegisteredCount(): number {
    return this.getRegisteredSessions().length;
  }

  public kickSession(sessionId: string): boolean {
    const existed = this.sessions.delete(sessionId);
    this.kickedSessions.add(sessionId);
    return existed;
  }

  public isKicked(sessionId: string): boolean {
    return this.kickedSessions.has(sessionId);
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
