import { describe, it, expect, beforeEach } from 'vitest';
import { ReflectionEngine } from './reflector';
import type { SystemContext, Memory, MemoryQuery } from './types';

describe('ReflectionEngine', () => {
  let reflector: ReflectionEngine;
  let mockMemory: { recall: (q: MemoryQuery) => Memory[] };
  let mockCtx: SystemContext;

  beforeEach(() => {
    localStorage.clear();
    reflector = new ReflectionEngine();
    mockCtx = {
      time: {
        hour: 14,
        minute: 30,
        dayOfWeek: 3,
        date: 'Wednesday, 12 July 2026',
        timeOfDay: 'afternoon',
      },
      weather: null,
      workspace: { activeModules: ['files', 'settings'], focusedWindow: 'files' },
      notifications: { total: 2, important: 1 },
      system: { battery: 85, network: 'wifi', uptime: 3600 },
    };
    mockMemory = { recall: () => [] };
  });

  it('generates daily reflection with no activities', () => {
    const ref = reflector.generateDailyReflection(mockCtx, mockMemory);
    expect(ref.date).toBeTruthy();
    expect(ref.tasksCompleted).toBe(0);
    expect(ref.focusScore).toBe(0);
    expect(ref.summary).toContain('Belum ada tugas');
  });

  it('generates daily reflection with completed tasks', () => {
    mockMemory = {
      recall: () => [
        {
          id: '1',
          category: 'episodic',
          content: 'Task completed: login page',
          timestamp: Date.now(),
        },
        {
          id: '2',
          category: 'episodic',
          content: 'Task completed: API integration',
          timestamp: Date.now(),
        },
        { id: '3', category: 'episodic', content: 'Task completed: tests', timestamp: Date.now() },
        { id: '4', category: 'short-term', content: 'Created task: deploy', timestamp: Date.now() },
        { id: '5', category: 'short-term', content: 'Created task: review', timestamp: Date.now() },
        {
          id: '6',
          category: 'short-term',
          content: 'Created task: refactor',
          timestamp: Date.now(),
        },
      ],
    };
    const ref = reflector.generateDailyReflection(mockCtx, mockMemory);
    expect(ref.tasksCompleted).toBe(3);
    expect(ref.tasksPending).toBe(0);
    expect(ref.summary).toContain('Kemajuan');
  });

  it('generates weekly reflection', () => {
    const ref = reflector.generateWeeklyReflection(mockCtx, mockMemory);
    expect(ref.weekStart).toBeTruthy();
    expect(ref.weekEnd).toBeTruthy();
    expect(ref.totalActiveDays).toBe(0);
  });

  it('generates weekly reflection with activity data', () => {
    // Today is Sunday (dayOfWeek=0), so weekStart = today
    mockMemory = {
      recall: () => [
        {
          id: '1',
          category: 'episodic',
          content: 'Task completed: feature A',
          timestamp: Date.now(),
        },
        {
          id: '2',
          category: 'episodic',
          content: 'Task completed: feature B',
          timestamp: Date.now(),
        },
        {
          id: '3',
          category: 'short-term',
          content: 'Task completed: bug fix',
          timestamp: Date.now(),
        },
      ],
    };
    const ref = reflector.generateWeeklyReflection(mockCtx, mockMemory);
    expect(ref.totalTasksCompleted).toBe(2);
  });

  it('returns 0 streak initially', () => {
    expect(reflector.getCurrentStreak()).toBe(0);
  });

  it('generates productivity summary', () => {
    const summary = reflector.getProductivitySummary(mockCtx, mockMemory);
    expect(summary.today).toBeTruthy();
    expect(summary.weekly).toBeTruthy();
    expect(summary.streak).toBe(0);
    expect(['improving', 'declining', 'stable']).toContain(summary.trend);
  });

  it('detects improving trend', () => {
    // If today has tasks but weekly doesn't, should be improving
    mockMemory = {
      recall: () => [
        { id: '1', category: 'episodic', content: 'Task completed: work', timestamp: Date.now() },
      ],
    };
    const summary = reflector.getProductivitySummary(mockCtx, mockMemory);
    expect(summary.trend).toBe('improving');
  });
});
