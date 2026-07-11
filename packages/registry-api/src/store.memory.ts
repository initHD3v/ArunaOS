import type {
  RegistryModuleInfo,
  RegistrySearchParams,
  RegistrySearchResult,
  RegistryManifestResponse,
  UpdateCheckResult,
  PublishModuleParams,
} from './types';
import type { IRegistryStore } from './store';

const CATEGORIES = ['tools', 'games', 'utilities', 'productivity', 'media', 'development'] as const;

const MODULES: RegistryModuleInfo[] = [
  {
    id: 'arunaos.files',
    name: 'File Manager',
    version: '1.2.0',
    description:
      'Browse, organize, and manage files and directories with a native Finder-like experience.',
    icon: 'folder',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/files',
    categories: ['utilities', 'tools'],
    downloads: 45230,
    rating: 4.5,
    verified: true,
    updatedAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'arunaos.settings',
    name: 'System Settings',
    version: '2.0.1',
    description: 'Configure system preferences, appearance, security, and keyboard shortcuts.',
    icon: 'settings',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/settings',
    categories: ['utilities', 'tools'],
    downloads: 38920,
    rating: 4.7,
    verified: true,
    updatedAt: '2026-07-01T08:00:00Z',
  },
  {
    id: 'arunaos.astat',
    name: 'System Monitor',
    version: '1.1.3',
    description:
      'Real-time system resource monitoring — CPU, memory, network, and process tracking.',
    icon: 'activity',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/astat',
    categories: ['tools', 'development'],
    downloads: 28450,
    rating: 4.3,
    verified: true,
    updatedAt: '2026-06-20T14:30:00Z',
  },
  {
    id: 'arunaos.camera',
    name: 'Camera',
    version: '1.0.2',
    description:
      'Capture photos and record video using your device camera with filters and effects.',
    icon: 'camera',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/camera',
    categories: ['media'],
    downloads: 32100,
    rating: 4.1,
    verified: true,
    updatedAt: '2026-05-10T12:00:00Z',
  },
  {
    id: 'arunaos.ai',
    name: 'AI Chat',
    version: '2.3.0',
    description:
      'Conversational AI assistant with context-aware replies, code generation, and image analysis.',
    icon: 'sparkles',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/ai',
    categories: ['tools', 'productivity'],
    downloads: 56780,
    rating: 4.8,
    verified: true,
    updatedAt: '2026-07-05T16:00:00Z',
  },
  {
    id: 'net.pixelpaint',
    name: 'Pixel Paint',
    version: '0.9.0',
    description: 'A lightweight pixel art editor with layers, palettes, and export to PNG/GIF.',
    icon: 'brush',
    author: 'PixelWorks',
    homepage: 'https://pixelpaint.net',
    categories: ['media', 'utilities'],
    downloads: 18400,
    rating: 4.4,
    verified: false,
    updatedAt: '2026-06-28T09:00:00Z',
  },
  {
    id: 'com.minesweeper',
    name: 'Minesweeper',
    version: '1.0.0',
    description:
      'Classic minesweeper puzzle game with difficulty levels, leaderboards, and themes.',
    icon: 'bomb',
    author: 'RetroGames',
    homepage: 'https://retrogames.example.com',
    categories: ['games'],
    downloads: 22300,
    rating: 4.6,
    verified: false,
    updatedAt: '2026-04-15T11:00:00Z',
  },
  {
    id: 'com.codeedit',
    name: 'Code Editor',
    version: '1.5.2',
    description:
      'Lightweight code editor with syntax highlighting, file tree, and integrated terminal.',
    icon: 'code',
    author: 'DevTools Inc.',
    homepage: 'https://codeedit.example.com',
    categories: ['development', 'tools'],
    downloads: 41500,
    rating: 4.5,
    verified: true,
    updatedAt: '2026-07-02T13:00:00Z',
  },
  {
    id: 'org.taskflow',
    name: 'TaskFlow',
    version: '2.1.0',
    description:
      'Kanban-style project management with drag-and-drop, due dates, and team collaboration.',
    icon: 'checklist',
    author: 'FlowLabs',
    homepage: 'https://taskflow.example.com',
    categories: ['productivity'],
    downloads: 31200,
    rating: 4.2,
    verified: false,
    updatedAt: '2026-06-22T15:00:00Z',
  },
  {
    id: 'io.mediaplayer',
    name: 'Media Player',
    version: '3.0.1',
    description:
      'Play audio and video files with playlist management, equalizer, and subtitle support.',
    icon: 'music',
    author: 'MediaCore',
    homepage: 'https://mediaplayer.example.com',
    categories: ['media'],
    downloads: 49600,
    rating: 4.3,
    verified: true,
    updatedAt: '2026-07-03T10:00:00Z',
  },
  {
    id: 'com.sudoku',
    name: 'Sudoku',
    version: '1.2.1',
    description:
      'Classic sudoku puzzle game with daily challenges, hints, and multiple difficulty modes.',
    icon: 'grid',
    author: 'PuzzleMasters',
    homepage: 'https://sudoku.example.com',
    categories: ['games'],
    downloads: 15700,
    rating: 4.0,
    verified: false,
    updatedAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 'com.webfetch',
    name: 'WebFetch',
    version: '0.8.0',
    description:
      'HTTP client for testing APIs with request builder, response viewer, and environment variables.',
    icon: 'globe',
    author: 'DevTools Inc.',
    homepage: 'https://webfetch.example.com',
    categories: ['development', 'tools'],
    downloads: 19800,
    rating: 4.1,
    verified: true,
    updatedAt: '2026-06-30T12:00:00Z',
  },
];

const MANIFESTS: Record<string, RegistryManifestResponse> = {
  'arunaos.files': {
    manifest: {
      id: 'arunaos.files',
      name: 'File Manager',
      version: '1.2.0',
      description:
        'Browse, organize, and manage files and directories with a native Finder-like experience.',
      icon: 'folder',
      entry: 'module.js',
      type: 'external',
      checksum: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
      manifestUrl: '/api/modules/arunaos.files/manifest',
      updatedAt: '2026-06-15T10:00:00Z',
      author: 'ArunaOS Team',
      homepage: 'https://arunaos.io/modules/files',
      categories: ['utilities', 'tools'],
      permissions: ['storage:read', 'storage:write'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/arunaos.files/1.2.0/module.js',
  },
  'arunaos.settings': {
    manifest: {
      id: 'arunaos.settings',
      name: 'System Settings',
      version: '2.0.1',
      description: 'Configure system preferences, appearance, security, and keyboard shortcuts.',
      icon: 'settings',
      entry: 'module.js',
      type: 'external',
      checksum: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
      manifestUrl: '/api/modules/arunaos.settings/manifest',
      updatedAt: '2026-07-01T08:00:00Z',
      author: 'ArunaOS Team',
      homepage: 'https://arunaos.io/modules/settings',
      categories: ['utilities', 'tools'],
      permissions: [],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/arunaos.settings/2.0.1/module.js',
  },
  'arunaos.astat': {
    manifest: {
      id: 'arunaos.astat',
      name: 'System Monitor',
      version: '1.1.3',
      description:
        'Real-time system resource monitoring — CPU, memory, network, and process tracking.',
      icon: 'activity',
      entry: 'module.js',
      type: 'external',
      checksum: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
      manifestUrl: '/api/modules/arunaos.astat/manifest',
      updatedAt: '2026-06-20T14:30:00Z',
      author: 'ArunaOS Team',
      homepage: 'https://arunaos.io/modules/astat',
      categories: ['tools', 'development'],
      permissions: ['notification'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/arunaos.astat/1.1.3/module.js',
  },
  'arunaos.camera': {
    manifest: {
      id: 'arunaos.camera',
      name: 'Camera',
      version: '1.0.2',
      description:
        'Capture photos and record video using your device camera with filters and effects.',
      icon: 'camera',
      entry: 'module.js',
      type: 'external',
      checksum: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
      manifestUrl: '/api/modules/arunaos.camera/manifest',
      updatedAt: '2026-05-10T12:00:00Z',
      author: 'ArunaOS Team',
      homepage: 'https://arunaos.io/modules/camera',
      categories: ['media'],
      permissions: ['camera'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/arunaos.camera/1.0.2/module.js',
  },
  'arunaos.ai': {
    manifest: {
      id: 'arunaos.ai',
      name: 'AI Chat',
      version: '2.3.0',
      description:
        'Conversational AI assistant with context-aware replies, code generation, and image analysis.',
      icon: 'sparkles',
      entry: 'module.js',
      type: 'external',
      checksum: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
      manifestUrl: '/api/modules/arunaos.ai/manifest',
      updatedAt: '2026-07-05T16:00:00Z',
      author: 'ArunaOS Team',
      homepage: 'https://arunaos.io/modules/ai',
      categories: ['tools', 'productivity'],
      permissions: ['network'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/arunaos.ai/2.3.0/module.js',
  },
  'net.pixelpaint': {
    manifest: {
      id: 'net.pixelpaint',
      name: 'Pixel Paint',
      version: '0.9.0',
      description: 'A lightweight pixel art editor with layers, palettes, and export to PNG/GIF.',
      icon: 'brush',
      entry: 'module.js',
      type: 'external',
      checksum: 'f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
      manifestUrl: '/api/modules/net.pixelpaint/manifest',
      updatedAt: '2026-06-28T09:00:00Z',
      author: 'PixelWorks',
      homepage: 'https://pixelpaint.net',
      categories: ['media', 'utilities'],
      permissions: ['storage:write'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/net.pixelpaint/0.9.0/module.js',
  },
  'com.minesweeper': {
    manifest: {
      id: 'com.minesweeper',
      name: 'Minesweeper',
      version: '1.0.0',
      description:
        'Classic minesweeper puzzle game with difficulty levels, leaderboards, and themes.',
      icon: 'bomb',
      entry: 'module.js',
      type: 'external',
      checksum: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
      manifestUrl: '/api/modules/com.minesweeper/manifest',
      updatedAt: '2026-04-15T11:00:00Z',
      author: 'RetroGames',
      homepage: 'https://retrogames.example.com',
      categories: ['games'],
      permissions: [],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/com.minesweeper/1.0.0/module.js',
  },
  'com.codeedit': {
    manifest: {
      id: 'com.codeedit',
      name: 'Code Editor',
      version: '1.5.2',
      description:
        'Lightweight code editor with syntax highlighting, file tree, and integrated terminal.',
      icon: 'code',
      entry: 'module.js',
      type: 'external',
      checksum: 'b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
      manifestUrl: '/api/modules/com.codeedit/manifest',
      updatedAt: '2026-07-02T13:00:00Z',
      author: 'DevTools Inc.',
      homepage: 'https://codeedit.example.com',
      categories: ['development', 'tools'],
      permissions: ['storage:read', 'storage:write', 'clipboard:read', 'clipboard:write'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/com.codeedit/1.5.2/module.js',
  },
  'org.taskflow': {
    manifest: {
      id: 'org.taskflow',
      name: 'TaskFlow',
      version: '2.1.0',
      description:
        'Kanban-style project management with drag-and-drop, due dates, and team collaboration.',
      icon: 'checklist',
      entry: 'module.js',
      type: 'external',
      checksum: 'c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
      manifestUrl: '/api/modules/org.taskflow/manifest',
      updatedAt: '2026-06-22T15:00:00Z',
      author: 'FlowLabs',
      homepage: 'https://taskflow.example.com',
      categories: ['productivity'],
      permissions: ['notification', 'storage:read', 'storage:write'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/org.taskflow/2.1.0/module.js',
  },
  'io.mediaplayer': {
    manifest: {
      id: 'io.mediaplayer',
      name: 'Media Player',
      version: '3.0.1',
      description:
        'Play audio and video files with playlist management, equalizer, and subtitle support.',
      icon: 'music',
      entry: 'module.js',
      type: 'external',
      checksum: 'd0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e',
      manifestUrl: '/api/modules/io.mediaplayer/manifest',
      updatedAt: '2026-07-03T10:00:00Z',
      author: 'MediaCore',
      homepage: 'https://mediaplayer.example.com',
      categories: ['media'],
      permissions: [],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/io.mediaplayer/3.0.1/module.js',
  },
  'com.sudoku': {
    manifest: {
      id: 'com.sudoku',
      name: 'Sudoku',
      version: '1.2.1',
      description:
        'Classic sudoku puzzle game with daily challenges, hints, and multiple difficulty modes.',
      icon: 'grid',
      entry: 'module.js',
      type: 'external',
      checksum: 'e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
      manifestUrl: '/api/modules/com.sudoku/manifest',
      updatedAt: '2026-03-10T08:00:00Z',
      author: 'PuzzleMasters',
      homepage: 'https://sudoku.example.com',
      categories: ['games'],
      permissions: [],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/com.sudoku/1.2.1/module.js',
  },
  'com.webfetch': {
    manifest: {
      id: 'com.webfetch',
      name: 'WebFetch',
      version: '0.8.0',
      description:
        'HTTP client for testing APIs with request builder, response viewer, and environment variables.',
      icon: 'globe',
      entry: 'module.js',
      type: 'external',
      checksum: 'f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a',
      manifestUrl: '/api/modules/com.webfetch/manifest',
      updatedAt: '2026-06-30T12:00:00Z',
      author: 'DevTools Inc.',
      homepage: 'https://webfetch.example.com',
      categories: ['development', 'tools'],
      permissions: ['network'],
    },
    bundleUrl: 'https://cdn.arunaos.io/bundles/com.webfetch/0.8.0/module.js',
  },
};

export class MemoryStore implements IRegistryStore {
  private modules = [...MODULES];
  private manifests = new Map(Object.entries(MANIFESTS));

  search(params: RegistrySearchParams): RegistrySearchResult {
    const q = params.query?.toLowerCase() || '';
    const category = params.category?.toLowerCase() || '';
    const sort = params.sort || 'downloads';
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));

    let filtered = this.modules;
    if (q)
      filtered = filtered.filter((m) =>
        [m.name, m.description, m.id].some((f) => f.toLowerCase().includes(q)),
      );
    if (category && (CATEGORIES as readonly string[]).includes(category)) {
      filtered = filtered.filter((m) => m.categories.includes(category));
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.downloads - a.downloads;
      }
    });

    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    return { modules: sorted.slice(start, start + limit), total, page, totalPages };
  }

  getModule(id: string): RegistryModuleInfo | undefined {
    return this.modules.find((m) => m.id === id);
  }

  getManifest(id: string): RegistryManifestResponse | undefined {
    return this.manifests.get(id);
  }

  getCategories(): string[] {
    return [...CATEGORIES];
  }

  checkUpdates(updates: Array<{ id: string; version: string }>): UpdateCheckResult[] {
    return updates
      .map((req) => {
        const entry = this.modules.find((m) => m.id === req.id);
        if (!entry || entry.version === req.version) return null;
        return {
          id: entry.id,
          currentVersion: req.version,
          latestVersion: entry.version,
          manifestUrl: `/api/modules/${encodeURIComponent(entry.id)}/manifest`,
        };
      })
      .filter((r): r is UpdateCheckResult => r !== null);
  }

  async publishModule(params: PublishModuleParams): Promise<{ id: string; version: string }> {
    const existing = this.modules.find((m) => m.id === params.id);
    if (existing && existing.version === params.version) {
      throw new Error(`Module '${params.id}' version ${params.version} already exists`);
    }

    const now = new Date().toISOString();
    const { signModule } = await import('./crypto');
    const signatures = await signModule({
      id: params.id,
      version: params.version,
      checksum: params.checksum,
      manifest: params as unknown as Record<string, unknown>,
    });

    const info: RegistryModuleInfo = {
      id: params.id,
      name: params.name,
      version: params.version,
      description: params.description,
      icon: params.icon ?? 'extension',
      author: params.author,
      homepage: params.homepage,
      categories: params.categories ?? [],
      downloads: 0,
      rating: 0,
      verified: true,
      updatedAt: now,
    };

    if (existing) {
      const idx = this.modules.findIndex((m) => m.id === params.id);
      this.modules[idx] = { ...info, downloads: existing.downloads, rating: existing.rating };
    } else {
      this.modules.push(info);
    }

    this.manifests.set(params.id, {
      manifest: {
        id: params.id,
        name: params.name,
        version: params.version,
        description: params.description,
        icon: params.icon ?? 'extension',
        entry: params.entry,
        type: 'external',
        checksum: params.checksum,
        manifestUrl: params.manifestUrl ?? `/api/modules/${params.id}/manifest`,
        updatedAt: now,
        author: params.author,
        homepage: params.homepage,
        categories: params.categories,
        permissions: params.permissions,
        signature: signatures.signature,
        signaturePublicKey: signatures.publicKey,
      },
      bundleUrl: params.bundleUrl,
    });

    return { id: params.id, version: params.version };
  }

  async incrementDownloads(id: string): Promise<void> {
    const mod = this.modules.find((m) => m.id === id);
    if (mod) mod.downloads++;
  }
}
