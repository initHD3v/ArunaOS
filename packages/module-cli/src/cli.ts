#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildModule, validateBuild } from '@arunaos/module-bundler';
import { createModule } from './create';
import { devServer } from './dev';
import { migrateModule } from './migrate';
import { publishModule } from './publish';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'create': {
      const name = args[1];
      if (!name) {
        console.error('Usage: arunaos create <module-name> [dir]');
        process.exit(1);
      }
      const targetDir = await createModule({
        name,
        dir: args[2],
        description: args[3] ?? `${name} module`,
        permissions: args.filter((a) => a.startsWith('--perm=')).map((a) => a.slice(7)),
      });
      console.log(`Created module at ${targetDir}`);
      break;
    }

    case 'build': {
      const sourceDir = args[1] || process.cwd();
      const manifestPath = join(sourceDir, 'module.json');
      if (!existsSync(manifestPath)) {
        console.error(`module.json not found in ${sourceDir}`);
        process.exit(1);
      }
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const entry = join(sourceDir, manifest.entry || './index.ts');
      const outDir = args[2] || join(sourceDir, 'dist');
      const minify = !args.includes('--no-minify');
      const sourcemap = args.includes('--sourcemap');

      const result = await buildModule({ entry, outDir, manifestPath, minify, sourcemap });
      console.log(`Built ${result.manifest.id} v${result.manifest.version}`);
      console.log(`  Bundle: ${(result.bundleSize / 1024).toFixed(1)} KB`);
      console.log(`  SHA-256: ${result.checksum}`);
      break;
    }

    case 'dev': {
      const dir = args[1] || process.cwd();
      const port = parseInt(args.find((a) => a.startsWith('--port='))?.slice(7) ?? '4321', 10);
      const server = await devServer({ dir, port });

      process.on('SIGINT', () => {
        server.stop();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        server.stop();
        process.exit(0);
      });

      // Keep alive
      await new Promise(() => {});
      break;
    }

    case 'validate': {
      const bundleDir = args[1] || process.cwd();
      const result = await validateBuild({ bundleDir });
      if (result.valid) {
        console.log(`✓ ${result.manifest?.id} v${result.manifest?.version} — valid`);
        process.exit(0);
      } else {
        console.error(`✗ Validation failed:`);
        for (const err of result.errors) {
          console.error(`  - ${err}`);
        }
        process.exit(1);
      }
      break;
    }

    case 'migrate': {
      const sourceDir = args[1] || process.cwd();
      const dryRun = args.includes('--dry-run');
      const result = await migrateModule({ sourceDir, dryRun });
      if (result.success) {
        console.log(`✓ Migrated '${result.moduleId}' (${result.filesCreated.length} files)`);
        for (const f of result.filesCreated) {
          console.log(`  Created: ${f}`);
        }
        process.exit(0);
      } else {
        console.error(`✗ Migration failed for '${result.moduleId}':`);
        for (const err of result.errors) {
          console.error(`  - ${err}`);
        }
        process.exit(1);
      }
      break;
    }

    case 'publish': {
      const publishDir = args[1] || process.cwd();
      const registry =
        args.find((a) => a.startsWith('--registry='))?.slice(11) ||
        process.env.ARUNAOS_REGISTRY ||
        'http://localhost:3000';
      const apiKey =
        args.find((a) => a.startsWith('--api-key='))?.slice(10) || process.env.ARUNAOS_API_KEY;
      const dryRunPublish = args.includes('--dry-run');

      const result = await publishModule({
        dir: publishDir,
        registry,
        apiKey,
        dryRun: dryRunPublish,
      });
      if (result.success) {
        console.log(`Published ${result.moduleId} v${result.version}`);
        if (result.url) console.log(`  URL: ${result.url}`);
        process.exit(0);
      } else {
        console.error(`Publish failed: ${result.error}`);
        process.exit(1);
      }
      break;
    }

    default: {
      console.log('arunaos — ArunaOS Module CLI');
      console.log('');
      console.log('Usage:');
      console.log('  arunaos create <name>        Create a new module scaffold');
      console.log('  arunaos build [dir]          Build module to dist/');
      console.log('  arunaos dev [dir]            Start dev server with HMR via SSE');
      console.log('  arunaos validate [dir]       Validate built module');
      console.log('  arunaos migrate [dir]        Migrate Phase 4 module to Phase 5');
      console.log('  arunaos publish [dir]        Publish module to registry');
      console.log('');
      console.log('Options:');
      console.log('  --no-minify                  Disable minification');
      console.log('  --sourcemap                  Generate source map');
      console.log('  --port=<port>                Dev server port (default: 4321)');
      console.log('  --perm=<permission>          Permission for create command');
      console.log('  --dry-run                    Preview migration or publish without writing');
      console.log('  --registry=<url>             Registry URL (default: http://localhost:3000)');
      console.log('  --api-key=<key>              API key for registry');
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
