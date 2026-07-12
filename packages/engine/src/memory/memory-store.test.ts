import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from './memory-store';
import type { UserProfile, SessionRecord, AppUsageRecord } from './entities';

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(async () => {
    store = new InMemoryStore();
  });

  describe('user', () => {
    it('returns null when no user saved', async () => {
      expect(await store.getUser()).toBeNull();
    });

    it('saves and retrieves user', async () => {
      const user: UserProfile = {
        id: 'test',
        name: 'Test User',
        createdAt: Date.now(),
        preferences: { language: 'en', proactiveMode: 'balanced', theme: 'system' },
      };
      await store.saveUser(user);
      const retrieved = await store.getUser();
      expect(retrieved?.id).toBe('test');
      expect(retrieved?.name).toBe('Test User');
    });
  });

  describe('sessions', () => {
    it('returns null when no session today', async () => {
      expect(await store.getTodaySession()).toBeNull();
    });

    it('saves and retrieves today session', async () => {
      const session: SessionRecord = {
        id: 'session-2026-07-11',
        date: new Date().toISOString().slice(0, 10),
        startTime: Date.now(),
        greetingShown: true,
        tasksCompleted: 3,
        mood: 'Focused',
      };
      await store.saveSession(session);
      const retrieved = await store.getTodaySession();
      expect(retrieved?.id).toBe(session.id);
      expect(retrieved?.tasksCompleted).toBe(3);
    });

    it('updates existing session', async () => {
      const session: SessionRecord = {
        id: 'session-2026-07-11',
        date: new Date().toISOString().slice(0, 10),
        startTime: Date.now(),
        greetingShown: false,
        tasksCompleted: 0,
        mood: null,
      };
      await store.saveSession(session);
      await store.saveSession({ ...session, tasksCompleted: 5, mood: 'Productive' });
      const retrieved = await store.getTodaySession();
      expect(retrieved?.tasksCompleted).toBe(5);
      expect(retrieved?.mood).toBe('Productive');
    });
  });

  describe('app usage', () => {
    it('saves and retrieves app usage', async () => {
      const usage: AppUsageRecord = {
        appId: 'files',
        date: '2026-07-11',
        openCount: 5,
        totalDurationMs: 120000,
        lastOpened: Date.now(),
      };
      await store.recordAppUsage(usage);
      const retrieved = await store.getAppUsage('files', '2026-07-11');
      expect(retrieved?.openCount).toBe(5);
    });

    it('returns top apps sorted by open count', async () => {
      await store.recordAppUsage({
        appId: 'files',
        date: '2026-07-11',
        openCount: 3,
        totalDurationMs: 100,
        lastOpened: Date.now(),
      });
      await store.recordAppUsage({
        appId: 'ai',
        date: '2026-07-11',
        openCount: 10,
        totalDurationMs: 100,
        lastOpened: Date.now(),
      });
      await store.recordAppUsage({
        appId: 'settings',
        date: '2026-07-11',
        openCount: 1,
        totalDurationMs: 100,
        lastOpened: Date.now(),
      });

      const top = await store.getTopApps('2026-07-11', 2);
      expect(top).toHaveLength(2);
      expect(top[0]?.appId).toBe('ai');
      expect(top[1]?.appId).toBe('files');
    });
  });

  describe('conversations', () => {
    it('saves and retrieves recent conversations', async () => {
      const now = Date.now();
      await store.saveConversation({
        id: 'conv-1',
        date: '2026-07-11',
        timestamp: now,
        messageCount: 5,
        summary: 'Morning greeting',
      });
      const recent = await store.getRecentConversations(7);
      expect(recent).toHaveLength(1);
      expect(recent[0]?.summary).toBe('Morning greeting');
    });
  });

  describe('clear', () => {
    it('clears all data', async () => {
      await store.saveUser({
        id: 'test',
        name: 'T',
        createdAt: 0,
        preferences: { language: 'en', proactiveMode: 'balanced', theme: 'system' },
      });
      await store.clear();
      expect(await store.getUser()).toBeNull();
    });
  });
});
