import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SandboxV2 } from '../sandbox-v2';
import type { ExternalModuleManifest, SystemAPI } from '../types';

function makeManifest(overrides: Partial<ExternalModuleManifest> = {}): ExternalModuleManifest {
  return {
    id: 'test.module',
    name: 'Test Module',
    version: '1.0.0',
    description: 'A test module for sandbox',
    icon: 'test-icon',
    entry: './index.js',
    type: 'external',
    checksum: 'a'.repeat(64),
    manifestUrl: 'https://example.com/manifest.json',
    permissions: [],
    ...overrides,
  } as ExternalModuleManifest;
}

function buildHTML(bundleCode?: string): string {
  const sandbox = new SandboxV2({
    manifest: makeManifest(),
    systemAPI: {} as SystemAPI,
    bundleCode,
  });
  return (sandbox as unknown as { buildSandboxHTML(): string }).buildSandboxHTML();
}

describe('SandboxV2 security hardening', () => {
  it('generated HTML must not grant same-origin access', () => {
    const html = buildHTML();
    expect(html).not.toContain('allow-same-origin');
  });

  it('pins child-to-parent postMessage target origin', () => {
    const html = buildHTML();
    expect(html).toContain('var PARENT_ORIGIN =');
    expect(html).toContain("source: 'module' }, PARENT_ORIGIN);");
    expect(html).not.toMatch(/lifecycle-result[^)]*'\*'/);
  });

  it('escapes closing script tags inside embedded bundle code', () => {
    const scriptClose = '</' + 'script>';
    const html = buildHTML(`export const s = "before${scriptClose}after";`);
    // The escaped form is present and the raw literal never appears in the payload
    expect(html).toContain('<\\/script');
    expect(html).not.toContain(`"before${scriptClose}after"`);
  });

  it('host validates opaque frame origin before dispatching messages', () => {
    const source = readFileSync(new URL('../sandbox-v2.ts', import.meta.url), 'utf8');
    expect(source).toContain("event.origin !== 'null'");
  });
});

describe('SandboxV2 lifecycle robustness (prdbugfix B1)', () => {
  function makeSandbox(): SandboxV2 {
    return new SandboxV2({
      manifest: {
        id: 'test.module',
        name: 'Test Module',
        version: '1.0.0',
        description: 'A test module for sandbox',
        icon: 'test-icon',
        entry: './index.js',
        type: 'external',
        checksum: 'a'.repeat(64),
        manifestUrl: 'https://example.com/manifest.json',
        permissions: [],
      } as ExternalModuleManifest,
      systemAPI: {} as SystemAPI,
    });
  }

  it('callLifecycle rejects immediately after destroy', async () => {
    const sandbox = makeSandbox();
    (sandbox as unknown as { _destroyed: boolean })._destroyed = true;
    await expect(sandbox.callLifecycle('mount')).rejects.toThrow('Sandbox destroyed');
  });

  it('callLifecycle rejects when the frame is not mounted', async () => {
    await expect(makeSandbox().callLifecycle('mount')).rejects.toThrow('Sandbox not mounted');
  });
});
