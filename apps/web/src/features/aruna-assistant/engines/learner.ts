import type { HabitPattern, LearnerEngine, PreferenceData } from './types';

const STORAGE_KEY = 'arunaos-learning';

export class LearningEngine implements LearnerEngine {
  name = 'learner';

  private activities: Array<{ type: string; data: Record<string, string>; timestamp: number }> = [];
  private preferences: PreferenceData = {
    preferredWorkspaces: [],
    productiveHours: [],
    favoriteModules: [],
    commonWorkflows: [],
  };
  private habits: HabitPattern[] = [];

  async init() {
    this.load();
  }

  destroy() {
    this.save();
  }

  getPreferences(): PreferenceData {
    return { ...this.preferences, favoriteModules: [...this.preferences.favoriteModules] };
  }

  getHabits(): HabitPattern[] {
    return [...this.habits];
  }

  observeActivity(type: string, data: Record<string, string>) {
    this.activities.unshift({ type, data, timestamp: Date.now() });

    // Track module usage
    if (type === 'module-open' && data.moduleId) {
      this.trackModuleUsage(data.moduleId, data.moduleName ?? data.moduleId);
    }

    // Track workspace usage
    if (type === 'workspace-change' && data.workspaceId) {
      this.trackWorkspaceUsage(data.workspaceId, data.workspaceName ?? data.workspaceId);
    }

    // Track active hours
    if (type === 'activity' || type === 'module-open') {
      const hour = new Date().getHours();
      this.trackProductiveHour(hour);
    }

    // Detect patterns
    this.detectHabits();

    // Keep only last 1000 activities
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(0, 1000);
    }

    this.save();
  }

  getProductiveHours(): number[] {
    return [...this.preferences.productiveHours];
  }

  getSuggestedWorkflow(): string[] | null {
    if (this.preferences.commonWorkflows.length === 0) return null;
    const best = this.preferences.commonWorkflows.sort((a, b) => b.frequency - a.frequency)[0];
    if (!best) return null;
    return best.steps;
  }

  /* ── Private tracking ─────────────────────────────── */

  private trackModuleUsage(moduleId: string, moduleName: string) {
    const existing = this.preferences.favoriteModules.find((m) => m.id === moduleId);
    if (existing) {
      existing.usageCount++;
    } else {
      this.preferences.favoriteModules.push({ id: moduleId, name: moduleName, usageCount: 1 });
    }
    this.preferences.favoriteModules.sort((a, b) => b.usageCount - a.usageCount);
    if (this.preferences.favoriteModules.length > 10) {
      this.preferences.favoriteModules = this.preferences.favoriteModules.slice(0, 10);
    }
  }

  private trackWorkspaceUsage(workspaceId: string, _workspaceName: string) {
    if (!this.preferences.preferredWorkspaces.includes(workspaceId)) {
      this.preferences.preferredWorkspaces.push(workspaceId);
    }
  }

  private trackProductiveHour(hour: number) {
    const recentActivity = this.activities.filter(
      (a) => Date.now() - a.timestamp < 7 * 24 * 60 * 60 * 1000,
    );
    const hourActivity = recentActivity.filter((a) => {
      const activityHour = new Date(a.timestamp).getHours();
      return activityHour === hour;
    });

    if (hourActivity.length >= 3 && !this.preferences.productiveHours.includes(hour)) {
      this.preferences.productiveHours.push(hour);
      this.preferences.productiveHours.sort((a, b) => a - b);
    }
  }

  private detectHabits() {
    this.habits = [];
    const recent = this.activities.slice(0, 50);

    // Detect module usage patterns
    const moduleCounts: Record<string, number> = {};
    for (const a of recent) {
      if (a.type === 'module-open' && a.data.moduleId) {
        moduleCounts[a.data.moduleId] = (moduleCounts[a.data.moduleId] ?? 0) + 1;
      }
    }
    for (const [moduleId, count] of Object.entries(moduleCounts)) {
      if (count >= 3) {
        this.habits.push({
          id: `habit-module-${moduleId}`,
          type: 'module',
          pattern: `Sering membuka ${moduleId}`,
          confidence: Math.min(count / 10, 1),
          frequency: count,
          lastObserved: recent.find((a) => a.data.moduleId === moduleId)?.timestamp ?? Date.now(),
        });
      }
    }

    // Detect productive time patterns
    const hourCounts: Record<number, number> = {};
    for (const a of recent) {
      const h = new Date(a.timestamp).getHours();
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    }
    const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (bestHour && Number(bestHour[1]) >= 3) {
      this.habits.push({
        id: 'habit-productive-hour',
        type: 'time',
        pattern: `Produktif di jam ${bestHour[0]}:00`,
        confidence: Math.min(Number(bestHour[1]) / 10, 1),
        frequency: Number(bestHour[1]),
        lastObserved: recent[0]?.timestamp ?? Date.now(),
      });
    }

    this.habits.sort((a, b) => b.confidence - a.confidence);
    this.habits = this.habits.slice(0, 10);
  }

  /* ── Persistence ──────────────────────────────────── */

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.activities = data.activities ?? [];
        this.preferences = data.preferences ?? this.preferences;
        this.habits = data.habits ?? [];
      }
    } catch {
      /* ignore */
    }
  }

  private save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activities: this.activities.slice(0, 200),
          preferences: this.preferences,
          habits: this.habits,
        }),
      );
    } catch {
      /* ignore */
    }
  }
}
