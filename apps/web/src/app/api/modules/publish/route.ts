import { NextRequest, NextResponse } from 'next/server';
import { getRegistryStore } from '@arunaos/registry-api';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.REGISTRY_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const store = await getRegistryStore();

    const result = await store.publishModule({
      id: body.id,
      name: body.name,
      version: body.version,
      description: body.description,
      icon: body.icon,
      entry: body.entry || './dist/bundle.js',
      checksum: body.checksum,
      manifestUrl: body.manifestUrl || `/api/modules/${body.id}/manifest`,
      bundleUrl: body.bundleUrl || `/api/modules/${body.id}/download`,
      permissions: body.permissions,
      author: body.author,
      homepage: body.homepage,
      categories: body.categories,
      screenshots: body.screenshots,
      changelog: body.changelog,
      bundleSize: body.bundleSize,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
