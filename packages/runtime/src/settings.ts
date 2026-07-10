type EventHandler<T = unknown> = (payload: T) => void;

interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): () => void;
  emit<T>(event: string, payload: T): void;
}

interface StorageBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export class ModuleSettings {
  private bus: EventBus;
  private storage: StorageBackend;
  private cache = new Map<string, Map<string, unknown>>();

  constructor(bus: EventBus, storage: StorageBackend) {
    this.bus = bus;
    this.storage = storage;
  }

  private storageKey(moduleId: string): string {
    return `module:settings:${moduleId}`;
  }

  private async ensureCache(moduleId: string): Promise<Map<string, unknown>> {
    let cached = this.cache.get(moduleId);
    if (!cached) {
      const raw = await this.storage.get<Record<string, unknown>>(this.storageKey(moduleId));
      cached = new Map(Object.entries(raw ?? {}));
      this.cache.set(moduleId, cached);
    }
    return cached;
  }

  async get<T>(moduleId: string, key: string): Promise<T | undefined> {
    const cache = await this.ensureCache(moduleId);
    return cache.get(key) as T | undefined;
  }

  async set<T>(moduleId: string, key: string, value: T): Promise<void> {
    const cache = await this.ensureCache(moduleId);
    cache.set(key, value);
    await this.flush(moduleId);
    this.bus.emit(`module:settings:${moduleId}`, { key, value });
  }

  async getAll<T extends Record<string, unknown>>(moduleId: string): Promise<T> {
    const cache = await this.ensureCache(moduleId);
    return Object.fromEntries(cache) as T;
  }

  async delete(moduleId: string, key: string): Promise<void> {
    const cache = await this.ensureCache(moduleId);
    cache.delete(key);
    await this.flush(moduleId);
  }

  async clear(moduleId: string): Promise<void> {
    this.cache.delete(moduleId);
    await this.storage.set(this.storageKey(moduleId), {});
  }

  private async flush(moduleId: string): Promise<void> {
    const cache = this.cache.get(moduleId);
    if (!cache) return;
    const obj: Record<string, unknown> = {};
    cache.forEach((value, key) => {
      obj[key] = value;
    });
    await this.storage.set(this.storageKey(moduleId), obj);
  }

  onChange<T = unknown>(moduleId: string, key: string, handler: (value: T) => void): () => void {
    return this.bus.on(`module:settings:${moduleId}`, (payload: unknown) => {
      const event = payload as { key: string; value: unknown };
      if (event.key === key) {
        handler(event.value as T);
      }
    });
  }
}
