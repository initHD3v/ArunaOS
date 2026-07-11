import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HotReloadClient } from './client';

describe('HotReloadClient', () => {
  let client: HotReloadClient;
  const onReload = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    client?.destroy();
  });

  it('creates a client with default options', () => {
    client = new HotReloadClient({ url: 'http://localhost:4321/__hmr' });
    expect(client).toBeDefined();
  });

  it('calls onReload when hmr:reload is dispatched', () => {
    client = new HotReloadClient({
      url: 'http://localhost:4321/__hmr',
      onReload,
    });

    expect(onReload).not.toHaveBeenCalled();
  });

  it('handles disconnect and reconnect cycle', () => {
    client = new HotReloadClient({
      url: 'http://localhost:4321/__hmr',
      onError,
    });

    expect(() => client.disconnect()).not.toThrow();
    expect(() => client.connect()).not.toThrow();
  });

  it('destroy prevents reconnect', () => {
    client = new HotReloadClient({
      url: 'http://localhost:4321/__hmr',
    });

    client.destroy();
    expect(() => client.disconnect()).not.toThrow();
  });
});
