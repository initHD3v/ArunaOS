import type { ModuleLifecycleHooks } from './types';

export class ModuleLifecycleManager {
  private hooks = new Map<string, ModuleLifecycleHooks>();

  register(id: string, hooks: ModuleLifecycleHooks): void {
    if (this.hooks.has(id)) {
      throw new Error(`Lifecycle hooks for module '${id}' already registered`);
    }
    this.hooks.set(id, hooks);
  }

  unregister(id: string): void {
    this.hooks.delete(id);
  }

  async onInstall(id: string): Promise<void> {
    await this.hooks.get(id)?.onInstall?.();
  }

  async onUninstall(id: string): Promise<void> {
    await this.hooks.get(id)?.onUninstall?.();
  }

  async onMount(id: string, params?: Record<string, unknown>): Promise<void> {
    await this.hooks.get(id)?.onMount?.(params);
  }

  async onUnmount(id: string): Promise<void> {
    await this.hooks.get(id)?.onUnmount?.();
  }

  async onSleep(id: string): Promise<void> {
    await this.hooks.get(id)?.onSleep?.();
  }

  async onResume(id: string): Promise<void> {
    await this.hooks.get(id)?.onResume?.();
  }

  onThemeChange(id: string, mode: string): void {
    this.hooks.get(id)?.onThemeChange?.(mode);
  }

  onSettingsChange(id: string, key: string, value: unknown): void {
    this.hooks.get(id)?.onSettingsChange?.(key, value);
  }

  has(id: string): boolean {
    return this.hooks.has(id);
  }
}
