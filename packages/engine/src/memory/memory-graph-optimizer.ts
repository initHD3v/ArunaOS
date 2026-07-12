import type { MemoryStore } from './memory-store';
import type { SessionRecord, AppUsageRecord } from './entities';

export interface GraphQuery {
  entityType: 'session' | 'app_usage';
  dateRange?: { from: string; to: string };
  limit?: number;
}

export interface GraphQueryResult {
  sessions: SessionRecord[];
  appUsage: AppUsageRecord[];
}

export class MemoryGraphOptimizer {
  private store: MemoryStore;
  private sessionCache: SessionRecord[] | null = null;
  private lastCacheTime = 0;
  private readonly CACHE_TTL = 30000;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  invalidateCache(): void {
    this.sessionCache = null;
    this.lastCacheTime = 0;
  }

  async query(_query: GraphQuery): Promise<GraphQueryResult> {
    const now = Date.now();
    const sessions = this.sessionCache ?? (await this.store.getRecentSessions(30));

    if (now - this.lastCacheTime > this.CACHE_TTL) {
      this.sessionCache = sessions;
      this.lastCacheTime = now;
    }

    return { sessions, appUsage: [] };
  }

  async getRelatedData(date: string): Promise<{
    session: SessionRecord | null;
    topApps: AppUsageRecord[];
  }> {
    const sessions = this.sessionCache ?? (await this.store.getRecentSessions(30));
    const session = sessions.find((s) => s.date === date) ?? null;
    const topApps = await this.store.getTopApps(date, 5);
    return { session, topApps };
  }
}
