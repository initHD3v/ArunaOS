import { describe, it, expect } from 'vitest';
import { InMemoryStore } from './memory-store';
import { MemoryGraphOptimizer } from './memory-graph-optimizer';

describe('MemoryGraphOptimizer', () => {
  it('returns empty result for empty store', async () => {
    const store = new InMemoryStore();
    const opt = new MemoryGraphOptimizer(store);
    const result = await opt.query({ entityType: 'session' });
    expect(result.sessions).toEqual([]);
    expect(result.appUsage).toEqual([]);
  });

  it('returns related data for a date', async () => {
    const store = new InMemoryStore();
    await store.saveSession({
      id: 'session-2026-07-11',
      date: '2026-07-11',
      startTime: Date.now(),
      greetingShown: true,
      tasksCompleted: 3,
      mood: null,
    });

    const opt = new MemoryGraphOptimizer(store);
    const related = await opt.getRelatedData('2026-07-11');
    expect(related.session?.tasksCompleted).toBe(3);
  });

  it('invalidates cache', () => {
    const store = new InMemoryStore();
    const opt = new MemoryGraphOptimizer(store);
    opt.invalidateCache();
    // no error = pass
  });
});
