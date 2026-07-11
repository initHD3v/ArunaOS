import { NextRequest, NextResponse } from 'next/server';
import { getRegistryStore } from '@arunaos/registry-api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getRegistryStore();
  const manifest = await store.getManifest(id);

  if (!manifest) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  const mod = await store.getModule(id);
  if (mod) await store.incrementDownloads(id);

  return NextResponse.json({
    manifest: manifest.manifest,
    downloadUrl: manifest.bundleUrl,
  });
}
