/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  RegistryModuleInfo,
  RegistrySearchParams,
  RegistrySearchResult,
  RegistryManifestResponse,
  UpdateCheckResult,
  PublishModuleParams,
} from './types';
import type { IRegistryStore } from './store';

type DrizzleDb = ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>;
type Schema = typeof import('@arunaos/database');

let dbPromise: Promise<{ d: DrizzleDb; schema: Schema } | null> | null = null;

async function getDb(): Promise<{ d: DrizzleDb; schema: Schema } | null> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
      const postgres = (await import('postgres')).default;
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const schema = await import('@arunaos/database');

      const url = process.env.DATABASE_URL;
      if (!url) return null;

      const client = postgres(url, { max: 5 });
      const d = drizzle(client, { schema }) as unknown as DrizzleDb;
      return { d, schema };
    } catch {
      return null;
    }
  })();

  return dbPromise;
}

export class PostgresStore implements IRegistryStore {
  private _ready: boolean | null = null;

  get connected(): boolean {
    if (this._ready !== null) return this._ready;
    getDb().then((db) => {
      this._ready = db !== null;
    });
    return false;
  }

  private async ensure() {
    const db = await getDb();
    if (!db) throw new Error('PostgreSQL not connected. Set DATABASE_URL env var.');
    return db;
  }

  async search(params: RegistrySearchParams): Promise<RegistrySearchResult> {
    const { like, or, sql, and, desc, asc } = await import('drizzle-orm');
    const { d, schema } = await this.ensure();

    const conditions: ReturnType<typeof sql>[] = [];
    if (params.query) {
      const q = `%${params.query.toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`LOWER(${schema.moduleRegistry.name})`, q),
          like(sql`LOWER(${schema.moduleRegistry.description})`, q),
          like(sql`LOWER(${schema.moduleRegistry.id})`, q),
        )!,
      );
    }
    if (params.category) {
      conditions.push(sql`${schema.moduleRegistry.categories} @> ARRAY[${params.category}]`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const orderBy = (() => {
      switch (params.sort) {
        case 'rating':
          return desc(schema.moduleRegistry.rating);
        case 'newest':
          return desc(schema.moduleRegistry.updatedAt);
        case 'name':
          return asc(schema.moduleRegistry.name);
        default:
          return desc(schema.moduleRegistry.downloads);
      }
    })();

    const rows = await (d as any)
      .select()
      .from(schema.moduleRegistry)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    const [{ count }] = await (d as any)
      .select({ count: sql<number>`count(*)` })
      .from(schema.moduleRegistry)
      .where(where);

    return {
      modules: rows.map((r: any) => this.toInfo(r)),
      total: Number(count),
      page,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  async getModule(id: string): Promise<RegistryModuleInfo | undefined> {
    const { eq } = await import('drizzle-orm');
    const { d, schema } = await this.ensure();
    const rows = await (d as any)
      .select()
      .from(schema.moduleRegistry)
      .where(eq(schema.moduleRegistry.id, id))
      .limit(1);
    return rows[0] ? this.toInfo(rows[0]) : undefined;
  }

  async getManifest(id: string): Promise<RegistryManifestResponse | undefined> {
    const { eq } = await import('drizzle-orm');
    const { d, schema } = await this.ensure();
    const rows = await (d as any)
      .select()
      .from(schema.moduleRegistry)
      .where(eq(schema.moduleRegistry.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;

    return {
      manifest: {
        id: row.id,
        name: row.name,
        version: row.version,
        description: row.description,
        icon: row.icon,
        entry: row.entry,
        type: 'external',
        checksum: row.checksum,
        manifestUrl: row.manifestUrl ?? `/api/modules/${row.id}/manifest`,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : undefined,
        author: row.author ?? undefined,
        homepage: row.homepage ?? undefined,
        categories: row.categories ?? undefined,
        permissions: row.permissions ?? undefined,
        signature: row.signature ?? undefined,
        signaturePublicKey: undefined,
      },
      bundleUrl:
        row.bundleUrl ?? `https://cdn.arunaos.io/bundles/${row.id}/${row.version}/module.js`,
    };
  }

  async getCategories(): Promise<string[]> {
    const { sql } = await import('drizzle-orm');
    const { d, schema } = await this.ensure();
    const rows = await (d as any)
      .select({ cat: sql<string>`DISTINCT unnest(${schema.moduleRegistry.categories})` })
      .from(schema.moduleRegistry);
    return rows.map((r: any) => r.cat).filter(Boolean);
  }

  async checkUpdates(
    updates: Array<{ id: string; version: string }>,
  ): Promise<UpdateCheckResult[]> {
    const { eq } = await import('drizzle-orm');
    const { d, schema } = await this.ensure();
    const results: UpdateCheckResult[] = [];

    for (const req of updates) {
      const rows = await (d as any)
        .select()
        .from(schema.moduleRegistry)
        .where(eq(schema.moduleRegistry.id, req.id))
        .limit(1);
      const row = rows[0];
      if (row && row.version !== req.version) {
        results.push({
          id: row.id,
          currentVersion: req.version,
          latestVersion: row.version,
          manifestUrl: `/api/modules/${encodeURIComponent(row.id)}/manifest`,
        });
      }
    }
    return results;
  }

  async publishModule(params: PublishModuleParams): Promise<{ id: string; version: string }> {
    const { d, schema } = await this.ensure();
    const { signModule } = await import('./crypto');

    const signatures = await signModule({
      id: params.id,
      version: params.version,
      checksum: params.checksum,
      manifest: params as unknown as Record<string, unknown>,
    });

    await (d as any)
      .insert(schema.moduleRegistry)
      .values({
        id: params.id,
        name: params.name,
        version: params.version,
        description: params.description,
        icon: params.icon ?? 'extension',
        entry: params.entry,
        type: 'external',
        checksum: params.checksum,
        manifestUrl: params.manifestUrl ?? `/api/modules/${params.id}/manifest`,
        bundleUrl: params.bundleUrl,
        permissions: params.permissions,
        author: params.author,
        homepage: params.homepage,
        categories: params.categories ?? [],
        screenshots: params.screenshots,
        bundleSize: params.bundleSize ?? null,
        downloads: 0,
        rating: 0,
        verified: true,
        signature: signatures.signature,
      })
      .onConflictDoUpdate({
        target: schema.moduleRegistry.id,
        set: {
          version: params.version,
          description: params.description,
          icon: params.icon ?? 'extension',
          entry: params.entry,
          checksum: params.checksum,
          manifestUrl: params.manifestUrl ?? `/api/modules/${params.id}/manifest`,
          bundleUrl: params.bundleUrl,
          permissions: params.permissions,
          homepage: params.homepage,
          categories: params.categories ?? [],
          screenshots: params.screenshots,
          bundleSize: params.bundleSize ?? null,
          signature: signatures.signature,
          updatedAt: new Date(),
        },
      });

    return { id: params.id, version: params.version };
  }

  async incrementDownloads(id: string): Promise<void> {
    const { eq, sql } = await import('drizzle-orm');
    const { d, schema } = await this.ensure();
    await (d as any)
      .update(schema.moduleRegistry)
      .set({ downloads: sql`${schema.moduleRegistry.downloads} + 1` })
      .where(eq(schema.moduleRegistry.id, id));
  }

  private toInfo(row: any): RegistryModuleInfo {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      icon: row.icon,
      author: row.author ?? undefined,
      homepage: row.homepage ?? undefined,
      categories: row.categories ?? [],
      downloads: row.downloads ?? 0,
      rating: row.rating ?? 0,
      verified: row.verified ?? false,
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ''),
      bundleSize: row.bundleSize ?? undefined,
      manifestUrl: row.manifestUrl ?? undefined,
    };
  }
}
