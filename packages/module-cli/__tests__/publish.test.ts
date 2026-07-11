import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { publishModule } from '../src/publish';

describe('publishModule', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'arunaos-publish-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns error when module.json is missing', async () => {
    const result = await publishModule({ dir: tmpDir, dryRun: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain('module.json not found');
  });

  it('returns error when module.json has no id', async () => {
    writeFileSync(join(tmpDir, 'module.json'), JSON.stringify({ name: 'NoID' }));
    const result = await publishModule({ dir: tmpDir, dryRun: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain('id');
  });

  it('dry-run succeeds with valid module.json', async () => {
    writeFileSync(
      join(tmpDir, 'module.json'),
      JSON.stringify({ id: 'com.test.pkg', name: 'Test', version: '1.0.0', description: 'A test' }),
    );

    const result = await publishModule({ dir: tmpDir, dryRun: true });
    expect(result.success).toBe(true);
    expect(result.moduleId).toBe('com.test.pkg');
    expect(result.version).toBe('1.0.0');
    expect(result.url).toContain('com.test.pkg');
  });

  it('fails without API key in non-dry-run mode', async () => {
    writeFileSync(
      join(tmpDir, 'module.json'),
      JSON.stringify({
        id: 'com.test.nokey',
        name: 'NoKey',
        version: '0.1.0',
        description: 'Test',
      }),
    );

    const result = await publishModule({ dir: tmpDir, dryRun: false });
    expect(result.success).toBe(false);
    expect(result.error).toContain('API key');
  });
});
