import { TemplateEngine, type EngineContext, type TimeOfDay } from '../engine/template-engine';
import type { MemoryStore, InMemoryStore } from '../memory/memory-store';

export interface SystemState {
  timeOfDay: TimeOfDay;
  date: Date;
  weather?: {
    temp: number;
    condition: string;
    city: string;
  };
  tasks?: {
    total: number;
    done: number;
  };
  activeApps: string[];
  focusedApp: string | null;
}

export class ContextAggregator {
  private templateEngine: TemplateEngine;
  private memoryStore: MemoryStore;
  private state: SystemState;

  constructor(memoryStore: MemoryStore) {
    this.templateEngine = new TemplateEngine();
    this.memoryStore = memoryStore;
    this.state = this.buildDefaultState();
  }

  private buildDefaultState(): SystemState {
    return {
      timeOfDay: this.templateEngine.getTimeOfDay(),
      date: new Date(),
      activeApps: [],
      focusedApp: null,
    };
  }

  getCurrentState(): SystemState {
    return { ...this.state, timeOfDay: this.templateEngine.getTimeOfDay(), date: new Date() };
  }

  updateState(partial: Partial<SystemState>): void {
    this.state = { ...this.state, ...partial };
  }

  async buildEngineContext(): Promise<EngineContext> {
    const state = this.getCurrentState();
    const todaySession = await this.memoryStore.getTodaySession();

    const ctx: EngineContext = {
      timeOfDay: state.timeOfDay,
      date: state.date,
      weather: state.weather,
      tasks: state.tasks,
    };

    if (todaySession) {
      const recent = await this.memoryStore.getRecentSessions(7);
      const avgCompleted =
        recent.length > 0
          ? Math.round(recent.reduce((sum, s) => sum + s.tasksCompleted, 0) / recent.length)
          : 0;

      const moodCounts = new Map<string, number>();
      for (const s of recent) {
        if (s.mood) {
          moodCounts.set(s.mood, (moodCounts.get(s.mood) ?? 0) + 1);
        }
      }
      let topMood = 'Focused';
      let maxCount = 0;
      for (const [mood, count] of moodCounts) {
        if (count > maxCount) {
          maxCount = count;
          topMood = mood;
        }
      }

      ctx.lastSession = {
        tasksCompleted: avgCompleted,
        topMood,
      };
    }

    return ctx;
  }

  setWeather(temp: number, condition: string, city: string): void {
    this.state.weather = { temp, condition, city };
  }

  setTasks(total: number, done: number): void {
    this.state.tasks = { total, done };
  }

  setActiveApps(apps: string[]): void {
    this.state.activeApps = apps;
  }

  setFocusedApp(app: string | null): void {
    this.state.focusedApp = app;
  }
}

export { InMemoryStore };
export type { MemoryStore };
