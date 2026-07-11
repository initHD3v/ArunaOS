import { describe, it, expect } from 'vitest';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { createModule } from '../src/create';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'cli-test-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('createModule', () => {
  it('should create a module scaffold', async () => {
    await withTempDir(async (tmpDir) => {
      const targetDir = await createModule({
        name: 'My Test Module',
        dir: tmpDir,
        description: 'A test module',
        permissions: ['storage:read'],
      });

      expect(targetDir).toBe(join(tmpDir, 'my-test-module'));

      // Verify module.json
      const manifestRaw = await readFile(join(targetDir, 'module.json'), 'utf-8');
      const manifest = JSON.parse(manifestRaw);
      expect(manifest.id).toBe('my-test-module');
      expect(manifest.name).toBe('My Test Module');
      expect(manifest.version).toBe('0.1.0');
      expect(manifest.type).toBe('external');
      expect(manifest.permissions).toEqual(['storage:read']);

      // Verify src/index.ts
      const indexSource = await readFile(join(targetDir, 'src', 'index.ts'), 'utf-8');
      expect(indexSource).toContain('mount');
      expect(indexSource).toContain('Module mounted');

      // Verify .gitignore
      const gitignore = await readFile(join(targetDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('dist/');
    });
  });

  it('should sanitize module name to valid id', async () => {
    await withTempDir(async (tmpDir) => {
      const targetDir = await createModule({
        name: 'Hello World! @#$',
        dir: tmpDir,
      });
      const manifestRaw = await readFile(join(targetDir, 'module.json'), 'utf-8');
      const manifest = JSON.parse(manifestRaw);
      expect(manifest.id).toBe('hello-world');
    });
  });

  it('should default description to name + " module"', async () => {
    await withTempDir(async (tmpDir) => {
      const targetDir = await createModule({
        name: 'TestModule',
        dir: tmpDir,
      });
      const manifestRaw = await readFile(join(targetDir, 'module.json'), 'utf-8');
      const manifest = JSON.parse(manifestRaw);
      expect(manifest.description).toBe('TestModule module');
    });
  });

  it('should create with default permissions when not specified', async () => {
    await withTempDir(async (tmpDir) => {
      const targetDir = await createModule({
        name: 'NoPerms',
        dir: tmpDir,
      });
      const manifestRaw = await readFile(join(targetDir, 'module.json'), 'utf-8');
      const manifest = JSON.parse(manifestRaw);
      expect(manifest.permissions).toEqual([]);
    });
  });
});
