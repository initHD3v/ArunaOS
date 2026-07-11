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
  bundleSize?: number;
  manifestUrl?: string;
}

export interface RegistrySearchParams {
  query?: string;
  category?: string;
  sort?: 'downloads' | 'rating' | 'newest' | 'name';
  page?: number;
  limit?: number;
}

export interface RegistrySearchResult {
  modules: RegistryModuleInfo[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RegistryManifestResponse {
  manifest: {
    id: string;
    name: string;
    version: string;
    description: string;
    icon: string;
    entry: string;
    type: 'system' | 'builtin' | 'external';
    checksum: string;
    manifestUrl: string;
    updatedAt?: string;
    author?: string;
    homepage?: string;
    categories?: string[];
    permissions?: string[];
    signature?: string;
    signaturePublicKey?: string;
  };
  bundleUrl: string;
}

export interface UpdateCheckRequest {
  modules: Array<{ id: string; version: string }>;
}

export interface UpdateCheckResult {
  id: string;
  currentVersion: string;
  latestVersion: string;
  manifestUrl: string;
}

export interface PublishModuleParams {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  entry: string;
  checksum: string;
  manifestUrl?: string;
  bundleUrl: string;
  permissions?: string[];
  author?: string;
  homepage?: string;
  categories?: string[];
  screenshots?: string[];
  changelog?: string;
  bundleSize?: number;
}

export interface SignModuleParams {
  id: string;
  version: string;
  checksum: string;
  manifest: Record<string, unknown>;
}
