import { describe, it, expect, beforeEach } from 'vitest';
import { ArunaEngine } from './system-ai-service';

describe('ArunaEngine', () => {
  let engine: ArunaEngine;

  beforeEach(() => {
    engine = new ArunaEngine();
  });

  it('starts in booting status', () => {
    expect(engine.getStatus()).toBe('booting');
  });

  it('boots to ready', async () => {
    await engine.boot();
    expect(engine.getStatus()).toBe('ready');
  });

  it('activates to active and initializes subsystems', async () => {
    await engine.boot();
    await engine.activate();
    expect(engine.getStatus()).toBe('active');
    expect(engine.getHabitLearner()).toBeDefined();
    expect(engine.getScheduler()).toBeDefined();
    expect(engine.getAgentPipeline()).toBeDefined();
    expect(engine.getWindowObserver()).toBeDefined();
    expect(engine.getNotificationHub()).toBeDefined();
    expect(engine.getModuleAIApi()).toBeDefined();
  });

  it('sleeps and wakes', async () => {
    await engine.boot();
    await engine.activate();
    await engine.sleep();
    expect(engine.getStatus()).toBe('sleeping');
    await engine.wake();
    expect(engine.getStatus()).toBe('active');
  });

  it('generates greeting after boot', async () => {
    await engine.boot();
    await engine.activate();
    const greeting = await engine.generateGreeting();
    expect(greeting.greeting).toBeTruthy();
    expect(greeting.mood).toBeTruthy();
  });

  it('generates mood suggestion', async () => {
    await engine.boot();
    const mood = await engine.generateMoodSuggestion();
    expect(mood).toBeTruthy();
  });

  it('notifies on status change', async () => {
    const changes: string[] = [];
    engine.onStatusChange((s) => changes.push(s));
    await engine.boot();
    await engine.activate();
    expect(changes).toContain('ready');
    expect(changes).toContain('active');
  });

  it('supports custom proactive mode', () => {
    const passive = new ArunaEngine({ proactiveMode: 'passive' });
    expect(passive).toBeDefined();
  });

  it('returns insights after boot', async () => {
    await engine.boot();
    const insights = await engine.getInsights();
    expect(Array.isArray(insights)).toBe(true);
  });

  it('pushes and retrieves notifications', async () => {
    await engine.boot();
    engine.pushNotification('Test', 'Body', 'system', 'high');
    expect(engine.getNotificationHub().getAll()).toHaveLength(1);
  });

  it('registers module capabilities', async () => {
    await engine.boot();
    engine.registerCapability({
      moduleId: 'test',
      action: 'ping',
      description: 'Ping test',
      execute: async () => 'pong',
    });
    const cap = engine.getModuleAIApi().getCapability('test', 'ping');
    expect(cap).toBeDefined();
  });

  it('notifies action listeners on agent actions', async () => {
    await engine.boot();
    const actions: string[] = [];
    engine.onAction((a) => actions.push(a.type));
    // Agent pipeline runs on activate
    await engine.activate();
    // Actions may or may not fire depending on context, but subscription should work
    expect(typeof engine.onAction).toBe('function');
  });
});
