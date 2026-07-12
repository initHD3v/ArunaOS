import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface SavedConfig {
  providers: Array<{
    type: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }>;
  createdAt: number;
}

const configStore = new Map<string, SavedConfig>();

const CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [id, config] of configStore) {
    if (now - config.createdAt > 1000 * 60 * 60 * 24) {
      configStore.delete(id);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers, sessionId } = body as {
      providers?: Array<{ type: string; apiKey?: string; baseUrl?: string; model?: string }>;
      sessionId?: string;
    };

    if (!providers || !Array.isArray(providers)) {
      return NextResponse.json({ error: 'providers array is required' }, { status: 400 });
    }

    cleanup();

    const id = sessionId ?? crypto.randomUUID();
    configStore.set(id, { providers, createdAt: Date.now() });

    return NextResponse.json({ sessionId: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ providers: [] });
  }

  const config = configStore.get(sessionId);
  if (!config) {
    return NextResponse.json({ providers: [] });
  }

  return NextResponse.json({ providers: config.providers, sessionId });
}
