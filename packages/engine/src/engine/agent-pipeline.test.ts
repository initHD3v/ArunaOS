import { describe, it, expect, vi } from 'vitest';
import { Actor } from './agent-pipeline';
import type { AgentAction } from './agent-pipeline';

describe('Actor', () => {
  it('notifies listeners on execute', async () => {
    const actor = new Actor();
    const listener = vi.fn();

    actor.onAction(listener);
    const action: AgentAction = { type: 'greeting', payload: 'Hello', priority: 1 };
    await actor.execute(action);

    expect(listener).toHaveBeenCalledWith(action);
  });
});
