import { ModuleRegistry } from './registry';
import { ModulePermissions } from './permissions';
import type { ExternalModuleManifest, ExternalModuleEntry, UpdateInfo, Permission, ModuleWindowConfig } from './types';

const VALID_ID_PATTERN = /^[a-z][a-z0-9._-]{2,64}$/;
const VALID_SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const VALID_CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

export interface ExternalModuleResult {
  entry: ExternalModuleEntry;
  code: string;
}

export class ExternalModuleLoader {
  private registry: ModuleRegistry;
  private permissions: ModulePermissions;
  private entries = new Map<string, ExternalModuleEntry>();
  private codeCache = new Map<string, string>();

  private fetchWithRetry = async (
    url: string,
    retries = 2,
  ): Promise<Response> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) return res;
        lastError = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    throw lastError ?? new Error(`Failed to fetch ${url}: max retries exceeded`);
  };

  constructor(registry: ModuleRegistry, permissions: ModulePermissions) {
    this.registry = registry;
    this.permissions = permissions;
  }

  validateManifest(manifest: unknown): ExternalModuleManifest {
    const m = manifest as Record<string, unknown>;

    if (!m || typeof m !== 'object') {
      throw new Error('Manifest must be an object');
    }

    const id = String(m.id ?? '');
    if (!VALID_ID_PATTERN.test(id)) {
      throw new Error(
        `Invalid module id '${id}': must be 3-64 chars, lowercase, start with a letter, and contain only [a-z0-9._-]`,
      );
    }

    if (typeof m.name !== 'string' || m.name.length < 2) {
      throw new Error('Module name must be a string with at least 2 characters');
    }

    const version = String(m.version ?? '');
    if (!VALID_SEMVER_PATTERN.test(version)) {
      throw new Error(`Invalid version '${version}': must be semver (x.y.z)`);
    }

    if (typeof m.description !== 'string' || m.description.length < 5) {
      throw new Error('Description must be at least 5 characters');
    }

    const icon = String(m.icon ?? '');
    if (!icon.startsWith('http') && icon.length < 2) {
      throw new Error('Icon must be a URL or identifier');
    }

    const entry = String(m.entry ?? '');
    if (!entry || !entry.startsWith('./')) {
      throw new Error(`Entry must be a relative path starting with './'`);
    }

    const checksum = String(m.checksum ?? '');
    if (!VALID_CHECKSUM_PATTERN.test(checksum)) {
      throw new Error('Checksum must be a 64-character lowercase hex string (SHA-256)');
    }

    const manifestUrl = String(m.manifestUrl ?? '');
    if (!manifestUrl.startsWith('http')) {
      throw new Error('manifestUrl must be a valid URL');
    }

    const permissions = Array.isArray(m.permissions)
      ? m.permissions.filter((p: unknown): p is string => typeof p === 'string')
      : [];

    const allowedPermissions = [
      'storage:read', 'storage:write', 'camera', 'microphone',
      'notification', 'clipboard:read', 'clipboard:write', 'network', 'geolocation',
    ];
    for (const p of permissions) {
      if (!allowedPermissions.includes(p)) {
        throw new Error(`Unknown permission '${p}'`);
      }
    }

    return {
      id,
      name: String(m.name),
      version,
      description: String(m.description),
      icon,
      entry,
      type: 'external',
      checksum,
      manifestUrl,
      registry: m.registry ? String(m.registry) : undefined,
      updatedAt: m.updatedAt ? String(m.updatedAt) : undefined,
      signature: m.signature ? String(m.signature) : undefined,
      homepage: m.homepage ? String(m.homepage) : undefined,
      author: m.author ? String(m.author) : undefined,
      categories: Array.isArray(m.categories)
        ? m.categories.map(String)
        : undefined,
      screenshots: Array.isArray(m.screenshots)
        ? m.screenshots.map(String)
        : undefined,
      permissions: permissions as Permission[],
      window: m.window as ModuleWindowConfig | undefined,
      shortcuts: Array.isArray(m.shortcuts)
        ? m.shortcuts.map(String)
        : undefined,
      dependencies: Array.isArray(m.dependencies)
        ? m.dependencies.map(String)
        : undefined,
      api: m.api as Record<string, unknown> | undefined,
    };
  }

  async installFromUrl(
    manifestUrl: string,
    options?: { source?: 'url' | 'registry'; registry?: string },
  ): Promise<ExternalModuleResult> {
    const res = await this.fetchWithRetry(manifestUrl);
    const raw = await res.json();
    const manifest = this.validateManifest(raw);

    if (this.entries.has(manifest.id)) {
      throw new Error(`External module '${manifest.id}' is already installed`);
    }

    if (this.registry.get(manifest.id)) {
      throw new Error(
        `Module '${manifest.id}' already exists in registry (type: ${this.registry.get(manifest.id)!.manifest.type})`,
      );
    }

    const bundleRes = await this.fetchWithRetry(manifest.entry);
    const code = await bundleRes.text();

    const actualHash = await sha256(code);
    if (actualHash !== manifest.checksum) {
      throw new Error(
        `Integrity check failed for '${manifest.id}': expected ${manifest.checksum}, got ${actualHash}`,
      );
    }

    this.permissions.autoGrant(manifest.id);

    this.registry.register(manifest);

    const now = Date.now();
    const entry: ExternalModuleEntry = {
      id: manifest.id,
      manifest,
      installedAt: now,
      updatedAt: now,
      source: options?.source ?? 'url',
      bundleUrl: manifest.entry,
      bundleSize: new TextEncoder().encode(code).length,
    };

    this.entries.set(manifest.id, entry);
    this.codeCache.set(manifest.id, code);

    return { entry, code };
  }

  async loadFromCache(id: string): Promise<string> {
    const code = this.codeCache.get(id);
    if (!code) {
      throw new Error(`Module '${id}' is not cached; call installFromUrl first`);
    }
    return code;
  }

  async uninstall(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`External module '${id}' is not installed`);
    }

    this.registry.unregister(id);
    this.entries.delete(id);
    this.codeCache.delete(id);
  }

  async checkForUpdates(id: string): Promise<UpdateInfo | null> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`External module '${id}' is not installed`);
    }

    const res = await this.fetchWithRetry(entry.manifest.manifestUrl);
    const remoteManifest = this.validateManifest(await res.json());

    if (remoteManifest.version !== entry.manifest.version) {
      return {
        id,
        currentVersion: entry.manifest.version,
        latestVersion: remoteManifest.version,
        manifestUrl: entry.manifest.manifestUrl,
      };
    }

    return null;
  }

  async update(id: string): Promise<ExternalModuleResult> {
    const info = await this.checkForUpdates(id);
    if (!info) {
      throw new Error(`Module '${id}' is already up-to-date`);
    }

    await this.uninstall(id);
    return this.installFromUrl(info.manifestUrl, {
      source: this.entries.get(id)?.source === 'registry' ? 'registry' : 'url',
    });
  }

  async reinstall(id: string): Promise<ExternalModuleResult> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`External module '${id}' is not installed`);
    }
    await this.uninstall(id);
    return this.installFromUrl(entry.manifest.manifestUrl, {
      source: entry.source,
    });
  }

  getInstalledModules(): ExternalModuleEntry[] {
    return Array.from(this.entries.values());
  }

  getInstalledModule(id: string): ExternalModuleEntry | null {
    return this.entries.get(id) ?? null;
  }

  async verifyAllIntegrity(): Promise<
    Array<{ id: string; valid: boolean; error?: string }>
  > {
    const results: Array<{ id: string; valid: boolean; error?: string }> = [];
    for (const [id, code] of this.codeCache) {
      const entry = this.entries.get(id);
      if (!entry) continue;
      try {
        const hash = await sha256(code);
        const valid = hash === entry.manifest.checksum;
        results.push({ id, valid, error: valid ? undefined : 'Checksum mismatch' });
      } catch (err) {
        results.push({
          id,
          valid: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  }

  getBundleSize(id: string): number | null {
    const code = this.codeCache.get(id);
    return code ? new TextEncoder().encode(code).length : null;
  }
}
