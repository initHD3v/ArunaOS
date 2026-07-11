import { NextRequest, NextResponse } from 'next/server';

interface ExternalModuleManifest {
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
}

const manifests: Record<string, ExternalModuleManifest> = {
  'arunaos.files': {
    id: 'arunaos.files',
    name: 'File Manager',
    version: '1.2.0',
    description: 'Browse, organize, and manage files and directories with a native Finder-like experience.',
    icon: 'folder',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
    manifestUrl: '/api/modules/arunaos.files/manifest',
    updatedAt: '2026-06-15T10:00:00Z',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/files',
    categories: ['utilities', 'tools'],
    permissions: ['storage:read', 'storage:write'],
  },
  'arunaos.settings': {
    id: 'arunaos.settings',
    name: 'System Settings',
    version: '2.0.1',
    description: 'Configure system preferences, appearance, security, and keyboard shortcuts.',
    icon: 'settings',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    manifestUrl: '/api/modules/arunaos.settings/manifest',
    updatedAt: '2026-07-01T08:00:00Z',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/settings',
    categories: ['utilities', 'tools'],
    permissions: [],
  },
  'arunaos.astat': {
    id: 'arunaos.astat',
    name: 'System Monitor',
    version: '1.1.3',
    description: 'Real-time system resource monitoring — CPU, memory, network, and process tracking.',
    icon: 'activity',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
    manifestUrl: '/api/modules/arunaos.astat/manifest',
    updatedAt: '2026-06-20T14:30:00Z',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/astat',
    categories: ['tools', 'development'],
    permissions: ['notification'],
  },
  'arunaos.camera': {
    id: 'arunaos.camera',
    name: 'Camera',
    version: '1.0.2',
    description: 'Capture photos and record video using your device camera with filters and effects.',
    icon: 'camera',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
    manifestUrl: '/api/modules/arunaos.camera/manifest',
    updatedAt: '2026-05-10T12:00:00Z',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/camera',
    categories: ['media'],
    permissions: ['camera'],
  },
  'arunaos.ai': {
    id: 'arunaos.ai',
    name: 'AI Chat',
    version: '2.3.0',
    description: 'Conversational AI assistant with context-aware replies, code generation, and image analysis.',
    icon: 'sparkles',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
    manifestUrl: '/api/modules/arunaos.ai/manifest',
    updatedAt: '2026-07-05T16:00:00Z',
    author: 'ArunaOS Team',
    homepage: 'https://arunaos.io/modules/ai',
    categories: ['tools', 'productivity'],
    permissions: ['network'],
  },
  'net.pixelpaint': {
    id: 'net.pixelpaint',
    name: 'Pixel Paint',
    version: '0.9.0',
    description: 'A lightweight pixel art editor with layers, palettes, and export to PNG/GIF.',
    icon: 'brush',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
    manifestUrl: '/api/modules/net.pixelpaint/manifest',
    updatedAt: '2026-06-28T09:00:00Z',
    author: 'PixelWorks',
    homepage: 'https://pixelpaint.net',
    categories: ['media', 'utilities'],
    permissions: ['storage:write'],
  },
  'com.minesweeper': {
    id: 'com.minesweeper',
    name: 'Minesweeper',
    version: '1.0.0',
    description: 'Classic minesweeper puzzle game with difficulty levels, leaderboards, and themes.',
    icon: 'bomb',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
    manifestUrl: '/api/modules/com.minesweeper/manifest',
    updatedAt: '2026-04-15T11:00:00Z',
    author: 'RetroGames',
    homepage: 'https://retrogames.example.com',
    categories: ['games'],
    permissions: [],
  },
  'com.codeedit': {
    id: 'com.codeedit',
    name: 'Code Editor',
    version: '1.5.2',
    description: 'Lightweight code editor with syntax highlighting, file tree, and integrated terminal.',
    icon: 'code',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
    manifestUrl: '/api/modules/com.codeedit/manifest',
    updatedAt: '2026-07-02T13:00:00Z',
    author: 'DevTools Inc.',
    homepage: 'https://codeedit.example.com',
    categories: ['development', 'tools'],
    permissions: ['storage:read', 'storage:write', 'clipboard:read', 'clipboard:write'],
  },
  'org.taskflow': {
    id: 'org.taskflow',
    name: 'TaskFlow',
    version: '2.1.0',
    description: 'Kanban-style project management with drag-and-drop, due dates, and team collaboration.',
    icon: 'checklist',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
    manifestUrl: '/api/modules/org.taskflow/manifest',
    updatedAt: '2026-06-22T15:00:00Z',
    author: 'FlowLabs',
    homepage: 'https://taskflow.example.com',
    categories: ['productivity'],
    permissions: ['notification', 'storage:read', 'storage:write'],
  },
  'io.mediaplayer': {
    id: 'io.mediaplayer',
    name: 'Media Player',
    version: '3.0.1',
    description: 'Play audio and video files with playlist management, equalizer, and subtitle support.',
    icon: 'music',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e',
    manifestUrl: '/api/modules/io.mediaplayer/manifest',
    updatedAt: '2026-07-03T10:00:00Z',
    author: 'MediaCore',
    homepage: 'https://mediaplayer.example.com',
    categories: ['media'],
    permissions: [],
  },
  'com.sudoku': {
    id: 'com.sudoku',
    name: 'Sudoku',
    version: '1.2.1',
    description: 'Classic sudoku puzzle game with daily challenges, hints, and multiple difficulty modes.',
    icon: 'grid',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
    manifestUrl: '/api/modules/com.sudoku/manifest',
    updatedAt: '2026-03-10T08:00:00Z',
    author: 'PuzzleMasters',
    homepage: 'https://sudoku.example.com',
    categories: ['games'],
    permissions: [],
  },
  'com.webfetch': {
    id: 'com.webfetch',
    name: 'WebFetch',
    version: '0.8.0',
    description: 'HTTP client for testing APIs with request builder, response viewer, and environment variables.',
    icon: 'globe',
    entry: 'module.js',
    type: 'external',
    checksum: 'sha256-f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a',
    manifestUrl: '/api/modules/com.webfetch/manifest',
    updatedAt: '2026-06-30T12:00:00Z',
    author: 'DevTools Inc.',
    homepage: 'https://webfetch.example.com',
    categories: ['development', 'tools'],
    permissions: ['network'],
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const manifest = manifests[id];

  if (!manifest) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  return NextResponse.json({
    manifest,
    bundleUrl: `https://cdn.arunaos.io/bundles/${id}/${manifest.version}/module.js`,
  });
}
