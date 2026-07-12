import { watch } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { buildModule } from '@arunaos/module-bundler';
import type { DevServerOptions } from './types.js';

type SSEClient = { id: number; res: ServerResponse };

export class DevServer {
  private sseClients: SSEClient[] = [];
  private nextClientId = 1;
  private port: number;
  private host: string;
  private dir: string;
  private server: ReturnType<typeof createServer> | null = null;
  private abortController: AbortController | null = null;
  private ready = false;

  constructor(options: DevServerOptions) {
    this.dir = resolve(options.dir);
    this.port = options.port ?? 4321;
    this.host = options.host ?? 'localhost';
  }

  async start(): Promise<void> {
    const manifestPath = join(this.dir, 'module.json');
    if (!existsSync(manifestPath)) {
      throw new Error(`module.json not found in ${this.dir}`);
    }

    this.abortController = new AbortController();

    this.server = createServer((req, res) => this.handleRequest(req, res));

    // Initial build
    await this.build();

    return new Promise((resolve) => {
      this.server!.listen(this.port, this.host, () => {
        console.log(`Dev server running at http://${this.host}:${this.port}`);
        console.log(`Watching ${this.dir} for changes...`);
        this.ready = true;
        this.watchFiles();
        resolve();
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${this.host}:${this.port}`);

    // SSE endpoint for HMR
    if (url.pathname === '/__hmr') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const client: SSEClient = { id: this.nextClientId++, res };
      this.sseClients.push(client);

      // Initial connected event
      res.write(`event: connected\ndata: ${JSON.stringify({ clientId: client.id })}\n\n`);

      req.on('close', () => {
        this.sseClients = this.sseClients.filter((c) => c.id !== client.id);
      });
      return;
    }

    // Serve module files from dist/
    const filePath = join(this.dir, 'dist', url.pathname === '/' ? 'module.json' : url.pathname);

    try {
      const content = await readFile(filePath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': this.getMimeType(filePath),
        'Access-Control-Allow-Origin': '*',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  private async build(): Promise<void> {
    const srcDir = join(this.dir, 'src');
    const outDir = join(this.dir, 'dist');
    const manifestPath = join(this.dir, 'module.json');

    try {
      const manifestRaw = await readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestRaw);
      const entryRelative = (manifest.entry as string)?.replace('./src/', '') ?? 'index.ts';
      const entry = join(srcDir, entryRelative);

      const result = await buildModule({
        entry,
        outDir,
        manifestPath,
        minify: false,
        sourcemap: true,
      });

      console.log(
        `[build] ${result.manifest.id} v${result.manifest.version} (${(result.bundleSize / 1024).toFixed(1)} KB)`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[build] Error: ${msg}`);
    }
  }

  private async watchFiles(): Promise<void> {
    if (!this.abortController) return;

    const srcDir = join(this.dir, 'src');
    if (!existsSync(srcDir)) return;

    try {
      const watcher = watch(srcDir, {
        recursive: true,
        signal: this.abortController.signal,
      });

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      for await (const _event of watcher) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          await this.build();
          this.broadcastSSE('hmr:reload', { timestamp: Date.now() });
        }, 200);
      }
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr?.code !== 'ABORT_ERR' && nodeErr?.code !== 'ERR_FS_WATCHER_ABORTED') {
        console.error('Watch error:', err);
      }
    }
  }

  private broadcastSSE(event: string, data: Record<string, unknown>): void {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.res.write(msg);
      } catch {
        this.sseClients = this.sseClients.filter((c) => c.id !== client.id);
      }
    }
  }

  private getMimeType(path: string): string {
    if (path.endsWith('.json')) return 'application/json';
    if (path.endsWith('.js')) return 'application/javascript';
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.html')) return 'text/html';
    if (path.endsWith('.map')) return 'application/json';
    return 'text/plain';
  }

  stop(): void {
    this.abortController?.abort();
    for (const client of this.sseClients) {
      try {
        client.res.end();
      } catch {
        /* ignore */
      }
    }
    this.sseClients = [];
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.ready = false;
  }
}

export async function devServer(options: DevServerOptions): Promise<DevServer> {
  const server = new DevServer(options);
  await server.start();
  return server;
}
