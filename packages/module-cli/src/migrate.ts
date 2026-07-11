import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

interface LegacyModuleConfig {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: string;
  entry?: string;
  permissions?: string[];
  window?: Record<string, unknown>;
  shortcuts?: string[];
  dependencies?: string[];
  api?: Record<string, unknown>;
}

export interface MigrationOptions {
  sourceDir: string;
  outputDir?: string;
  dryRun?: boolean;
}

export interface MigrationResult {
  moduleId: string;
  success: boolean;
  errors: string[];
  filesCreated: string[];
}

async function sha256(data: string | Uint8Array): Promise<string> {
  return createHash('sha256').update(data).digest('hex');
}

function inferExternalManifest(legacy: LegacyModuleConfig): Record<string, unknown> {
  return {
    id: legacy.id,
    name: legacy.name ?? legacy.id,
    version: legacy.version ?? '0.1.0',
    description: legacy.description ?? `${legacy.name ?? legacy.id} module`,
    icon: legacy.icon ?? 'extension',
    entry: './dist/bundle.js',
    type: 'external',
    checksum: '',
    manifestUrl: '',
    permissions: legacy.permissions ?? [],
    window: legacy.window,
    shortcuts: legacy.shortcuts,
    dependencies: legacy.dependencies,
    api: legacy.api,
    author: '',
    homepage: '',
    categories: ['uncategorized'],
  };
}

export async function migrateModule(options: MigrationOptions): Promise<MigrationResult> {
  const errors: string[] = [];
  const filesCreated: string[] = [];
  const sourceDir = resolve(options.sourceDir);
  const outDir = options.outputDir ? resolve(options.outputDir) : join(sourceDir, '..', `${relative(process.cwd(), sourceDir).replace(/[^a-z0-9]/g, '-')}-v5`);

  // Phase 4 modules are in features/ directory with index.tsx
  const featureIndex = join(sourceDir, 'index.tsx');
  const featureIndexTs = join(sourceDir, 'index.ts');
  const moduleJson = join(sourceDir, 'module.json');
  const legacyModuleJson = join(sourceDir, 'module.config.json');

  // Determine entry point
  let entryContent: string | null = null;
  let entryPath: string;

  if (existsSync(featureIndex)) {
    entryContent = await readFile(featureIndex, 'utf-8');
    entryPath = featureIndex;
  } else if (existsSync(featureIndexTs)) {
    entryContent = await readFile(featureIndexTs, 'utf-8');
    entryPath = featureIndexTs;
  } else {
    errors.push('No entry point found (index.tsx or index.ts)');
    entryPath = '';
  }

  // Read existing module.json or infer from files
  let manifest: Record<string, unknown>;

  if (existsSync(moduleJson)) {
    manifest = JSON.parse(await readFile(moduleJson, 'utf-8'));
  } else if (existsSync(legacyModuleJson)) {
    const legacy: LegacyModuleConfig = JSON.parse(await readFile(legacyModuleJson, 'utf-8'));
    manifest = inferExternalManifest(legacy);
  } else {
    // Infer from directory name
    const dirName = relative(process.cwd(), sourceDir).split(/[/\\]/).pop() ?? 'module';
    manifest = inferExternalManifest({
      id: `legacy.${dirName}`,
      name: dirName.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      version: '0.1.0',
    });
  }

  manifest.type = 'external';

  // Create output structure
  const outSrcDir = join(outDir, 'src');
  const outDistDir = join(outDir, 'dist');

  if (!options.dryRun) {
    await mkdir(outSrcDir, { recursive: true });
    await mkdir(outDistDir, { recursive: true });
  }

  // Write entry point
  if (entryContent && !options.dryRun) {
    const outEntry = join(outSrcDir, 'index.ts');
    await writeFile(outEntry, entryContent);
    filesCreated.push(outEntry);
  }

  // Write manifest
  if (!options.dryRun) {
    await writeFile(join(outDir, 'module.json'), JSON.stringify(manifest, null, 2));
    filesCreated.push(join(outDir, 'module.json'));
  }

  // Generate bundle + checksum
  if (entryContent && !options.dryRun) {
    // Convert to simple ESM wrapper
    const bundleCode = `// Migrated from Phase 4\n// Source: ${sourceDir}\n\n${entryContent}\n`;
    const bundlePath = join(outDistDir, 'bundle.js');
    await writeFile(bundlePath, bundleCode);
    filesCreated.push(bundlePath);

    // Update checksum
    manifest.checksum = await sha256(bundleCode);
    manifest.updatedAt = new Date().toISOString();

    // Re-write manifest with checksum
    await writeFile(join(outDir, 'module.json'), JSON.stringify(manifest, null, 2));
  }

  // Copy additional files (components, stores, etc.)
  try {
    const entries = await readdir(sourceDir);
    for (const entry of entries) {
      if (entry === 'index.tsx' || entry === 'index.ts' || entry === 'node_modules' || entry === 'dist') continue;
      if (!options.dryRun && !entry.startsWith('.')) {
        try {
          const content = await readFile(join(sourceDir, entry), 'utf-8');
          await writeFile(join(outDir, entry), content);
          filesCreated.push(join(outDir, entry));
        } catch {
          // Skip directories or binary files
        }
      }
    }
  } catch {
    // Source directory may not have additional files
  }

  return {
    moduleId: manifest.id as string,
    success: errors.length === 0,
    errors,
    filesCreated,
  };
}
