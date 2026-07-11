import { NextRequest, NextResponse } from 'next/server';

interface ModuleInfo {
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

const modules: ModuleInfo[] = [
  {
    id: 'arunaos.files',
    name: 'File Manager',
    version: '1.2.0',
    description: 'Browse, organize, and manage files and directories with a native Finder-like experience.',
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
    description: 'Real-time system resource monitoring — CPU, memory, network, and process tracking.',
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
    description: 'Capture photos and record video using your device camera with filters and effects.',
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
    description: 'Conversational AI assistant with context-aware replies, code generation, and image analysis.',
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
    description: 'Classic minesweeper puzzle game with difficulty levels, leaderboards, and themes.',
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
    description: 'Lightweight code editor with syntax highlighting, file tree, and integrated terminal.',
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
    description: 'Kanban-style project management with drag-and-drop, due dates, and team collaboration.',
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
    description: 'Play audio and video files with playlist management, equalizer, and subtitle support.',
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
    description: 'Classic sudoku puzzle game with daily challenges, hints, and multiple difficulty modes.',
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
    description: 'HTTP client for testing APIs with request builder, response viewer, and environment variables.',
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const module = modules.find((m) => m.id === id);

  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  return NextResponse.json(module);
}
