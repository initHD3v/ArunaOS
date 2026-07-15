import { describe, it, expect, beforeEach } from 'vitest';
import { useAIContextStore } from './ai-context.store';

describe('AIContextStore', () => {
  beforeEach(() => {
    useAIContextStore.setState({ quickAsk: { open: false, prompt: '' } });
  });

  it('starts with closed quick ask', () => {
    const state = useAIContextStore.getState();
    expect(state.quickAsk.open).toBe(false);
    expect(state.quickAsk.prompt).toBe('');
  });

  it('askAI with no prompt opens quick ask with empty prompt', () => {
    useAIContextStore.getState().askAI();
    const { open, prompt } = useAIContextStore.getState().quickAsk;
    expect(open).toBe(true);
    expect(prompt).toBe('');
  });

  it('askAI with prompt opens quick ask with that prompt', () => {
    useAIContextStore.getState().askAI('What is the weather?');
    const { open, prompt } = useAIContextStore.getState().quickAsk;
    expect(open).toBe(true);
    expect(prompt).toBe('What is the weather?');
  });

  it('closeQuickAsk resets state', () => {
    useAIContextStore.getState().askAI('test');
    expect(useAIContextStore.getState().quickAsk.open).toBe(true);

    useAIContextStore.getState().closeQuickAsk();
    const { open, prompt } = useAIContextStore.getState().quickAsk;
    expect(open).toBe(false);
    expect(prompt).toBe('');
  });

  it('multiple askAI calls use the latest prompt', () => {
    useAIContextStore.getState().askAI('first');
    useAIContextStore.getState().askAI('second');
    expect(useAIContextStore.getState().quickAsk.prompt).toBe('second');
  });

  it('closeQuickAsk is idempotent', () => {
    useAIContextStore.getState().closeQuickAsk();
    useAIContextStore.getState().closeQuickAsk();
    useAIContextStore.getState().closeQuickAsk();
    expect(useAIContextStore.getState().quickAsk.open).toBe(false);
  });
});
