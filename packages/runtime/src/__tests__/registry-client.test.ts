import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RegistryClient } from '../registry-client';

describe('RegistryClient', () => {
  let client: RegistryClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    client = new RegistryClient('https://registry.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should search modules', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        modules: [{ id: 'test.mod', name: 'Test', version: '1.0.0', description: 'A module', icon: 'test', categories: [], downloads: 10, rating: 4, verified: false, updatedAt: '2024-01-01' }],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    });

    const result = await client.search({ query: 'test' });
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0]!.id).toBe('test.mod');
    expect(mockFetch).toHaveBeenCalledWith('https://registry.test/api/modules?q=test&limit=20');
  });

  it('should get module by id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test.mod', name: 'Test' }),
    });

    const module = await client.getModule('test.mod');
    expect(module).not.toBeNull();
    expect(module!.id).toBe('test.mod');
  });

  it('should return null for 404', async () => {
    mockFetch.mockResolvedValueOnce({ status: 404, ok: false });

    const module = await client.getModule('nonexistent');
    expect(module).toBeNull();
  });

  it('should get module manifest', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        manifest: { id: 'test.mod', entry: './bundle.js', checksum: 'a'.repeat(64), manifestUrl: '', type: 'external' },
        bundleUrl: 'https://registry.test/bundles/test.js',
      }),
    });

    const result = await client.getModuleManifest('test.mod');
    expect(result.manifest.id).toBe('test.mod');
    expect(result.bundleUrl).toBe('https://registry.test/bundles/test.js');
  });

  it('should fetch bundle during installModule', async () => {
    // Manifest fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        manifest: {
          id: 'test.mod',
          name: 'Test',
          version: '1.0.0',
          description: 'Test module',
          icon: 'test',
          entry: './bundle.js',
          type: 'external',
          checksum: 'a'.repeat(64),
          manifestUrl: 'https://registry.test/manifest.json',
        },
        bundleUrl: 'https://registry.test/bundles/test.js',
      }),
    });
    // Bundle fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'export default {};',
    });

    const result = await client.installModule('test.mod');
    expect(result.entry.id).toBe('test.mod');
    expect(result.code).toBe('export default {};');
    expect(result.entry.source).toBe('registry');
    expect(result.entry.bundleSize).toBeGreaterThan(0);
  });

  it('should check for updates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'test.mod', currentVersion: '1.0.0', latestVersion: '2.0.0', manifestUrl: 'https://registry.test/manifest.json' },
      ],
    });

    const updates = await client.checkForUpdates([{ id: 'test.mod', version: '1.0.0' }]);
    expect(updates).toHaveLength(1);
    expect(updates[0]!.latestVersion).toBe('2.0.0');
  });

  it('should get categories', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ['tools', 'games', 'utilities'],
    });

    const categories = await client.getCategories();
    expect(categories).toContain('tools');
  });
});
