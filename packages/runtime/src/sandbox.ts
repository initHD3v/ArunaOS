import type { ModuleManifest, SystemAPI, Permission } from './types';

export class ModuleSandbox {
  private sandboxes = new Map<string, Record<string, unknown>>();

  create(manifest: ModuleManifest, api: SystemAPI): Record<string, unknown> {
    const allowedCalls = this.buildAPI(manifest, api);
    const sandbox: Record<string, unknown> = {
      moduleId: manifest.id,
      moduleName: manifest.name,
      api: allowedCalls,
    };
    this.sandboxes.set(manifest.id, sandbox);
    return sandbox;
  }

  destroy(moduleId: string): void {
    this.sandboxes.delete(moduleId);
  }

  get(moduleId: string): Record<string, unknown> | null {
    return this.sandboxes.get(moduleId) ?? null;
  }

  private buildAPI(manifest: ManifestWithPermissions, api: SystemAPI): Record<string, unknown> {
    const perms = new Set(manifest.permissions ?? []);
    const allowed: Record<string, unknown> = {};
    const check = (perm: Permission): boolean => perms.has(perm);

    allowed.openWindow = (
      config: Parameters<SystemAPI['openWindow']>[0],
    ): string | Promise<string> => {
      return api.openWindow(config);
    };

    allowed.closeWindow = (windowId: string): void => {
      api.closeWindow(windowId);
    };

    allowed.notify = (
      type: Parameters<SystemAPI['notify']>[0],
      message: Parameters<SystemAPI['notify']>[1],
      options?: Parameters<SystemAPI['notify']>[2],
    ): string => {
      return api.notify(type, message, options);
    };

    if (check('storage:read') || check('storage:write')) {
      allowed.storage = {
        get: async <T>(key: string): Promise<T | null> => {
          if (!check('storage:read')) throw new Error('Permission denied: storage:read');
          return api.storage.get<T>(key);
        },
        set: async <T>(key: string, value: T): Promise<void> => {
          if (!check('storage:write')) throw new Error('Permission denied: storage:write');
          return api.storage.set(key, value);
        },
        delete: async (key: string): Promise<void> => {
          if (!check('storage:write')) throw new Error('Permission denied: storage:write');
          return api.storage.delete(key);
        },
      };
    }

    allowed.settings = {
      get: <T>(key: string): T => api.settings.get(key) as T,
      set: async (key: string, value: unknown): Promise<void> => api.settings.set(key, value),
    };

    allowed.theme = {
      getMode: (): string => api.theme.getMode(),
      setMode: async (mode: string): Promise<void> => api.theme.setMode(mode),
    };

    allowed.logger = {
      info: (module: string, message: string, data?: unknown): void =>
        api.logger.info(module, message, data),
      warn: (module: string, message: string, data?: unknown): void =>
        api.logger.warn(module, message, data),
      error: (module: string, message: string, data?: unknown): void =>
        api.logger.error(module, message, data),
    };

    return allowed;
  }
}

interface ManifestWithPermissions extends ModuleManifest {
  permissions?: Permission[];
}
