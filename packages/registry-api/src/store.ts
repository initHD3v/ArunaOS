import type {
  RegistryModuleInfo,
  RegistrySearchParams,
  RegistrySearchResult,
  RegistryManifestResponse,
  UpdateCheckResult,
  PublishModuleParams,
} from './types';
import { MemoryStore } from './store.memory';

export interface IRegistryStore {
  search(params: RegistrySearchParams): RegistrySearchResult | Promise<RegistrySearchResult>;
  getModule(id: string): RegistryModuleInfo | undefined | Promise<RegistryModuleInfo | undefined>;
  getManifest(
    id: string,
  ): RegistryManifestResponse | undefined | Promise<RegistryManifestResponse | undefined>;
  getCategories(): string[] | Promise<string[]>;
  checkUpdates(
    updates: Array<{ id: string; version: string }>,
  ): UpdateCheckResult[] | Promise<UpdateCheckResult[]>;
  publishModule(params: PublishModuleParams): Promise<{ id: string; version: string }>;
  incrementDownloads(id: string): Promise<void>;
}

let instance: IRegistryStore | null = null;

export async function getRegistryStore(): Promise<IRegistryStore> {
  if (instance) return instance;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const { PostgresStore } = await import('./store.pg');
    const pg = new PostgresStore();
    if (pg.connected) {
      instance = pg;
      return instance;
    }
  }

  instance = new MemoryStore();
  return instance;
}

export { MemoryStore } from './store.memory';
