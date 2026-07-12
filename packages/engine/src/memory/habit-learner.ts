import type { MemoryStore } from './memory-store';

export interface HabitPattern {
  appId: string;
  usualHour: number;
  confidence: number;
  frequency: number;
}

export interface HabitInsight {
  type: 'app_pattern' | 'task_pattern' | 'mood_trend' | 'productive_hour';
  description: string;
  confidence: number;
}

export class HabitLearner {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  async learnAppPatterns(days = 14): Promise<HabitPattern[]> {
    const sessions = await this.store.getRecentSessions(days);
    const appMap = new Map<string, number[]>();
    const dateSet = new Set(sessions.map((s) => s.date));

    for (const session of sessions) {
      const apps = await this.store.getTopApps(session.date, 50);
      for (const app of apps) {
        if (!appMap.has(app.appId)) {
          appMap.set(app.appId, []);
        }
        const hour = new Date(session.startTime).getHours();
        appMap.get(app.appId)!.push(hour);
      }
    }

    const patterns: HabitPattern[] = [];
    const totalDays = dateSet.size || 1;

    for (const [appId, hours] of appMap) {
      if (hours.length < 2) continue;
      const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
      const frequency = hours.length;
      const confidence = Math.min(frequency / Math.max(totalDays * 0.3, 1), 1);
      patterns.push({ appId, usualHour: avgHour, confidence, frequency });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  async getProductiveHours(): Promise<{ hour: number; score: number }[]> {
    const sessions = await this.store.getRecentSessions(14);
    const hourProductivity = new Map<number, { count: number; tasksDone: number }>();

    for (const s of sessions) {
      const hour = new Date(s.startTime).getHours();
      const existing = hourProductivity.get(hour) ?? { count: 0, tasksDone: 0 };
      existing.count++;
      existing.tasksDone += s.tasksCompleted;
      hourProductivity.set(hour, existing);
    }

    const result: { hour: number; score: number }[] = [];
    for (const [hour, data] of hourProductivity) {
      const score = data.count > 0 ? data.tasksDone / data.count : 0;
      result.push({ hour, score });
    }

    return result.sort((a, b) => b.score - a.score);
  }

  async getInsights(): Promise<HabitInsight[]> {
    const insights: HabitInsight[] = [];
    const patterns = await this.learnAppPatterns();

    for (const p of patterns) {
      if (p.confidence > 0.5) {
        insights.push({
          type: 'app_pattern',
          description: `Kamu sering buka ${p.appId} sekitar jam ${p.usualHour}`,
          confidence: p.confidence,
        });
      }
    }

    const sessions = await this.store.getRecentSessions(7);
    if (sessions.length >= 3) {
      const avgDone = sessions.reduce((s, sess) => s + sess.tasksCompleted, 0) / sessions.length;
      if (avgDone >= 3) {
        insights.push({
          type: 'task_pattern',
          description: `Rata-rata ${Math.round(avgDone)} tugas selesai per hari — produktif!`,
          confidence: Math.min(avgDone / 10, 1),
        });
      }

      const moods = sessions.filter((s) => s.mood);
      if (moods.length >= 3) {
        const moodCounts = new Map<string, number>();
        for (const s of moods) {
          moodCounts.set(s.mood!, (moodCounts.get(s.mood!) ?? 0) + 1);
        }
        let topMood = '';
        let maxCount = 0;
        for (const [mood, count] of moodCounts) {
          if (count > maxCount) {
            maxCount = count;
            topMood = mood;
          }
        }
        if (topMood) {
          insights.push({
            type: 'mood_trend',
            description: `Mood dominan minggu ini: ${topMood}`,
            confidence: maxCount / moods.length,
          });
        }
      }
    }

    const prodHours = await this.getProductiveHours();
    const topHour = prodHours[0];
    if (topHour && topHour.score > 0) {
      insights.push({
        type: 'productive_hour',
        description: `Jam paling produktif: ${topHour.hour}:00 (rata-rata ${Math.round(topHour.score * 10) / 10} tugas/jam)`,
        confidence: Math.min(topHour.score / 5, 1),
      });
    }

    return insights;
  }
}
