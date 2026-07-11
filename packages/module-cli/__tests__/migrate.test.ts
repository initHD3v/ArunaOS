import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { migrateModule } from '../src/migrate';

describe('migrateModule', () => {
  let tmpDir: string;
  let sourceDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'arunaos-migrate-test-'));
    sourceDir = join(tmpDir, 'legacy-module');
    mkdirSync(sourceDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('migrates a Phase 4 module with index.tsx entry point', async () => {
    writeFileSync(join(sourceDir, 'index.tsx'), `export function MyModule() { return 'hello'; }\n`);
    writeFileSync(
      join(sourceDir, 'module.config.json'),
      JSON.stringify({
        id: 'com.example.legacy',
        name: 'Legacy Module',
        version: '1.0.0',
        description: 'A legacy module',
        permissions: ['storage:read'],
      }),
    );

    const result = await migrateModule({ sourceDir, dryRun: false });

    expect(result.success).toBe(true);
    expect(result.moduleId).toBe('com.example.legacy');
    expect(result.filesCreated.length).toBeGreaterThanOrEqual(3);
    expect(result.filesCreated.some((f) => f.endsWith('module.json'))).toBe(true);
    expect(result.filesCreated.some((f) => f.endsWith('src/index.ts'))).toBe(true);
    expect(result.filesCreated.some((f) => f.endsWith('dist/bundle.js'))).toBe(true);

    const manifestPath = result.filesCreated.find((f) => f.endsWith('module.json'))!;
    const createdManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(createdManifest.id).toBe('com.example.legacy');
    expect(createdManifest.type).toBe('external');
    expect(createdManifest.checksum).toBeTruthy();
    expect(createdManifest.permissions).toContain('storage:read');
  });

  it('migrates with index.ts entry point', async () => {
    writeFileSync(join(sourceDir, 'index.ts'), `export function Foo() { return 42; }\n`);

    const result = await migrateModule({ sourceDir, dryRun: false });

    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThanOrEqual(3);
  });

  it('dry-run does not write files', async () => {
    writeFileSync(join(sourceDir, 'index.ts'), `export const x = 1;\n`);

    const result = await migrateModule({ sourceDir, dryRun: true });

    expect(result.success).toBe(true);
    expect(result.filesCreated).toHaveLength(0);
  });

  it('reports error when no entry point exists', async () => {
    const result = await migrateModule({ sourceDir, dryRun: false });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('No entry point found (index.tsx or index.ts)');
  });

  it('infers module from directory name when no config exists', async () => {
    writeFileSync(join(sourceDir, 'index.tsx'), `export function App() { return 'app'; }\n`);

    const result = await migrateModule({ sourceDir, dryRun: false });

    expect(result.success).toBe(true);
    expect(result.moduleId).toBe('legacy.legacy-module');
  });
});
