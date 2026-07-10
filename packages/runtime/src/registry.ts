import type { ModuleManifest, ModuleEntry, ModuleStatus } from './types';

export class ModuleRegistry {
  private entries = new Map<string, ModuleEntry>();
  private onRegisteredCallbacks: Array<(entry: ModuleEntry) => void> = [];
  private onUnregisteredCallbacks: Array<(id: string) => void> = [];
  private onStatusChangeCallbacks: Array<(id: string, status: ModuleStatus) => void> = [];

  register(manifest: ModuleManifest): void {
    if (this.entries.has(manifest.id)) {
      throw new Error(`Module '${manifest.id}' is already registered`);
    }
    const entry: ModuleEntry = {
      manifest,
      status: 'registered',
      instance: null,
    };
    this.entries.set(manifest.id, entry);
    this.onRegisteredCallbacks.forEach((cb) => cb(entry));
  }

  unregister(id: string): void {
    if (!this.entries.has(id)) {
      throw new Error(`Module '${id}' is not registered`);
    }
    this.entries.delete(id);
    this.onUnregisteredCallbacks.forEach((cb) => cb(id));
  }

  get(id: string): ModuleEntry | null {
    return this.entries.get(id) ?? null;
  }

  getAll(): ModuleEntry[] {
    return Array.from(this.entries.values());
  }

  search(query: string): ModuleEntry[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(
      (entry) =>
        entry.manifest.name.toLowerCase().includes(lower) ||
        entry.manifest.id.toLowerCase().includes(lower) ||
        entry.manifest.description.toLowerCase().includes(lower),
    );
  }

  getByType(type: string): ModuleEntry[] {
    return this.getAll().filter((entry) => entry.manifest.type === type);
  }

  setStatus(id: string, status: ModuleStatus, error?: Error): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.status = status;
    if (error) entry.error = error;
    this.onStatusChangeCallbacks.forEach((cb) => cb(id, status));
  }

  getStatus(id: string): ModuleStatus | null {
    return this.entries.get(id)?.status ?? null;
  }

  setInstance(id: string, instance: Record<string, unknown>): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.instance = instance;
  }

  onRegistered(callback: (entry: ModuleEntry) => void): () => void {
    this.onRegisteredCallbacks.push(callback);
    return () => {
      const idx = this.onRegisteredCallbacks.indexOf(callback);
      if (idx !== -1) this.onRegisteredCallbacks.splice(idx, 1);
    };
  }

  onUnregistered(callback: (id: string) => void): () => void {
    this.onUnregisteredCallbacks.push(callback);
    return () => {
      const idx = this.onUnregisteredCallbacks.indexOf(callback);
      if (idx !== -1) this.onUnregisteredCallbacks.splice(idx, 1);
    };
  }

  onStatusChange(callback: (id: string, status: ModuleStatus) => void): () => void {
    this.onStatusChangeCallbacks.push(callback);
    return () => {
      const idx = this.onStatusChangeCallbacks.indexOf(callback);
      if (idx !== -1) this.onStatusChangeCallbacks.splice(idx, 1);
    };
  }

  getServiceNames(): string[] {
    return Array.from(this.entries.keys());
  }

  getCount(): number {
    return this.entries.size;
  }
}
