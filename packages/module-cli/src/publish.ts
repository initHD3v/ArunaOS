import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export interface PublishOptions {
  dir?: string;
  registry?: string;
  apiKey?: string;
  dryRun?: boolean;
}

export interface PublishResult {
  success: boolean;
  moduleId: string;
  version: string;
  url?: string;
  error?: string;
}

async function sha256(data: string): Promise<string> {
  return createHash('sha256').update(data).digest('hex');
}

export async function publishModule(options: PublishOptions): Promise<PublishResult> {
  const sourceDir = resolve(options.dir ?? process.cwd());
  const registry = options.registry ?? 'http://localhost:3000';
  const manifestPath = join(sourceDir, 'module.json');

  if (!existsSync(manifestPath)) {
    return {
      success: false,
      moduleId: '',
      version: '',
      error: `module.json not found in ${sourceDir}`,
    };
  }

  const manifestRaw = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestRaw);

  if (!manifest.id || !manifest.version) {
    return {
      success: false,
      moduleId: '',
      version: '',
      error: 'module.json must contain "id" and "version"',
    };
  }

  // Find bundle file
  const distDir = join(sourceDir, 'dist');
  let bundleContent: string | null = null;
  let bundleSize = 0;

  if (existsSync(distDir)) {
    const files = await readdir(distDir);
    const jsFile = files.find((f) => f.endsWith('.js') && !f.endsWith('.map'));
    if (jsFile) {
      bundleContent = await readFile(join(distDir, jsFile), 'utf-8');
      bundleSize = Buffer.byteLength(bundleContent);
    }
  }

  // Calculate checksum from bundle + manifest
  const checksumData = (bundleContent ?? manifestRaw) + manifestRaw;
  const checksum = await sha256(checksumData);

  const payload = {
    id: manifest.id,
    name: manifest.name ?? manifest.id,
    version: manifest.version,
    description: manifest.description ?? '',
    icon: manifest.icon,
    entry: manifest.entry ?? './dist/bundle.js',
    checksum,
    author: manifest.author,
    homepage: manifest.homepage,
    categories: manifest.categories ?? [],
    permissions: manifest.permissions ?? [],
    screenshots: manifest.screenshots,
    changelog: manifest.changelog,
    bundleSize,
  };

  if (options.dryRun) {
    return {
      success: true,
      moduleId: payload.id,
      version: payload.version,
      url: `${registry}/api/modules/${payload.id}`,
    };
  }

  const apiKey = options.apiKey ?? process.env.ARUNAOS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      moduleId: payload.id,
      version: payload.version,
      error: 'No API key provided. Set ARUNAOS_API_KEY env or pass --api-key',
    };
  }

  try {
    const response = await fetch(`${registry}/api/modules/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return {
        success: false,
        moduleId: payload.id,
        version: payload.version,
        error: err.error ?? `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      moduleId: result.id ?? payload.id,
      version: result.version ?? payload.version,
      url: `${registry}/api/modules/${result.id ?? payload.id}`,
    };
  } catch (err) {
    return {
      success: false,
      moduleId: payload.id,
      version: payload.version,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
