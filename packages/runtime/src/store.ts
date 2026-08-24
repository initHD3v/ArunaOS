import type { ModuleEntry } from './types';
import type { ModuleRegistry } from './registry';

type EventHandler<T = unknown> = (payload: T) => void;

interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): () => void;
  emit<T>(event: string, payload: T): void;
}

export interface ModuleStoreState {
  entries: ModuleEntry[];
  activeModuleIds: string[];
  loadedModuleIds: string[];
  isLoaded: (id: string) => boolean;
  getEntry: (id: string) => ModuleEntry | undefined;
  getActive: () => ModuleEntry[];
  refresh: () => void;
}

type Listener = (state: ModuleStoreState) => void;

export class ModuleStore {
  private registry: ModuleRegistry;
  private listeners = new Set<Listener>();
  private isLoadedFn: (id: string) => boolean;
  /** B10: cached snapshot — getSnapshot() must return a stable identity
   * between mutations or useSyncExternalStore loops forever. */
  private snapshot: ModuleStoreState | null = null;

  constructor(registry: ModuleRegistry, bus: EventBus, isLoaded: (id: string) => boolean) {
    this.registry = registry;
    this.isLoadedFn = isLoaded;
    // B10: invalidate the cached snapshot when module status changes —
    // previously the bus parameter was ignored and getSnapshot() rebuilt
    // (a new object identity) on every call, which loops under
    // useSyncExternalStore.
    bus.on('module:statusChange', () => this.notify());
  }

  private buildState(): ModuleStoreState {
    const entries = this.registry.getAll();
    return {
      entries,
      activeModuleIds: entries.filter((e) => e.status === 'active').map((e) => e.manifest.id),
      loadedModuleIds: entries
        .filter((e) => this.isLoadedFn(e.manifest.id))
        .map((e) => e.manifest.id),
      isLoaded: (id: string) => this.isLoadedFn(id),
      getEntry: (id: string) => entries.find((e) => e.manifest.id === id),
      getActive: () => entries.filter((e) => e.status === 'active'),
      refresh: () => this.notify(),
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): ModuleStoreState {
    if (!this.snapshot) {
      this.snapshot = this.buildState();
    }
    return this.snapshot;
  }

  private notify(): void {
    this.snapshot = this.buildState();
    this.listeners.forEach((fn) => fn(this.snapshot!));
  }
}
