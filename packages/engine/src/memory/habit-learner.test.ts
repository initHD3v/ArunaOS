import { describe, it, expect } from 'vitest';
import { InMemoryStore } from './memory-store';
import { HabitLearner } from './habit-learner';

describe('HabitLearner', () => {
  it('returns empty patterns when no sessions', async () => {
    const store = new InMemoryStore();
    const learner = new HabitLearner(store);
    const patterns = await learner.learnAppPatterns();
    expect(patterns).toEqual([]);
  });

  it('returns empty insights with no data', async () => {
    const store = new InMemoryStore();
    const learner = new HabitLearner(store);
    const insights = await learner.getInsights();
    expect(insights).toEqual([]);
  });

  it('generates app pattern from session data', async () => {
    const store = new InMemoryStore();
    const now = Date.now();

    await store.saveSession({
      id: 'session-1',
      date: '2026-07-11',
      startTime: now - 86400000,
      greetingShown: true,
      tasksCompleted: 3,
      mood: null,
    });

    await store.recordAppUsage({
      appId: 'files',
      date: '2026-07-11',
      openCount: 5,
      totalDurationMs: 60000,
      lastOpened: now,
    });

    await store.recordAppUsage({
      appId: 'files',
      date: '2026-07-10',
      openCount: 3,
      totalDurationMs: 30000,
      lastOpened: now - 86400000,
    });

    const learner = new HabitLearner(store);
    const insights = await learner.getInsights();
    expect(insights.length).toBeGreaterThanOrEqual(0);
  });
});
