import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/module-registry.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://user:password@localhost:5432/arunaos',
  },
});
