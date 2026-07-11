import type { ExternalModuleManifest, ExternalModuleEntry, UpdateInfo } from './types';

export interface RegistrySearchParams {
  query?: string;
  category?: string;
  sort?: 'downloads' | 'rating' | 'updated' | 'name';
  page?: number;
  limit?: number;
}

export interface RegistrySearchResult {
  modules: RegistryModuleInfo[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RegistryModuleInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  author?: string;
  homepage?: string;
  categories: string[];
  downloads: number;
  rating: number;
  verified: boolean;
  updatedAt: string;
}

export interface RegistryManifestResponse {
  manifest: ExternalModuleManifest;
  bundleUrl: string;
}

export class RegistryClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://registry.arunaos.io') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async search(params: RegistrySearchParams = {}): Promise<RegistrySearchResult> {
    const query = new URLSearchParams();
    if (params.query) query.set('q', params.query);
    if (params.category) query.set('category', params.category);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', String(params.page));
    query.set('limit', String(params.limit ?? 20));

    const res = await fetch(`${this.baseUrl}/api/modules?${query}`);
    if (!res.ok) throw new Error(`Registry search failed: ${res.status}`);
    return res.json();
  }

  async getModule(id: string): Promise<RegistryModuleInfo | null> {
    const res = await fetch(`${this.baseUrl}/api/modules/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`);
    return res.json();
  }

  async getModuleManifest(id: string, version?: string): Promise<RegistryManifestResponse> {
    const path = version
      ? `${this.baseUrl}/api/modules/${encodeURIComponent(id)}/versions/${version}`
      : `${this.baseUrl}/api/modules/${encodeURIComponent(id)}/manifest`;
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Registry manifest fetch failed: ${res.status}`);
    return res.json();
  }

  async installModule(id: string, version?: string): Promise<{ entry: ExternalModuleEntry; code: string }> {
    const { manifest, bundleUrl } = await this.getModuleManifest(id, version);

    const bundleRes = await fetch(bundleUrl);
    if (!bundleRes.ok) throw new Error(`Bundle fetch failed: ${bundleRes.status}`);
    const code = await bundleRes.text();

    const now = Date.now();
    const entry: ExternalModuleEntry = {
      id: manifest.id,
      manifest,
      installedAt: now,
      updatedAt: now,
      source: 'registry',
      bundleUrl,
      bundleSize: new TextEncoder().encode(code).length,
    };

    return { entry, code };
  }

  async checkForUpdates(modules: Array<{ id: string; version: string }>): Promise<UpdateInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/modules/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules }),
    });
    if (!res.ok) throw new Error(`Registry update check failed: ${res.status}`);
    return res.json();
  }

  async getCategories(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/modules/categories`);
    if (!res.ok) throw new Error(`Registry categories fetch failed: ${res.status}`);
    return res.json();
  }
}
