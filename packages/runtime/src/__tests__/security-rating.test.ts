import { describe, it, expect } from 'vitest';
import { SecurityRatingSystem } from '../security-rating';
import type { ExternalModuleManifest } from '../types';

const baseManifest = (overrides: Partial<ExternalModuleManifest> = {}): ExternalModuleManifest => ({
  id: 'test.module',
  name: 'Test Module',
  version: '1.0.0',
  description: 'A test module for security rating',
  icon: 'test',
  entry: './bundle.js',
  type: 'external',
  checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  manifestUrl: 'https://registry.arunaos.io/modules/test.json',
  ...overrides,
});

describe('SecurityRatingSystem', () => {
  const analyzer = new SecurityRatingSystem();

  describe('scoreToLevel', () => {
    it('should return trusted for score >= 80', async () => {
      const result = await analyzer.analyze(
        baseManifest({
          permissions: [],
          signature: 'signed',
          author: 'Author',
          homepage: 'https://example.com',
          categories: ['tools'],
        }),
        { checksumVerified: true, source: 'registry' },
      );
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe('trusted');
    });

    it('should return low-risk for score 60-79', async () => {
      // Use fewer good factors to keep it in low-risk range
      const result = await analyzer.analyze(
        baseManifest({
          permissions: ['notification'],
          author: 'Dev',
        }),
        { checksumVerified: true, source: 'registry' },
      );
      // 25 (perms) + 20 (checksum) + 15 (registry) + 5 (author) + 5 (version) + 0 (no sig) = 70
      expect(result.score).toBe(70);
      expect(result.level).toBe('low-risk');
    });

    it('should return medium-risk for score 40-59', async () => {
      const result = await analyzer.analyze(
        baseManifest({
          permissions: ['storage:read', 'storage:write', 'network'],
        }),
        { checksumVerified: true, source: 'registry' },
      );
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
      expect(result.level).toBe('medium-risk');
    });

    it('should return high-risk for score < 40', async () => {
      const result = await analyzer.analyze(
        baseManifest({
          version: '0.0.1',
          permissions: [
            'camera',
            'microphone',
            'geolocation',
            'storage:read',
            'storage:write',
            'network',
          ],
        }),
      );
      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('high-risk');
    });
  });

  describe('permission analysis', () => {
    it('should give 30 for no permissions', async () => {
      const result = await analyzer.analyze(baseManifest({ permissions: [] }));
      const perm = result.breakdown.find((b) => b.category === 'Permissions');
      expect(perm?.score).toBe(30);
      expect(perm?.maxScore).toBe(30);
    });

    it('should deduct for sensitive permissions', async () => {
      const result = await analyzer.analyze(baseManifest({ permissions: ['camera'] }));
      const perm = result.breakdown.find((b) => b.category === 'Permissions');
      expect(perm!.score).toBeLessThan(30);
      expect(result.warnings.some((w) => w.includes('camera'))).toBe(true);
    });

    it('should warn for many permissions', async () => {
      const result = await analyzer.analyze(
        baseManifest({
          permissions: [
            'storage:read',
            'storage:write',
            'network',
            'notification',
            'clipboard:write',
          ],
        }),
      );
      expect(result.warnings.some((w) => w.includes('5 permissions'))).toBe(true);
    });
  });

  describe('checksum analysis', () => {
    it('should give 20 points when verified', async () => {
      const result = await analyzer.analyze(baseManifest(), { checksumVerified: true });
      const cs = result.breakdown.find((b) => b.category === 'Checksum');
      expect(cs?.score).toBe(20);
    });

    it('should give 0 and warn when not verified', async () => {
      const result = await analyzer.analyze(baseManifest());
      const cs = result.breakdown.find((b) => b.category === 'Checksum');
      expect(cs?.score).toBe(0);
      expect(result.warnings.some((w) => w.includes('checksum'))).toBe(true);
    });
  });

  describe('source analysis', () => {
    it('should give 15 points for registry', async () => {
      const result = await analyzer.analyze(baseManifest(), { source: 'registry' });
      const src = result.breakdown.find((b) => b.category === 'Source');
      expect(src?.score).toBe(15);
    });

    it('should give 5 points for URL', async () => {
      const result = await analyzer.analyze(baseManifest(), { source: 'url' });
      const src = result.breakdown.find((b) => b.category === 'Source');
      expect(src?.score).toBe(5);
      expect(result.warnings.some((w) => w.includes('URL'))).toBe(true);
    });
  });

  describe('metadata analysis', () => {
    it('should give full points with complete metadata', async () => {
      const result = await analyzer.analyze(
        baseManifest({
          author: 'Dev',
          homepage: 'https://example.com',
          categories: ['tools', 'utilities'],
        }),
      );
      const meta = result.breakdown.find((b) => b.category === 'Metadata');
      expect(meta?.score).toBe(15);
    });

    it('should give partial points for incomplete metadata', async () => {
      const result = await analyzer.analyze(baseManifest({}));
      const meta = result.breakdown.find((b) => b.category === 'Metadata');
      expect(meta!.score).toBeLessThan(15);
    });

    it('should warn when metadata is incomplete', async () => {
      const result = await analyzer.analyze(baseManifest({}));
      expect(result.warnings.some((w) => w.includes('metadata'))).toBe(true);
    });
  });

  describe('version analysis', () => {
    it('should give low score for v0.x', async () => {
      const result = await analyzer.analyze(baseManifest({ version: '0.1.0' }));
      const ver = result.breakdown.find((b) => b.category === 'Version');
      expect(ver!.score).toBeLessThanOrEqual(5);
    });

    it('should give higher score for stable versions', async () => {
      const result2 = await analyzer.analyze(baseManifest({ version: '2.0.0' }));
      const ver2 = result2.breakdown.find((b) => b.category === 'Version');
      expect(ver2!.score).toBeGreaterThanOrEqual(5);
    });
  });

  describe('signature analysis', () => {
    it('should give 5 points when signature present without public key', async () => {
      const result = await analyzer.analyze(baseManifest({ signature: 'abc123' }));
      const sig = result.breakdown.find((b) => b.category === 'Signature');
      expect(sig?.score).toBe(5);
    });

    it('should give 0 when no signature', async () => {
      const result = await analyzer.analyze(baseManifest());
      const sig = result.breakdown.find((b) => b.category === 'Signature');
      expect(sig?.score).toBe(0);
    });
  });

  describe('warnings', () => {
    it('should return multiple warnings for risky module', async () => {
      const result = await analyzer.analyze(
        baseManifest({
          version: '0.0.1',
          permissions: ['camera', 'microphone', 'geolocation', 'network'],
        }),
        { source: 'url' },
      );
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });
  });
});
