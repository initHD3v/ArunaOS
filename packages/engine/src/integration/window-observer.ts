import type { MemoryStore } from '../memory/memory-store';

export interface WindowFocusRecord {
  appId: string;
  focusDurationMs: number;
  timestamp: number;
}

export class WindowObserver {
  private store: MemoryStore;
  private currentApp: string | null = null;
  private focusStartTime: number = 0;
  private usageLog: WindowFocusRecord[] = [];

  constructor(store: MemoryStore) {
    this.store = store;
  }

  onFocusChange(appId: string | null): void {
    const now = Date.now();

    if (this.currentApp && this.focusStartTime > 0) {
      const duration = now - this.focusStartTime;
      this.usageLog.push({
        appId: this.currentApp,
        focusDurationMs: duration,
        timestamp: now,
      });
    }

    this.currentApp = appId;
    this.focusStartTime = now;
  }

  async flush(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    for (const record of this.usageLog) {
      const existing = await this.store.getAppUsage(record.appId, today);
      if (existing) {
        await this.store.recordAppUsage({
          ...existing,
          openCount: existing.openCount + 1,
          totalDurationMs: existing.totalDurationMs + record.focusDurationMs,
          lastOpened: record.timestamp,
        });
      } else {
        await this.store.recordAppUsage({
          appId: record.appId,
          date: today,
          openCount: 1,
          totalDurationMs: record.focusDurationMs,
          lastOpened: record.timestamp,
        });
      }
    }

    this.usageLog = [];
  }

  getCurrentApp(): string | null {
    return this.currentApp;
  }
}
