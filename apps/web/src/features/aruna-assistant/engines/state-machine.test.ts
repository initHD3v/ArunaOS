import { describe, it, expect, beforeEach } from 'vitest';
import { AssistantStateMachine } from './state-machine';
import type { AssistantState } from './types';

describe('AssistantStateMachine', () => {
  let sm: AssistantStateMachine;

  beforeEach(() => {
    sm = new AssistantStateMachine();
  });

  it('starts in idle state', () => {
    expect(sm.current).toBe('idle');
  });

  it('transitions to observing on init', async () => {
    await sm.init();
    expect(sm.current).toBe('observing');
    expect(sm.history.length).toBe(1);
  });

  it('allows valid transitions', async () => {
    await sm.init();
    expect(sm.canTransition('thinking')).toBe(true);
    expect(sm.canTransition('sleeping')).toBe(true);
    expect(sm.canTransition('idle')).toBe(true);
  });

  it('blocks invalid transitions', async () => {
    await sm.init();
    expect(sm.canTransition('executing')).toBe(false);
    expect(sm.canTransition('speaking')).toBe(false);
  });

  it('performs valid transition', async () => {
    await sm.init();
    const result = await sm.transition('thinking', 'User input detected');
    expect(result).toBe(true);
    expect(sm.current).toBe('thinking');
  });

  it('rejects invalid transition', async () => {
    await sm.init();
    const result = await sm.transition('executing', 'direct');
    expect(result).toBe(false);
    expect(sm.current).toBe('observing');
  });

  it('notifies listeners on state change', async () => {
    await sm.init();
    const changes: Array<{ from: AssistantState; to: AssistantState }> = [];
    sm.onStateChange((from, to) => changes.push({ from, to }));
    await sm.transition('thinking', 'test');
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ from: 'observing', to: 'thinking' });
  });

  it('supports full conversation flow', async () => {
    await sm.init();
    const transitions: AssistantState[] = ['thinking', 'planning', 'executing', 'speaking', 'idle'];
    for (const state of transitions) {
      const ok = await sm.transition(state, 'flow');
      expect(ok).toBe(true);
    }
    expect(sm.current).toBe('idle');
  });

  it('resets to idle and clears history', async () => {
    await sm.init();
    await sm.transition('thinking', 'test');
    sm.reset();
    expect(sm.current).toBe('idle');
    expect(sm.history).toHaveLength(1);
  });

  it('maintains history', async () => {
    await sm.init();
    await sm.transition('thinking', 'input');
    await sm.transition('planning', 'plan');
    expect(sm.history.length).toBe(3);
  });
});
