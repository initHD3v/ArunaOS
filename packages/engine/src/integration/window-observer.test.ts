import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../memory/memory-store';
import { WindowObserver } from './window-observer';

describe('WindowObserver', () => {
  it('tracks focus changes', () => {
    const store = new InMemoryStore();
    const obs = new WindowObserver(store);

    obs.onFocusChange('files');
    obs.onFocusChange('settings');
    obs.onFocusChange(null);

    expect(obs.getCurrentApp()).toBeNull();
  });

  it('flushes to store', async () => {
    const store = new InMemoryStore();
    const obs = new WindowObserver(store);

    obs.onFocusChange('files');
    obs.onFocusChange('settings');
    await obs.flush();

    const usage = await store.getAppUsage('files', new Date().toISOString().slice(0, 10));
    expect(usage?.appId).toBe('files');
  });
});
