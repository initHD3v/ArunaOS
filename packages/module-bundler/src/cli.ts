#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildModule, validateBuild } from './index';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
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

      const result = await buildModule({
        entry,
        outDir,
        manifestPath,
        minify,
        sourcemap,
      });

      console.log(`Built ${result.manifest.id} v${result.manifest.version}`);
      console.log(`  Bundle: ${result.bundlePath} (${(result.bundleSize / 1024).toFixed(1)} KB)`);
      console.log(`  SHA-256: ${result.checksum}`);
      console.log(`  Manifest: ${result.manifestPath}`);
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
    }

    default:
      console.log('Usage:');
      console.log('  arunaos-bundle build [sourceDir] [outDir] [options]');
      console.log('  arunaos-bundle validate [bundleDir]');
      console.log('');
      console.log('Options:');
      console.log('  --no-minify    Disable minification');
      console.log('  --sourcemap    Generate source map');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
