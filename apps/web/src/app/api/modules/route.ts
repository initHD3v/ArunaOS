import { NextRequest, NextResponse } from 'next/server';
import { RegistryStore } from '@arunaos/registry-api';
import type { RegistrySearchParams } from '@arunaos/registry-api';

const store = new RegistryStore();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await store.search({
    query: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    sort: (searchParams.get('sort') as RegistrySearchParams['sort']) || 'downloads',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '20', 10),
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { modules: requestedUpdates } = body as {
    modules: Array<{ id: string; version: string }>;
  };

  if (!Array.isArray(requestedUpdates)) {
    return NextResponse.json({ error: 'Expected { modules: [{ id, version }] }' }, { status: 400 });
  }

  const updates = await store.checkUpdates(requestedUpdates);
  return NextResponse.json(updates);
}
