import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getArunaCore, ArunaCore } from './aruna-core';

describe('ArunaCore', () => {
  let core: ArunaCore;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T10:00:00'));
    core = new ArunaCore();
  });

  afterEach(() => {
    core.destroy();
    vi.useRealTimers();
  });

  it('starts uninitialized', () => {
    expect(core.initialized).toBe(false);
  });

  it('initializes all engines', async () => {
    await core.init();
    expect(core.initialized).toBe(true);
    expect(core.context).toBeTruthy();
    expect(core.memory).toBeTruthy();
    expect(core.personality).toBeTruthy();
    expect(core.intent).toBeTruthy();
    expect(core.tools).toBeTruthy();
    expect(core.state).toBeTruthy();
    expect(core.planner).toBeTruthy();
    expect(core.runtime).toBeTruthy();
    expect(core.learner).toBeTruthy();
    expect(core.reflector).toBeTruthy();
    expect(core.providers).toBeTruthy();
  });

  it('transitions to observing after init', async () => {
    await core.init();
    expect(core.state.current).toBe('observing');
  });

  it('generates daily brief', async () => {
    await core.init();
    const brief = core.generateBrief();
    expect(brief).not.toBeNull();
    expect(brief!.greeting).toContain('Good Morning');
    expect(brief!.timeOfDay).toBe('morning');
  });

  it('processes user input and recognizes intent', async () => {
    await core.init();
    const result = core.processInput('buka files');
    expect(result.intent.type).toBe('open-module');
    expect(result.planId).toBeTruthy();
  });

  it('returns unknown for gibberish with no plan', async () => {
    await core.init();
    const result = core.processInput('asdfghjkl');
    expect(result.intent.type).toBe('unknown');
    expect(result.planId).toBeUndefined();
  });

  it('stores memories', () => {
    const m = core.remember('test', 'short-term');
    expect(m.content).toBe('test');
    const results = core.recall({});
    expect(results).toHaveLength(1);
  });

  it('generates suggestions', async () => {
    await core.init();
    const suggestions = core.generateSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions[0]!.id).toBe('daily-brief');
  });

  it('notifies context change listeners', async () => {
    const listener = vi.fn();
    core.onContextChange(listener);
    await core.init();
    expect(listener).toHaveBeenCalled();
  });

  it('generates daily reflection', async () => {
    await core.init();
    const ref = core.generateDailyReflection();
    expect(ref).not.toBeNull();
    expect(ref!.date).toBe('2026-07-12');
  });

  it('generates productivity summary', async () => {
    await core.init();
    const summary = core.getProductivitySummary();
    expect(summary).not.toBeNull();
    expect(summary!.today).toBeTruthy();
    expect(summary!.streak).toBe(0);
  });

  it('getArunaCore returns singleton', () => {
    const a = getArunaCore();
    const b = getArunaCore();
    expect(a).toBe(b);
  });

  it('destroy resets state', async () => {
    await core.init();
    core.destroy();
    expect(core.initialized).toBe(false);
    expect(core.state.current).toBe('idle');
  });

  it('setMode changes operating mode', () => {
    core.setMode('assist');
    expect(core.mode).toBe('assist');
    core.setMode('act');
    expect(core.mode).toBe('act');
    core.setMode('observe');
    expect(core.mode).toBe('observe');
  });

  it('generates brief with evening suggestion when appropriate', async () => {
    await core.init();
    const suggestions = core.generateSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('processInput creates plan for known intent', async () => {
    await core.init();
    const result = core.processInput('buat task belajar rust');
    expect(result.intent.type).toBe('create-task');
    expect(result.planId).toBeTruthy();
  });

  it('onBrief registers and fires callback', async () => {
    await core.init();
    const fn = vi.fn();
    const unsub = core.onBrief(fn);
    core.generateBrief();
    expect(fn).toHaveBeenCalled();
    unsub();
  });

  it('init with container connects runtime controller', async () => {
    const mockGet = vi.fn().mockReturnValue(undefined);
    await core.init({ get: mockGet });
    expect(core.runtime.bridge.status).toBe('connected');
  });

  it('init is idempotent', async () => {
    await core.init();
    await core.init();
    expect(core.initialized).toBe(true);
  });

  it('provides openModule via container', async () => {
    const openMock = vi.fn();
    const mockGet = vi.fn().mockImplementation((name: string) => {
      if (name === 'moduleWindow') return { openModule: openMock };
      return undefined;
    });
    await core.init({ get: mockGet });
    expect(openMock).not.toHaveBeenCalled();
  });
});
