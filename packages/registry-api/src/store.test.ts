import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from './store.memory';
import { getRegistryStore } from './store';

describe('MemoryStore (In-Memory Registry)', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('searches all modules without params', () => {
    const result = store.search({});
    expect(result.modules.length).toBeGreaterThan(0);
    expect(result.total).toBe(12);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('filters by search query', () => {
    const result = store.search({ query: 'camera' });
    expect(result.modules.length).toBe(1);
    expect(result.modules[0]!.id).toBe('arunaos.camera');
  });

  it('filters by category', () => {
    const result = store.search({ category: 'games' });
    expect(result.modules.every((m) => m.categories.includes('games'))).toBe(true);
    expect(result.modules.length).toBe(2);
  });

  it('sorts by rating', () => {
    const result = store.search({ sort: 'rating' });
    for (let i = 1; i < result.modules.length; i++) {
      expect(result.modules[i]!.rating).toBeLessThanOrEqual(result.modules[i - 1]!.rating);
    }
  });

  it('paginates results', () => {
    const result = store.search({ page: 1, limit: 5 });
    expect(result.modules.length).toBe(5);
    expect(result.total).toBe(12);
    expect(result.totalPages).toBe(3);

    const page2 = store.search({ page: 2, limit: 5 });
    expect(page2.modules.length).toBe(5);
    expect(page2.modules[0]!.id).not.toBe(result.modules[0]!.id);
  });

  it('gets module by id', () => {
    const mod = store.getModule('arunaos.files');
    expect(mod).toBeDefined();
    expect(mod!.name).toBe('File Manager');
  });

  it('returns undefined for unknown module', () => {
    const mod = store.getModule('unknown.module');
    expect(mod).toBeUndefined();
  });

  it('gets manifest by id', () => {
    const manifest = store.getManifest('arunaos.ai');
    expect(manifest).toBeDefined();
    expect(manifest!.manifest.id).toBe('arunaos.ai');
    expect(manifest!.bundleUrl).toContain('cdn.arunaos.io');
  });

  it('returns categories', () => {
    const cats = store.getCategories();
    expect(cats).toContain('tools');
    expect(cats).toContain('games');
    expect(cats.length).toBe(6);
  });

  it('checks for updates', () => {
    const updates = store.checkUpdates([
      { id: 'arunaos.files', version: '1.0.0' },
      { id: 'arunaos.ai', version: '2.3.0' },
    ]);

    expect(updates).toHaveLength(1);
    expect(updates[0]!.id).toBe('arunaos.files');
    expect(updates[0]!.currentVersion).toBe('1.0.0');
    expect(updates[0]!.latestVersion).toBe('1.2.0');
  });

  it('getRegistryStore returns MemoryStore without DATABASE_URL', () => {
    const s = getRegistryStore();
    expect(s).toBeDefined();
  });
});
