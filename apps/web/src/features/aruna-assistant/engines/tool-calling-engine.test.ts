import { describe, it, expect, beforeEach } from 'vitest';
import { ToolCallingEngine } from './tool-calling-engine';

describe('ToolCallingEngine', () => {
  let engine: ToolCallingEngine;

  beforeEach(() => {
    engine = new ToolCallingEngine();
  });

  it('has correct name', () => {
    expect(engine.name).toBe('tool-calling');
  });

  it('starts with no tools', () => {
    expect(engine.getTools()).toEqual([]);
  });

  it('registers built-in tools on connect', () => {
    engine.connect({ get: () => undefined });
    const tools = engine.getTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.find((t) => t.id === 'open-module')).toBeTruthy();
    expect(tools.find((t) => t.id === 'search-web')).toBeTruthy();
    expect(tools.find((t) => t.id === 'change-wallpaper')).toBeTruthy();
    expect(tools.find((t) => t.id === 'lock-screen')).toBeTruthy();
  });

  it('executes open-module tool', async () => {
    const openMock = { openModule: async () => {} };
    engine.connect({ get: () => openMock });
    const result = await engine.executeTool('open-module', { target: 'files' });
    expect(result).toBe(true);
  });

  it('returns false for unknown tool', async () => {
    engine.connect({ get: () => undefined });
    const result = await engine.executeTool('nonexistent', {});
    expect(result).toBe(false);
  });

  it('executeIntent handles open-module', async () => {
    const openMock = { openModule: async () => {} };
    engine.connect({ get: () => openMock });
    const response = await engine.executeIntent('open-module', { target: 'settings' });
    expect(response).toContain('Membuka');
  });

  it('executeIntent handles search', async () => {
    engine.connect({ get: () => undefined });
    const response = await engine.executeIntent('search', { query: 'cuaca' });
    expect(response).toContain('Mencari');
  });

  it('executeIntent handles greeting', async () => {
    engine.connect({ get: () => undefined });
    const response = await engine.executeIntent('greeting', {});
    expect(response).toBe('');
  });

  it('executeIntent handles unknown', async () => {
    engine.connect({ get: () => undefined });
    const response = await engine.executeIntent('unknown', {});
    expect(response).toContain('pengembangan');
  });
});
