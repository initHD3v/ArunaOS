import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
};

export default nextConfig;
