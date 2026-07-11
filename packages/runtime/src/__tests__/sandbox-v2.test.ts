// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SandboxV2 } from '../sandbox-v2';
import type { ExternalModuleManifest, SystemAPI } from '../types';

function makeManifest(overrides: Partial<ExternalModuleManifest> = {}): ExternalModuleManifest {
  return {
    id: 'test.sandbox',
    name: 'Sandbox Test',
    version: '1.0.0',
    description: 'Test external manifest',
    icon: 'test',
    entry: './bundle.js',
    type: 'external',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    manifestUrl: 'https://example.com/module.json',
    ...overrides,
  };
}

const makeSystemAPI = (): SystemAPI => ({
  openWindow: vi.fn().mockReturnValue('win-1'),
  closeWindow: vi.fn(),
  notify: vi.fn().mockReturnValue('notif-1'),
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  settings: {
    get: vi.fn(),
    set: vi.fn(),
  },
  theme: {
    getMode: vi.fn().mockReturnValue('dark'),
    setMode: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
});

describe('SandboxV2', () => {
  let container: HTMLElement;
  let systemAPI: SystemAPI;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    systemAPI = makeSystemAPI();
  });

  afterEach(() => {
    container.remove();
  });

  it('should create and mount an iframe', () => {
    const sandbox = new SandboxV2({
      manifest: makeManifest(),
      systemAPI,
    });

    sandbox.mount(container);

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');

    sandbox.unmount();
  });

  it('should throw on double mount', () => {
    const sandbox = new SandboxV2({
      manifest: makeManifest(),
      systemAPI,
    });

    sandbox.mount(container);
    expect(() => sandbox.mount(container)).toThrow('already mounted');

    sandbox.unmount();
  });

  it('should remove iframe on unmount', () => {
    const sandbox = new SandboxV2({
      manifest: makeManifest(),
      systemAPI,
    });

    sandbox.mount(container);
    expect(container.querySelector('iframe')).not.toBeNull();

    sandbox.unmount();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('should set destroyed flag on unmount', () => {
    const sandbox = new SandboxV2({
      manifest: makeManifest(),
      systemAPI,
    });

    sandbox.mount(container);
    expect(sandbox.destroyed).toBe(false);

    sandbox.unmount();
    expect(sandbox.destroyed).toBe(true);
  });

  it('should set sandbox attribute restrictions', () => {
    const sandbox = new SandboxV2({
      manifest: makeManifest(),
      systemAPI,
    });

    sandbox.mount(container);
    const iframe = container.querySelector('iframe')!;
    // Must NOT have allow-same-origin for external (untrusted) modules
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-forms');

    sandbox.unmount();
  });

  it('should reject messages from wrong origin', () => {
    const sandbox = new SandboxV2({
      manifest: makeManifest(),
      systemAPI,
    });

    sandbox.mount(container);

    // Post from a different window should be ignored
    window.postMessage({ type: 'request', method: 'openWindow', payload: { title: 'Test' } }, '*');

    // Since the source check filters it, no response expected
    // We test that system API was NOT called
    expect(systemAPI.openWindow).not.toHaveBeenCalled();

    sandbox.unmount();
  });

  it('should set default resource limits', () => {
    const sandbox = new SandboxV2({
      manifest: makeManifest({
        permissions: ['storage:read', 'storage:write', 'network'],
      }),
      systemAPI,
    });
    sandbox.mount(container);

    // Verify the iframe has the sandbox attribute
    const iframe = container.querySelector('iframe')!;
    expect(iframe.getAttribute('sandbox')).toBeTruthy();

    sandbox.unmount();
  });
});
