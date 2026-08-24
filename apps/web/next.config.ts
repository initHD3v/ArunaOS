import type { NextConfig } from 'next';
import { join } from 'path';

const nextConfig: NextConfig = {
  // Pin the workspace root — otherwise Next.js infers it from lockfiles and
  // can pick up a stray package-lock.json in the home directory.
  outputFileTracingRoot: join(__dirname, '../..'),
  reactStrictMode: true,
  transpilePackages: [
    '@arunaos/ui',
    '@arunaos/utils',
    '@arunaos/hooks',
    '@arunaos/services',
    '@arunaos/constants',
    '@arunaos/types',
    '@arunaos/icons',
    '@arunaos/animations',
    '@arunaos/design-tokens',
    '@arunaos/ai',
    '@arunaos/engine',
    '@arunaos/runtime',
    '@arunaos/registry-api',
    '@arunaos/config',
  ],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpackPkg = require('webpack');
    const shim = join(__dirname, 'scripts/empty-shim.js');
    config.plugins = config.plugins ?? [];
    config.plugins.push(
      new webpackPkg.NormalModuleReplacementPlugin(/onnxruntime-node/, shim),
      new webpackPkg.NormalModuleReplacementPlugin(/sharp/, shim),
    );

    return config;
  },
};

export default nextConfig;
