import { describe, it, expect, afterEach, vi } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DevServer } from '../src/dev';

async function withTempModuleDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'dev-test-'));
  const srcDir = join(dir, 'src');
  mkdirSync(srcDir, { recursive: true });

  await writeFile(
    join(dir, 'module.json'),
    JSON.stringify({
      id: 'test.dev',
      name: 'Dev Test',
      version: '0.1.0',
      description: 'Testing dev server',
      icon: 'test',
      entry: './src/index.ts',
      type: 'external',
    }),
  );

  await writeFile(
    join(srcDir, 'index.ts'),
    `export const api = { greet: () => "hello" }; export default api;`,
  );

  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function getPort(): number {
  return 9876 + Math.floor(Math.random() * 1000);
}

describe('DevServer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start and serve module.json', async () => {
    await withTempModuleDir(async (dir) => {
      const port = getPort();
      const server = new DevServer({ dir, port, host: 'localhost' });
      await server.start();

      const res = await fetch(`http://localhost:${port}/module.json`);
      expect(res.status).toBe(200);
      const manifest = await res.json();
      expect(manifest.id).toBe('test.dev');

      server.stop();
    });
  });

  it('should serve bundled JS', async () => {
    await withTempModuleDir(async (dir) => {
      const port = getPort();
      const server = new DevServer({ dir, port, host: 'localhost' });
      await server.start();

      const res = await fetch(`http://localhost:${port}/bundle.js`);
      expect(res.status).toBe(200);
      const js = await res.text();
      expect(js).toContain('greet');

      server.stop();
    });
  });

  it('should provide SSE endpoint at /__hmr', async () => {
    await withTempModuleDir(async (dir) => {
      const port = getPort();
      const server = new DevServer({ dir, port, host: 'localhost' });
      await server.start();

      const res = await fetch(`http://localhost:${port}/__hmr`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/event-stream');

      server.stop();
    });
  });

  it('should return 404 for unknown paths', async () => {
    await withTempModuleDir(async (dir) => {
      const port = getPort();
      const server = new DevServer({ dir, port, host: 'localhost' });
      await server.start();

      const res = await fetch(`http://localhost:${port}/nonexistent.js`);
      expect(res.status).toBe(404);

      server.stop();
    });
  });

  it('should stop gracefully', async () => {
    await withTempModuleDir(async (dir) => {
      const port = getPort();
      const server = new DevServer({ dir, port, host: 'localhost' });
      await server.start();
      expect(() => server.stop()).not.toThrow();
    });
  });
});
