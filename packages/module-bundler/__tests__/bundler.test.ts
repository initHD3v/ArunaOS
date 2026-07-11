import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { buildModule, validateBuild } from '../src/index';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'bundler-test-'));
  try {
    return await fn(dir);
  } finally {
    await mkdir(dir, { recursive: true }).catch(() => {});
  }
}

describe('Module Bundler', () => {
  describe('buildModule', () => {
    it('should bundle a simple module and generate checksum', async () => {
      await withTempDir(async (tmpDir) => {
        const srcDir = join(tmpDir, 'src');
        const outDir = join(tmpDir, 'dist');
        await mkdir(srcDir, { recursive: true });

        // Sample module source
        await writeFile(
          join(srcDir, 'module.json'),
          JSON.stringify({
            id: 'test.hello',
            name: 'Hello World',
            version: '1.0.0',
            description: 'A test module for bundling',
            icon: 'hello',
            entry: './index.ts',
            permissions: ['storage:read'],
          }),
        );

        await writeFile(
          join(srcDir, 'index.ts'),
          `export default {
  mount: () => "hello",
  api: {
    greet: (name: string) => \`Hello \${name}!\`,
  },
};`,
        );

        const result = await buildModule({
          entry: join(srcDir, 'index.ts'),
          outDir,
          manifestPath: join(srcDir, 'module.json'),
          minify: false,
        });

        expect(result.manifest.id).toBe('test.hello');
        expect(result.manifest.version).toBe('1.0.0');
        expect(result.manifest.type).toBe('external');
        expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
        expect(result.manifest.checksum).toBe(result.checksum);
        expect(result.bundleSize).toBeGreaterThan(0);

        // Verify bundle was written
        const bundleContent = await readFile(result.bundlePath, 'utf-8');
        expect(bundleContent).toContain('hello');
        expect(bundleContent).toContain('greet');

        // Verify manifest was written
        const manifestRaw = await readFile(result.manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestRaw);
        expect(manifest.entry).toBe('./bundle.js');
        expect(manifest.checksum).toBe(result.checksum);
      });
    });

    it('should minify by default', async () => {
      await withTempDir(async (tmpDir) => {
        const srcDir = join(tmpDir, 'src');
        const outDir = join(tmpDir, 'dist');
        await mkdir(srcDir, { recursive: true });

        await writeFile(
          join(srcDir, 'module.json'),
          JSON.stringify({
            id: 'test.minify',
            name: 'Minify Test',
            version: '0.1.0',
            description: 'Testing minification support',
            icon: 'test',
            entry: './index.ts',
          }),
        );

        await writeFile(
          join(srcDir, 'index.ts'),
          `const greeting = "world"; export default greeting;`,
        );

        const unminifiedDir = join(tmpDir, 'dist-unminified');
        const unminified = await buildModule({
          entry: join(srcDir, 'index.ts'),
          outDir: unminifiedDir,
          manifestPath: join(srcDir, 'module.json'),
          minify: false,
        });

        const minifiedDir = join(tmpDir, 'dist-minified');
        const minified = await buildModule({
          entry: join(srcDir, 'index.ts'),
          outDir: minifiedDir,
          manifestPath: join(srcDir, 'module.json'),
          minify: true,
        });

        expect(minified.bundleSize).toBeLessThan(unminified.bundleSize);
      });
    });

    it('should reject invalid manifest', async () => {
      await withTempDir(async (tmpDir) => {
        const srcDir = join(tmpDir, 'src');
        const outDir = join(tmpDir, 'dist');
        await mkdir(srcDir, { recursive: true });

        await writeFile(
          join(srcDir, 'module.json'),
          JSON.stringify({
            id: 'bad',
            name: '',
            version: 'abc',
            description: '',
            icon: '',
            entry: '',
          }),
        );

        await writeFile(join(srcDir, 'index.ts'), `export default {};`);

        await expect(
          buildModule({
            entry: join(srcDir, 'index.ts'),
            outDir,
            manifestPath: join(srcDir, 'module.json'),
          }),
        ).rejects.toThrow();
      });
    });

    it('should reject unknown permissions', async () => {
      await withTempDir(async (tmpDir) => {
        const srcDir = join(tmpDir, 'src');
        const outDir = join(tmpDir, 'dist');
        await mkdir(srcDir, { recursive: true });

        await writeFile(
          join(srcDir, 'module.json'),
          JSON.stringify({
            id: 'test.badperm',
            name: 'Bad Perm',
            version: '1.0.0',
            description: 'Has invalid permission',
            icon: 'test',
            entry: './index.ts',
            permissions: ['invalid:perm'],
          }),
        );

        await writeFile(join(srcDir, 'index.ts'), `export default {};`);

        await expect(
          buildModule({
            entry: join(srcDir, 'index.ts'),
            outDir,
            manifestPath: join(srcDir, 'module.json'),
          }),
        ).rejects.toThrow('Unknown permission');
      });
    });
  });

  describe('validateBuild', () => {
    it('should validate a correct build output', async () => {
      await withTempDir(async (tmpDir) => {
        const srcDir = join(tmpDir, 'src');
        const outDir = join(tmpDir, 'dist');
        await mkdir(srcDir, { recursive: true });

        await writeFile(
          join(srcDir, 'module.json'),
          JSON.stringify({
            id: 'test.validate',
            name: 'Validate Test',
            version: '1.0.0',
            description: 'Testing validation',
            icon: 'test',
            entry: './index.ts',
          }),
        );

        await writeFile(join(srcDir, 'index.ts'), `export default {};`);

        const result = await buildModule({
          entry: join(srcDir, 'index.ts'),
          outDir,
          manifestPath: join(srcDir, 'module.json'),
        });

        const validation = await validateBuild({ bundleDir: outDir });
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.manifest?.id).toBe('test.validate');
      });
    });

    it('should detect missing bundle file', async () => {
      await withTempDir(async (tmpDir) => {
        await writeFile(
          join(tmpDir, 'module.json'),
          JSON.stringify({
            id: 'test.missing',
            name: 'Missing Bundle',
            version: '1.0.0',
            description: 'Bundle file is missing',
            icon: 'test',
            entry: './nonexistent.js',
            checksum: 'a'.repeat(64),
            type: 'external',
          }),
        );

        const validation = await validateBuild({ bundleDir: tmpDir });
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes('not found'))).toBe(true);
      });
    });

    it('should detect checksum mismatch', async () => {
      await withTempDir(async (tmpDir) => {
        await writeFile(
          join(tmpDir, 'module.json'),
          JSON.stringify({
            id: 'test.mismatch',
            name: 'Checksum Mismatch',
            version: '1.0.0',
            description: 'Wrong checksum',
            icon: 'test',
            entry: './bundle.js',
            checksum: 'f'.repeat(64),
            type: 'external',
          }),
        );

        await writeFile(join(tmpDir, 'bundle.js'), 'export const x = 1;');

        const validation = await validateBuild({ bundleDir: tmpDir });
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes('Checksum mismatch'))).toBe(true);
      });
    });
  });
});
