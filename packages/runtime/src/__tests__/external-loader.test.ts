import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExternalModuleLoader } from '../external-loader';
import { ModuleRegistry } from '../registry';
import { ModulePermissions } from '../permissions';
import type { ExternalModuleManifest } from '../types';

const FAKE_CHECKSUM = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

const makeValidManifest = (overrides: Partial<ExternalModuleManifest> = {}): Record<string, unknown> => ({
  id: 'my.external.mod',
  name: 'My External Module',
  version: '1.0.0',
  description: 'A test external module with enough chars',
  icon: 'https://example.com/icon.png',
  entry: './bundle.js',
  type: 'external',
  checksum: FAKE_CHECKSUM,
  manifestUrl: 'https://example.com/module.json',
  ...overrides,
});

const makeBundleCode = () => 'export default { mount: () => {} };';

let mockFetch: ReturnType<typeof vi.fn>;
let mockDigest: ReturnType<typeof vi.fn>;

const mockFetchOnce = (url: string, body: unknown, ok = true) => {
  return mockFetch.mockImplementationOnce(async (input: RequestInfo | URL) => {
    expect(input.toString()).toBe(url);
    return {
      ok,
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      status: ok ? 200 : 400,
    } as Response;
  });
};

const mockSha256 = (hex: string) => {
  mockDigest.mockResolvedValueOnce(
    new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16))).buffer as ArrayBuffer,
  );
};

describe('ExternalModuleLoader', () => {
  let registry: ModuleRegistry;
  let permissions: ModulePermissions;
  let loader: ExternalModuleLoader;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockDigest = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('crypto', { subtle: { digest: mockDigest } });

    registry = new ModuleRegistry();
    permissions = new ModulePermissions();
    loader = new ExternalModuleLoader(registry, permissions);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Manifest Validation ──

  describe('validateManifest', () => {
    it('should validate a correct manifest', () => {
      const manifest = makeValidManifest();
      const result = loader.validateManifest(manifest);
      expect(result.id).toBe('my.external.mod');
      expect(result.type).toBe('external');
      expect(result.version).toBe('1.0.0');
    });

    it('should reject non-object', () => {
      expect(() => loader.validateManifest(null)).toThrow('Manifest must be an object');
      expect(() => loader.validateManifest('string')).toThrow('Manifest must be an object');
    });

    it('should reject invalid id', () => {
      expect(() => loader.validateManifest(makeValidManifest({ id: 'AB' }))).toThrow('Invalid module id');
      expect(() => loader.validateManifest(makeValidManifest({ id: '' }))).toThrow('Invalid module id');
      expect(() => loader.validateManifest(makeValidManifest({ id: 'a b' }))).toThrow('Invalid module id');
    });

    it('should reject short name', () => {
      expect(() => loader.validateManifest(makeValidManifest({ name: 'X' }))).toThrow(
        'Module name must be a string with at least 2 characters',
      );
    });

    it('should reject invalid semver', () => {
      expect(() => loader.validateManifest(makeValidManifest({ version: '1.0' }))).toThrow(
        'must be semver',
      );
      expect(() => loader.validateManifest(makeValidManifest({ version: 'abc' }))).toThrow(
        'must be semver',
      );
    });

    it('should reject short description', () => {
      expect(() => loader.validateManifest(makeValidManifest({ description: 'Hi' }))).toThrow(
        'at least 5 characters',
      );
    });

    it('should reject invalid checksum', () => {
      expect(() =>
        loader.validateManifest(makeValidManifest({ checksum: 'not-hex' })),
      ).toThrow('Checksum must be a 64-character lowercase hex string');
    });

    it('should reject entry not starting with ./', () => {
      expect(() => loader.validateManifest(makeValidManifest({ entry: 'bundle.js' }))).toThrow(
        "Entry must be a relative path starting with './'",
      );
    });

    it('should reject missing manifestUrl', () => {
      expect(() => loader.validateManifest(makeValidManifest({ manifestUrl: '' }))).toThrow(
        'manifestUrl must be a valid URL',
      );
    });

    it('should reject unknown permission', () => {
      expect(() =>
        loader.validateManifest(makeValidManifest({ permissions: ['unknown:perm'] })),
      ).toThrow("Unknown permission 'unknown:perm'");
    });

    it('should accept known permissions', () => {
      const manifest = loader.validateManifest(
        makeValidManifest({ permissions: ['storage:read', 'network', 'camera'] }),
      );
      expect(manifest.permissions).toEqual(['storage:read', 'network', 'camera']);
    });

    it('should accept optional fields', () => {
      const manifest = loader.validateManifest(
        makeValidManifest({
          author: 'Test Author',
          homepage: 'https://example.com',
          categories: ['tools', 'games'],
          registry: 'https://registry.example.com',
        }),
      );
      expect(manifest.author).toBe('Test Author');
      expect(manifest.homepage).toBe('https://example.com');
      expect(manifest.categories).toEqual(['tools', 'games']);
    });
  });

  // ── Install from URL ──

  describe('installFromUrl', () => {
    const manifestUrl = 'https://example.com/module.json';

    it('should fetch manifest, verify integrity, and register', async () => {
      const manifest = makeValidManifest();
      const code = makeBundleCode();
      const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

      mockFetchOnce(manifestUrl, manifest);
      mockFetchOnce('./bundle.js', code);
      mockSha256(hash);
      manifest.checksum = hash;

      const result = await loader.installFromUrl(manifestUrl);

      expect(result.entry.id).toBe('my.external.mod');
      expect(result.code).toBe(code);
      expect(result.entry.bundleSize).toBeGreaterThan(0);

      const regEntry = registry.get('my.external.mod');
      expect(regEntry).not.toBeNull();
      expect(regEntry!.manifest.type).toBe('external');
    });

    it('should throw on already installed module', async () => {
      const manifest = makeValidManifest();
      const code = makeBundleCode();
      const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

      mockFetchOnce(manifestUrl, { ...manifest, checksum: hash });
      mockFetchOnce('./bundle.js', code);
      mockSha256(hash);
      manifest.checksum = hash;

      await loader.installFromUrl(manifestUrl);

      // Second install: throw early before bundle fetch (entries check)
      mockFetchOnce(manifestUrl, { ...manifest, checksum: hash });
      await expect(loader.installFromUrl(manifestUrl)).rejects.toThrow('already installed');
    });

    it('should throw on id conflict with existing registry entry', async () => {
      registry.register({
        id: 'my.external.mod',
        name: 'Builtin',
        version: '1.0.0',
        description: 'A built-in module with enough chars',
        icon: 'test',
        entry: './index',
        type: 'builtin',
      });

      const manifest = makeValidManifest();
      const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';
      manifest.checksum = hash;

      // Need to mock the manifest fetch even though it will throw after validation
      mockFetchOnce(manifestUrl, { ...manifest, checksum: hash });
      await expect(loader.installFromUrl(manifestUrl)).rejects.toThrow(
        'already exists in registry',
      );
    });

    it('should throw on integrity mismatch', async () => {
      const manifest = makeValidManifest();
      const code = makeBundleCode();

      mockFetchOnce(manifestUrl, manifest);
      mockFetchOnce('./bundle.js', code);
      // Return wrong hash
      mockSha256('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      await expect(loader.installFromUrl(manifestUrl)).rejects.toThrow('Integrity check failed');
    });

    it('should retry on network failure', async () => {
      const manifest = makeValidManifest();
      const code = makeBundleCode();
      const hash = manifest.checksum!;

      // Must use mockImplementation to handle multiple calls
      mockFetch.mockReset();
      const fetchCalls: string[] = [];
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        fetchCalls.push(input.toString());
        if (input.toString() === manifestUrl) {
          return {
            ok: true,
            json: async () => manifest,
            text: async () => JSON.stringify(manifest),
            status: 200,
          } as Response;
        }
        throw new Error('Network error');
      });
      mockDigest.mockResolvedValue(
        new Uint8Array(hash.match(/.{2}/g)!.map((b) => parseInt(b, 16))).buffer as ArrayBuffer,
      );

      await expect(loader.installFromUrl(manifestUrl)).rejects.toThrow('Network error');
      // fetchWithRetry should have retried the bundle URL
      expect(fetchCalls.filter((u) => u === './bundle.js').length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Load from Cache ──

  describe('loadFromCache', () => {
    it('should return cached code', async () => {
      const manifest = makeValidManifest();
      const code = makeBundleCode();
      const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

      mockFetchOnce('https://example.com/module.json', { ...manifest, checksum: hash });
      mockFetchOnce('./bundle.js', code);
      mockSha256(hash);
      manifest.checksum = hash;

      await loader.installFromUrl('https://example.com/module.json');
      const cached = await loader.loadFromCache('my.external.mod');
      expect(cached).toBe(code);
    });

    it('should throw if not cached', async () => {
      await expect(loader.loadFromCache('unknown')).rejects.toThrow(
        'not cached',
      );
    });
  });

  // ── Uninstall ──

  describe('uninstall', () => {
    it('should remove module from registry and cache', async () => {
      const manifest = makeValidManifest();
      const code = makeBundleCode();
      const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

      mockFetchOnce('https://example.com/module.json', { ...manifest, checksum: hash });
      mockFetchOnce('./bundle.js', code);
      mockSha256(hash);
      manifest.checksum = hash;

      await loader.installFromUrl('https://example.com/module.json');
      expect(registry.get('my.external.mod')).not.toBeNull();
      expect(loader.getInstalledModules()).toHaveLength(1);

      await loader.uninstall('my.external.mod');

      expect(registry.get('my.external.mod')).toBeNull();
      expect(loader.getInstalledModules()).toHaveLength(0);
    });

    it('should throw for unknown module', async () => {
      await expect(loader.uninstall('unknown')).rejects.toThrow('not installed');
    });
  });

  // ── Update Checks ──

  describe('checkForUpdates', () => {
    it('should return null when up-to-date', async () => {
      await installSampleModule();
      mockFetchOnce('https://example.com/module.json', makeValidManifest());
      const info = await loader.checkForUpdates('my.external.mod');
      expect(info).toBeNull();
    });

    it('should return UpdateInfo when newer version exists', async () => {
      await installSampleModule();
      mockFetchOnce(
        'https://example.com/module.json',
        makeValidManifest({ version: '2.0.0' }),
      );
      const info = await loader.checkForUpdates('my.external.mod');
      expect(info).not.toBeNull();
      expect(info!.currentVersion).toBe('1.0.0');
      expect(info!.latestVersion).toBe('2.0.0');
    });

    it('should throw for unknown module', async () => {
      await expect(loader.checkForUpdates('unknown')).rejects.toThrow('not installed');
    });
  });

  // ── Update ──

  describe('update', () => {
    it('should uninstall old and install new version', async () => {
      await installSampleModule();
      const newManifest = makeValidManifest({ version: '2.0.0' });
      const newCode = 'export default { mount: () => "v2" };';
      const newHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      // First fetch for checkForUpdates, second for installFromUrl
      mockFetchOnce('https://example.com/module.json', { ...newManifest, checksum: newHash });
      mockFetchOnce('https://example.com/module.json', { ...newManifest, checksum: newHash });
      mockFetchOnce('./bundle.js', newCode);
      mockSha256(newHash);
      mockSha256(newHash);

      const result = await loader.update('my.external.mod');
      expect(result.entry.manifest.version).toBe('2.0.0');
    });

    it('should throw if already up-to-date', async () => {
      await installSampleModule();
      mockFetchOnce('https://example.com/module.json', makeValidManifest());
      await expect(loader.update('my.external.mod')).rejects.toThrow('already up-to-date');
    });
  });

  // ── Reinstall ──

  describe('reinstall', () => {
    it('should reinstall from same source', async () => {
      await installSampleModule();
      const code = makeBundleCode();
      const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

      mockFetchOnce('https://example.com/module.json', { ...makeValidManifest(), checksum: hash });
      mockFetchOnce('./bundle.js', code);
      mockSha256(hash);

      const result = await loader.reinstall('my.external.mod');
      expect(result.entry.id).toBe('my.external.mod');
    });
  });

  // ── Integrity Verification ──

  describe('verifyAllIntegrity', () => {
    it('should return valid for correct checksums', async () => {
      await installSampleModule();
      const entry = loader.getInstalledModule('my.external.mod')!;
      const hash = entry.manifest.checksum;
      // Provide a digest mock for verifyAllIntegrity's sha256 call
      mockDigest.mockResolvedValue(
        new Uint8Array(hash.match(/.{2}/g)!.map((b) => parseInt(b, 16))).buffer as ArrayBuffer,
      );

      const results = await loader.verifyAllIntegrity();
      expect(results).toHaveLength(1);
      expect(results[0]!.valid).toBe(true);
    });

    it('should return invalid for tampered code', async () => {
      await installSampleModule();
      const entry = loader.getInstalledModule('my.external.mod')!;
      // Return different hash to simulate tampered code
      mockDigest.mockResolvedValue(
        new Uint8Array(Array(32).fill(0xff)).buffer as ArrayBuffer,
      );

      const results = await loader.verifyAllIntegrity();
      expect(results).toHaveLength(1);
      expect(results[0]!.valid).toBe(false);
    });
  });

  // ── getInstalledModules ──

  describe('getInstalledModules / getInstalledModule', () => {
    it('should list installed modules', async () => {
      expect(loader.getInstalledModules()).toHaveLength(0);
      await installSampleModule();
      expect(loader.getInstalledModules()).toHaveLength(1);
      expect(loader.getInstalledModule('my.external.mod')).not.toBeNull();
      expect(loader.getInstalledModule('unknown')).toBeNull();
    });
  });

  // ── getBundleSize ──

  describe('getBundleSize', () => {
    it('should return bundle size in bytes', async () => {
      await installSampleModule();
      const size = loader.getBundleSize('my.external.mod');
      expect(size).toBeGreaterThan(0);
    });

    it('should return null for uncached module', () => {
      expect(loader.getBundleSize('unknown')).toBeNull();
    });
  });

  // ── Helpers ──

  async function installSampleModule() {
    const manifest = makeValidManifest();
    const code = makeBundleCode();
    const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

    mockFetchOnce('https://example.com/module.json', { ...manifest, checksum: hash });
    mockFetchOnce('./bundle.js', code);
    mockSha256(hash);
    manifest.checksum = hash;

    return loader.installFromUrl('https://example.com/module.json');
  }
});
