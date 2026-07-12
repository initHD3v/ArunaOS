import type { UserProfile, SessionRecord, AppUsageRecord, ConversationRecord } from './entities';

export interface MemoryStore {
  // User
  getUser(): Promise<UserProfile | null>;
  saveUser(profile: UserProfile): Promise<void>;

  // Sessions
  getTodaySession(): Promise<SessionRecord | null>;
  saveSession(session: SessionRecord): Promise<void>;
  getRecentSessions(days: number): Promise<SessionRecord[]>;

  // App Usage
  getAppUsage(appId: string, date: string): Promise<AppUsageRecord | null>;
  recordAppUsage(usage: AppUsageRecord): Promise<void>;
  getTopApps(date: string, limit?: number): Promise<AppUsageRecord[]>;

  // Conversations
  saveConversation(conv: ConversationRecord): Promise<void>;
  getRecentConversations(days: number): Promise<ConversationRecord[]>;
}

export class InMemoryStore implements MemoryStore {
  private user: UserProfile | null = null;
  private sessions: SessionRecord[] = [];
  private appUsages: AppUsageRecord[] = [];
  private conversations: ConversationRecord[] = [];

  async getUser(): Promise<UserProfile | null> {
    return this.user;
  }

  async saveUser(profile: UserProfile): Promise<void> {
    this.user = profile;
  }

  async getTodaySession(): Promise<SessionRecord | null> {
    const today = new Date().toISOString().slice(0, 10);
    return this.sessions.find((s) => s.date === today) ?? null;
  }

  async saveSession(session: SessionRecord): Promise<void> {
    const idx = this.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      this.sessions[idx] = session;
    } else {
      this.sessions.push(session);
    }
  }

  async getRecentSessions(days: number): Promise<SessionRecord[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.sessions.filter((s) => s.startTime >= cutoff.getTime());
  }

  async getAppUsage(appId: string, date: string): Promise<AppUsageRecord | null> {
    return this.appUsages.find((u) => u.appId === appId && u.date === date) ?? null;
  }

  async recordAppUsage(usage: AppUsageRecord): Promise<void> {
    const idx = this.appUsages.findIndex((u) => u.appId === usage.appId && u.date === usage.date);
    if (idx >= 0) {
      this.appUsages[idx] = usage;
    } else {
      this.appUsages.push(usage);
    }
  }

  async getTopApps(date: string, limit = 5): Promise<AppUsageRecord[]> {
    return this.appUsages
      .filter((u) => u.date === date)
      .sort((a, b) => b.openCount - a.openCount)
      .slice(0, limit);
  }

  async saveConversation(conv: ConversationRecord): Promise<void> {
    this.conversations.push(conv);
  }

  async getRecentConversations(days: number): Promise<ConversationRecord[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.conversations.filter((c) => c.timestamp >= cutoff.getTime());
  }

  async clear(): Promise<void> {
    this.user = null;
    this.sessions = [];
    this.appUsages = [];
    this.conversations = [];
  }
}
