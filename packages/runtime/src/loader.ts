import { ModuleRegistry } from './registry';
import { ModuleLifecycleManager } from './lifecycle';
import { ModuleSandbox } from './sandbox';
import { ModuleIPC } from './ipc';
import { ModulePermissions } from './permissions';
import type { ModuleInstance, SystemAPI } from './types';

export type ModuleFactory = () => Promise<Record<string, unknown>>;

export class ModuleLoader {
  private registry: ModuleRegistry;
  private lifecycle: ModuleLifecycleManager;
  private sandbox: ModuleSandbox;
  private permissions: ModulePermissions;
  private factories = new Map<string, ModuleFactory>();
  private systemAPI: SystemAPI | null = null;
  private loaded = new Set<string>();

  constructor(
    registry: ModuleRegistry,
    lifecycle: ModuleLifecycleManager,
    sandbox: ModuleSandbox,
    _ipc: ModuleIPC,
    permissions: ModulePermissions,
  ) {
    this.registry = registry;
    this.lifecycle = lifecycle;
    this.sandbox = sandbox;
    this.permissions = permissions;
  }

  setSystemAPI(api: SystemAPI): void {
    this.systemAPI = api;
  }

  registerFactory(id: string, factory: ModuleFactory): void {
    if (this.factories.has(id)) {
      throw new Error(`Factory for module '${id}' already registered`);
    }
    this.factories.set(id, factory);
  }

  async load(id: string, params?: Record<string, unknown>): Promise<ModuleInstance> {
    if (this.loaded.has(id)) {
      const existing = this.registry.get(id);
      if (existing?.instance) return existing.instance;
    }

    const entry = this.registry.get(id);
    if (!entry) {
      throw new Error(`Module '${id}' is not registered`);
    }

    this.registry.setStatus(id, 'loading');

    try {
      // Auto-grant permissions for built-in modules
      this.permissions.autoGrant(id);

      // Create sandbox
      const sandbox = this.sandbox.create(entry.manifest, this.systemAPI!);

      // Get factory result
      let instance: Record<string, unknown>;
      const factory = this.factories.get(id);
      if (factory) {
        instance = await factory();
      } else {
        instance = {};
      }

      // Merge sandbox into instance
      const merged = { ...instance, __sandbox: sandbox };

      this.registry.setInstance(id, merged);
      this.registry.setStatus(id, 'active');
      this.loaded.add(id);

      // Call lifecycle onMount
      await this.lifecycle.onMount(id, params);

      return merged;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.registry.setStatus(id, 'error', error);
      throw error;
    }
  }

  async unload(id: string): Promise<void> {
    if (!this.loaded.has(id)) return;

    await this.lifecycle.onUnmount(id);
    this.sandbox.destroy(id);
    this.loaded.delete(id);

    const entry = this.registry.get(id);
    if (entry) {
      entry.instance = null;
      this.registry.setStatus(id, 'registered');
    }
  }

  async reload(id: string, params?: Record<string, unknown>): Promise<ModuleInstance> {
    await this.unload(id);
    return this.load(id, params);
  }

  isLoaded(id: string): boolean {
    return this.loaded.has(id);
  }

  getLoadedModules(): string[] {
    return Array.from(this.loaded);
  }

  async sleep(id: string): Promise<void> {
    await this.lifecycle.onSleep(id);
    if (this.registry.get(id)) {
      this.registry.setStatus(id, 'suspended');
    }
  }

  async resume(id: string): Promise<void> {
    await this.lifecycle.onResume(id);
    if (this.registry.get(id)) {
      this.registry.setStatus(id, 'active');
    }
  }
}
