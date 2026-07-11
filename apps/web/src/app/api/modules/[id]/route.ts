import { NextRequest, NextResponse } from 'next/server';
import { RegistryStore } from '@arunaos/registry-api';

const store = new RegistryStore();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await store.getModule(id);

  if (!mod) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  return NextResponse.json(mod);
}
