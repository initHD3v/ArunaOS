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
  private bus: EventBus;
  private listeners = new Set<Listener>();
  private isLoadedFn: (id: string) => boolean;

  constructor(registry: ModuleRegistry, bus: EventBus, isLoaded: (id: string) => boolean) {
    this.registry = registry;
    this.bus = bus;
    this.isLoadedFn = isLoaded;

    // React to status changes
    this.bus.on('module:statusChange', () => {
      this.notify();
    });

    this.bus.on('module:registered', () => {
      this.notify();
    });
  }

  private getState(): ModuleStoreState {
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
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): ModuleStoreState {
    return this.getState();
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }
}
