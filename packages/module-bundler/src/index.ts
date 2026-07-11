import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, dirname, isAbsolute } from 'node:path';
import * as esbuild from 'esbuild';

export interface BundleOptions {
  entry: string;
  outDir: string;
  manifestPath: string;
  minify?: boolean;
  sourcemap?: boolean;
  external?: string[];
  format?: 'esm';
}

export interface BundleResult {
  manifest: Record<string, unknown>;
  checksum: string;
  bundlePath: string;
  bundleSize: number;
  manifestPath: string;
}

const VALID_PERMISSIONS = [
  'storage:read',
  'storage:write',
  'camera',
  'microphone',
  'notification',
  'clipboard:read',
  'clipboard:write',
  'network',
  'geolocation',
];

function validateManifest(m: Record<string, unknown>): void {
  if (!m.id || typeof m.id !== 'string') throw new Error('manifest.id is required (string)');
  if (!/^[a-z][a-z0-9._-]{2,64}$/.test(m.id)) {
    throw new Error(`Invalid manifest.id: '${m.id}'`);
  }
  if (!m.name || typeof m.name !== 'string') throw new Error('manifest.name is required (string)');
  if (!m.version || typeof m.version !== 'string') throw new Error('manifest.version is required (string)');
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) throw new Error(`Invalid semver: '${m.version}'`);
  if (!m.description || typeof m.description !== 'string') throw new Error('manifest.description is required');
  if (Array.isArray(m.permissions)) {
    for (const p of m.permissions) {
      if (typeof p !== 'string' || !VALID_PERMISSIONS.includes(p)) {
        throw new Error(`Unknown permission: '${String(p)}'`);
      }
    }
  }
  if (m.type && m.type !== 'external') throw new Error('type must be "external" for bundled modules');
}

async function sha256(data: string | Uint8Array): Promise<string> {
  return createHash('sha256').update(data).digest('hex');
}

export async function buildModule(options: BundleOptions): Promise<BundleResult> {
  const manifestRaw = await readFile(options.manifestPath, 'utf-8');
  const manifest: Record<string, unknown> = JSON.parse(manifestRaw);
  manifest.type = 'external';
  validateManifest(manifest);

  const entryAbs = isAbsolute(options.entry)
    ? options.entry
    : join(dirname(options.manifestPath), options.entry);

  const outDir = options.outDir;
  await mkdir(outDir, { recursive: true });

  const outName = 'bundle.js';
  const outFile = join(outDir, outName);

  const buildResult = await esbuild.build({
    entryPoints: [entryAbs],
    bundle: true,
    format: options.format ?? 'esm',
    outfile: outFile,
    minify: options.minify ?? true,
    sourcemap: options.sourcemap ?? false,
    external: options.external,
    platform: 'browser',
    target: ['es2020'],
  });

  if (buildResult.errors.length > 0) {
    throw new Error(
      `esbuild errors:\n${buildResult.errors.map((e) => e.text).join('\n')}`,
    );
  }

  const bundleBuffer = await readFile(outFile);
  const checksum = await sha256(bundleBuffer);

  manifest.checksum = checksum;
  manifest.entry = `./${outName}`;
  manifest.updatedAt = new Date().toISOString();

  const outManifest = join(outDir, 'module.json');
  await writeFile(outManifest, JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    manifest,
    checksum,
    bundlePath: outFile,
    bundleSize: bundleBuffer.length,
    manifestPath: outManifest,
  };
}

export interface ValidateOptions {
  manifestPath?: string;
  bundleDir: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  manifest?: Record<string, unknown>;
}

export async function validateBuild(options: ValidateOptions): Promise<ValidationResult> {
  const errors: string[] = [];

  let manifestPath = options.manifestPath;
  if (!manifestPath) {
    manifestPath = join(options.bundleDir, 'module.json');
  }

  let manifest: Record<string, unknown>;
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    return { valid: false, errors: ['Cannot read or parse module.json'] };
  }

  try {
    validateManifest(manifest);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const entry = manifest.entry;
  if (typeof entry !== 'string' || !entry.startsWith('./')) {
    errors.push('entry must be a relative path starting with ./');
  } else {
    const bundlePath = join(options.bundleDir, entry.slice(2));
    try {
      await stat(bundlePath);
    } catch {
      errors.push(`Bundle file not found: ${entry}`);
    }
  }

  const checksum = manifest.checksum;
  if (typeof checksum !== 'string' || !/^[a-f0-9]{64}$/.test(checksum)) {
    errors.push('Invalid checksum');
  } else if (typeof entry === 'string' && entry.startsWith('./')) {
    const bundlePath = join(options.bundleDir, entry.slice(2));
    try {
      const data = await readFile(bundlePath);
      const actual = await sha256(data);
      if (actual !== checksum) {
        errors.push(`Checksum mismatch: expected ${checksum}, got ${actual}`);
      }
    } catch {
      errors.push(`Cannot read bundle to verify checksum: ${entry}`);
    }
  }

  return { valid: errors.length === 0, errors, manifest: manifest! };
}
