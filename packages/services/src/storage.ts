export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) result.push(key);
    }
    return result;
  }
}

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName: string;
  private ready: Promise<void>;

  constructor(dbName = 'arunaos', storeName = 'storage') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.ready = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onerror = () => {
        reject(req.error);
      };
    });
  }

  private ensureReady(): Promise<void> {
    return this.ready;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureReady();
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve((req.result as T) ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(key: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async keys(): Promise<string[]> {
    await this.ensureReady();
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        resolve(req.result as string[]);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async destroy(): Promise<void> {
    this.db?.close();
    this.db = null;
  }
}

export interface StorageMigration {
  version: number;
  migrate(
    data: Record<string, unknown>,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
}

interface StorageMeta {
  version: number;
  migratedAt: number;
}

const META_KEY = '__arunaos_storage_meta';

export class StorageService {
  private adapter: StorageAdapter;
  private currentVersion: number;
  private migrations: StorageMigration[];

  constructor(adapter: StorageAdapter, version = 1, migrations: StorageMigration[] = []) {
    this.adapter = adapter;
    this.currentVersion = version;
    this.migrations = migrations;
  }

  async init(): Promise<void> {
    await this.runMigrations(this.migrations);
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.adapter.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.adapter.delete(key);
  }

  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  async keys(): Promise<string[]> {
    const all = await this.adapter.keys();
    return all.filter((k) => k !== META_KEY);
  }

  private async runMigrations(migrations: StorageMigration[]): Promise<void> {
    const meta = await this.adapter.get<StorageMeta>(META_KEY);
    const storedVersion = meta?.version ?? 0;

    if (storedVersion >= this.currentVersion) return;

    const sorted = [...migrations].sort((a, b) => a.version - b.version);
    let allKeys: string[] = [];
    let data: Record<string, unknown> = {};

    for (const migration of sorted) {
      if (migration.version <= storedVersion) continue;
      if (migration.version > this.currentVersion) break;

      if (allKeys.length === 0) {
        allKeys = await this.adapter.keys();
        for (const key of allKeys) {
          if (key === META_KEY) continue;
          data[key] = await this.adapter.get(key);
        }
      }

      data = await migration.migrate(data);

      for (const [key, value] of Object.entries(data)) {
        await this.adapter.set(key, value);
      }
    }

    await this.adapter.set(META_KEY, {
      version: this.currentVersion,
      migratedAt: Date.now(),
    } satisfies StorageMeta);
  }
}
