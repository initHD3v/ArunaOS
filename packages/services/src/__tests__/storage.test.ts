import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LocalStorageAdapter,
  StorageService,
  type StorageAdapter,
  type StorageMigration,
} from '../storage';

// mock localStorage for Node test environment
const mockStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    mockStore.delete(key);
  }),
  clear: vi.fn(() => {
    mockStore.clear();
  }),
  get length() {
    return mockStore.size;
  },
  key: vi.fn((index: number) => Array.from(mockStore.keys())[index] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

function createMockAdapter(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => {
      const raw = store.get(key);
      return raw ? JSON.parse(raw) : null;
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, JSON.stringify(value));
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
    keys: vi.fn(async () => Array.from(store.keys())),
  };
}

describe('LocalStorageAdapter', () => {
  beforeEach(() => localStorage.clear());

  it('should set and get a value', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.set('key1', { hello: 'world' });
    const result = await adapter.get<{ hello: string }>('key1');
    expect(result).toEqual({ hello: 'world' });
  });

  it('should return null for missing key', async () => {
    const adapter = new LocalStorageAdapter();
    const result = await adapter.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should delete a key', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.set('key1', 'value');
    await adapter.delete('key1');
    expect(await adapter.get('key1')).toBeNull();
  });

  it('should clear all keys', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.set('a', 1);
    await adapter.set('b', 2);
    await adapter.clear();
    expect(await adapter.keys()).toEqual([]);
  });

  it('should return all keys', async () => {
    const adapter = new LocalStorageAdapter();
    await adapter.set('a', 1);
    await adapter.set('b', 2);
    const keys = await adapter.keys();
    expect(keys.sort()).toEqual(['a', 'b']);
  });
});

describe('StorageService with mock adapter', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('should store and retrieve values', async () => {
    const storage = new StorageService(adapter);
    await storage.set('theme', 'dark');
    expect(await storage.get('theme')).toBe('dark');
  });

  it('should delete values', async () => {
    const storage = new StorageService(adapter);
    await storage.set('key', 'val');
    await storage.delete('key');
    expect(await storage.get('key')).toBeNull();
  });

  it('should clear all values', async () => {
    const storage = new StorageService(adapter);
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();
    expect(await storage.keys()).toEqual([]);
  });

  it('should list keys excluding meta', async () => {
    const storage = new StorageService(adapter);
    await storage.set('theme', 'dark');
    const keys = await storage.keys();
    expect(keys).toEqual(['theme']);
  });

  it('should run migrations on init', async () => {
    const migrate = vi.fn((data: Record<string, unknown>) => {
      return { ...data, migrated: true };
    });
    const migrations: StorageMigration[] = [{ version: 1, migrate }];

    const storage = new StorageService(adapter, 1, migrations);
    await storage.init();
    await storage.set('test', 'value');

    expect(migrate).toHaveBeenCalled();
  });

  it('should not re-run migrations', async () => {
    await adapter.set('__arunaos_storage_meta', { version: 2, migratedAt: Date.now() });

    const migrate = vi.fn((data: Record<string, unknown>) => data);
    const migrations: StorageMigration[] = [
      { version: 1, migrate },
      { version: 2, migrate },
    ];

    const storage = new StorageService(adapter, 2, migrations);
    await storage.init();
    expect(migrate).not.toHaveBeenCalled();
  });

  it('should run only pending migrations', async () => {
    await adapter.set('__arunaos_storage_meta', { version: 1, migratedAt: Date.now() });

    const m1 = vi.fn((data: Record<string, unknown>) => data);
    const m2 = vi.fn((data: Record<string, unknown>) => ({ ...data, v2: true }));
    const m3 = vi.fn((data: Record<string, unknown>) => ({ ...data, v3: true }));

    const migrations: StorageMigration[] = [
      { version: 1, migrate: m1 },
      { version: 2, migrate: m2 },
      { version: 3, migrate: m3 },
    ];

    const storage = new StorageService(adapter, 3, migrations);
    await storage.init();
    expect(m1).not.toHaveBeenCalled();
    expect(m2).toHaveBeenCalledTimes(1);
    expect(m3).toHaveBeenCalledTimes(1);
  });

  it('should update meta version after migration', async () => {
    const migrations: StorageMigration[] = [{ version: 1, migrate: (d) => d }];
    const storage = new StorageService(adapter, 1, migrations);
    await storage.init();

    const meta = await adapter.get<{ version: number }>('__arunaos_storage_meta');
    expect(meta?.version).toBe(1);
  });
});
