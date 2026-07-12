'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  EventBus,
  ServiceContainer,
  Logger,
  StorageService,
  LocalStorageAdapter,
  SettingsService,
  ThemeService,
} from '@arunaos/services';
import {
  ModuleRegistry,
  ModuleLoader,
  ModuleIPC,
  ModuleLifecycleManager,
  ModuleSandbox,
  ModulePermissions,
  ModuleSettings,
  ModuleStore,
  ExternalModuleLoader,
  SecurityRatingSystem,
} from '@arunaos/runtime';
import { NotificationService } from '@/services/notification/notification-service';
import { ModalService } from '@/services/modal/modal-service';
import { ShortcutService } from '@/services/shortcut/shortcut-service';
import { SearchService } from '@/services/search/search-service';
import { WindowAdapter } from '@/services/window-adapter';
import { WorkspaceService } from '@/services/workspace/workspace-service';
import { LifecycleService } from '@/services/lifecycle/lifecycle-service';
import { ModuleWindowService } from '@/services/module-window';
import { setLogger, getLogger } from '@/lib/logger-client';
import { useAuthStore } from '@/stores/auth.store';
import { getArunaCore } from '@/features/aruna-assistant/engines/aruna-core';
import { setCoreContainer } from '@/features/aruna-assistant/stores/aruna-assistant-store';

interface ServiceContextValue {
  container: ServiceContainer;
  eventBus: EventBus;
  logger: Logger;
  ready: boolean;
  error: Error | null;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<ServiceContextValue | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    const bus = new EventBus();
    const logger = new Logger(process.env.NODE_ENV === 'development');
    setLogger(logger);

    (async () => {
      try {
        const container = new ServiceContainer();
        const storageAdapter = new LocalStorageAdapter();
        const storage = new StorageService(storageAdapter, 1);
        await storage.init();

        const settings = new SettingsService(storage, bus);
        await settings.init();

        const theme = new ThemeService(settings, bus);
        theme.init();

        const notification = new NotificationService(bus);
        const modal = new ModalService();
        const shortcut = new ShortcutService();
        const search = new SearchService();
        const windowAdapter = new WindowAdapter(bus, logger);
        windowAdapter.init();
        cleanups.push(() => windowAdapter.destroy());
        const workspace = new WorkspaceService(bus, logger);
        workspace.init();
        cleanups.push(() => workspace.destroy());
        const lifecycle = new LifecycleService(bus, logger);
        lifecycle.init();

        // ── Module Runtime ──
        const moduleRegistry = new ModuleRegistry();
        const moduleIPC = new ModuleIPC(bus);
        const moduleLifecycle = new ModuleLifecycleManager();
        const modulePermissions = new ModulePermissions();
        const moduleSandbox = new ModuleSandbox();
        const moduleLoader = new ModuleLoader(
          moduleRegistry,
          moduleLifecycle,
          moduleSandbox,
          moduleIPC,
          modulePermissions,
        );
        const moduleWindowService = new ModuleWindowService(moduleRegistry, moduleLoader);
        const moduleSettings = new ModuleSettings(bus, storage);
        const moduleStore = new ModuleStore(moduleRegistry, bus, (id) => moduleLoader.isLoaded(id));
        const externalModuleLoader = new ExternalModuleLoader(moduleRegistry, modulePermissions);
        const securityRating = new SecurityRatingSystem();

        // Register built-in module manifests
        const builtinManifests = [
          {
            id: 'arunaos.files',
            name: 'Files',
            version: '1.0.0',
            description: 'File manager for ArunaOS',
            icon: 'folder',
            entry: '',
            type: 'builtin' as const,
            permissions: ['storage:read', 'storage:write', 'notification'] as const,
            window: {
              defaultWidth: 960,
              defaultHeight: 640,
              minWidth: 480,
              minHeight: 320,
              resizable: true,
            },
          },
          {
            id: 'arunaos.settings',
            name: 'Settings',
            version: '1.0.0',
            description: 'System preferences',
            icon: 'settings',
            entry: '',
            type: 'builtin' as const,
            permissions: ['storage:read', 'storage:write', 'notification'] as const,
            window: {
              defaultWidth: 720,
              defaultHeight: 520,
              minWidth: 480,
              minHeight: 360,
              resizable: true,
            },
          },
          {
            id: 'arunaos.astat',
            name: 'Activity Monitor',
            version: '1.0.0',
            description: 'System monitor',
            icon: 'activity',
            entry: '',
            type: 'builtin' as const,
            permissions: ['notification'] as const,
            window: {
              defaultWidth: 800,
              defaultHeight: 500,
              minWidth: 480,
              minHeight: 320,
              resizable: true,
            },
          },
          {
            id: 'arunaos.camera',
            name: 'Camera',
            version: '1.0.0',
            description: 'Photo and video capture',
            icon: 'camera',
            entry: '',
            type: 'builtin' as const,
            permissions: ['camera', 'notification'] as const,
            window: {
              defaultWidth: 800,
              defaultHeight: 600,
              minWidth: 480,
              minHeight: 360,
              resizable: true,
            },
          },
          {
            id: 'arunaos.ai',
            name: 'AI',
            version: '1.0.0',
            description: 'AI Chat Assistant',
            icon: 'sparkles',
            entry: '',
            type: 'builtin' as const,
            permissions: ['notification', 'clipboard:read', 'clipboard:write', 'network'] as const,
            window: {
              defaultWidth: 640,
              defaultHeight: 480,
              minWidth: 400,
              minHeight: 320,
              resizable: true,
            },
          },
          {
            id: 'arunaos.devtools',
            name: 'DevTools',
            version: '1.0.0',
            description: 'Module Developer Tools',
            icon: 'terminal',
            entry: '',
            type: 'system' as const,
            permissions: [] as const,
            window: {
              defaultWidth: 720,
              defaultHeight: 520,
              minWidth: 480,
              minHeight: 360,
              resizable: true,
            },
          },
          {
            id: 'arunaos.installer',
            name: 'Module Installer',
            version: '1.0.0',
            description: 'Install and manage modules',
            icon: 'package',
            entry: '',
            type: 'builtin' as const,
            permissions: ['notification'] as const,
            window: {
              defaultWidth: 640,
              defaultHeight: 480,
              minWidth: 400,
              minHeight: 320,
              resizable: true,
            },
          },
          {
            id: 'arunaos.appstore',
            name: 'AppStore',
            version: '1.0.0',
            description: 'Discover, install, and manage modules',
            icon: 'grid',
            entry: '',
            type: 'builtin' as const,
            permissions: ['network', 'notification'] as const,
            window: {
              defaultWidth: 900,
              defaultHeight: 640,
              minWidth: 480,
              minHeight: 400,
              resizable: true,
            },
          },
          {
            id: 'arunaos.weather',
            name: 'Weather',
            version: '1.0.0',
            description: 'Prakiraan cuaca real-time dengan data presisi',
            icon: '☀️',
            entry: '',
            type: 'builtin' as const,
            permissions: ['network', 'geolocation'] as const,
            window: {
              defaultWidth: 480,
              defaultHeight: 640,
              minWidth: 360,
              minHeight: 480,
              resizable: true,
            },
          },
          {
            id: 'arunaos.applications',
            name: 'Applications',
            version: '1.0.0',
            description: 'Semua aplikasi yang terinstal di ArunaOS',
            icon: 'grid',
            entry: '',
            type: 'builtin' as const,
            permissions: [] as const,
            window: {
              defaultWidth: 800,
              defaultHeight: 560,
              minWidth: 480,
              minHeight: 400,
              resizable: true,
            },
          },
        ];

        for (const manifest of builtinManifests) {
          moduleRegistry.register({
            ...manifest,
            permissions: [...manifest.permissions],
          });
        }

        // Set system API for module sandbox
        moduleLoader.setSystemAPI({
          openWindow: (config) => moduleWindowService.openModule(config.title, config.appData),
          closeWindow: (windowId) => moduleWindowService.closeModule(windowId),
          notify: (type, message, options) => {
            return notification.notify(type, message, options);
          },
          storage: {
            get: (key) => storage.get(key),
            set: (key, value) => storage.set(key, value),
            delete: (key) => storage.delete(key),
          },
          settings: {
            get: (k: string) => (settings as unknown as { get(key: string): unknown }).get(k),
            set: (k: string, v: unknown) =>
              (settings as unknown as { set(key: string, value: unknown): Promise<void> }).set(
                k,
                v,
              ),
          },
          theme: {
            getMode: () => theme.getMode(),
            setMode: (mode) => theme.setMode(mode as Parameters<typeof theme.setMode>[0]),
          },
          logger: {
            info: (mod, msg, data) => logger.info(mod, msg, data),
            warn: (mod, msg, data) => logger.warn(mod, msg, data),
            error: (mod, msg, data) => logger.error(mod, msg, data),
          },
        });

        cleanups.push(() => moduleIPC.destroy());

        // Register DevTools shortcut (Cmd+Shift+M)
        shortcut.register(
          'devtools',
          'meta+shift+m',
          () => {
            moduleWindowService.openModule('arunaos.devtools').catch(() => {});
          },
          { description: 'Open Module DevTools' },
        );

        // Register module factories (lazy-loaded)
        moduleLoader.registerFactory('arunaos.files', async () => {
          const { createFilesAPI } = await import('@modules/arunaos.files/api');
          return { api: createFilesAPI() };
        });
        moduleLoader.registerFactory('arunaos.settings', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.astat', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.camera', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.ai', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.devtools', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.installer', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.appstore', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.weather', async () => {
          return { api: {} };
        });
        moduleLoader.registerFactory('arunaos.applications', async () => {
          return { api: {} };
        });

        // Index search items for modules
        search.indexItems('modules', [
          {
            id: 'finder',
            label: 'Finder',
            description: 'Browse files',
            category: 'Module',
            action: () => {
              moduleWindowService.openModule('arunaos.files').catch(() => {});
            },
          },
          {
            id: 'files',
            label: 'Files',
            description: 'File manager',
            category: 'Module',
            action: () => {
              moduleWindowService.openModule('arunaos.files').catch(() => {});
            },
          },
          {
            id: 'settings',
            label: 'Settings',
            description: 'System preferences',
            category: 'Module',
            action: () => {
              moduleWindowService.openModule('arunaos.settings').catch(() => {});
            },
          },
          {
            id: 'astat',
            label: 'Activity Monitor',
            description: 'System monitor',
            category: 'Module',
            action: () => {
              moduleWindowService.openModule('arunaos.astat').catch(() => {});
            },
          },
          {
            id: 'camera',
            label: 'Camera',
            description: 'Photo and video capture',
            category: 'Module',
            action: () => {
              moduleWindowService.openModule('arunaos.camera').catch(() => {});
            },
          },
          {
            id: 'devtools',
            label: 'DevTools',
            description: 'Module Developer Tools',
            category: 'Module',
            keywords: ['developer', 'debug', 'modules', 'inspect'],
            action: () => {
              moduleWindowService.openModule('arunaos.devtools').catch(() => {});
            },
          },
          {
            id: 'installer',
            label: 'Module Installer',
            description: 'Install and manage modules',
            category: 'Module',
            keywords: ['modules', 'install', 'addon', 'extension'],
            action: () => {
              moduleWindowService.openModule('arunaos.installer').catch(() => {});
            },
          },
          {
            id: 'appstore',
            label: 'AppStore',
            description: 'Discover and install modules from the registry',
            category: 'Module',
            keywords: ['modules', 'install', 'browse', 'addon', 'extension', 'registry'],
            action: () => {
              moduleWindowService.openModule('arunaos.appstore').catch(() => {});
            },
          },
        ]);

        search.indexItems('settings', [
          {
            id: 'theme',
            label: 'Toggle Theme',
            description: 'Switch between light, dark, system, amoled, high-contrast',
            category: 'Action',
            keywords: ['dark', 'light', 'amoled', 'appearance'],
            action: () => {
              try {
                (container.get('theme') as ThemeService).toggle();
              } catch {
                /* service not ready */
              }
            },
          },
          {
            id: 'wallpaper',
            label: 'Change Wallpaper',
            description: 'Cycle desktop wallpaper',
            category: 'Action',
            action: () => {
              const cfg = settings.get('wallpaper');
              const types: Record<string, 'default' | 'gradient' | 'image'> = {
                default: 'gradient',
                gradient: 'image',
                image: 'default',
              };
              const nextType = types[cfg.type] ?? 'default';
              settings.set('wallpaper', {
                ...cfg,
                type: nextType,
                imagePath: nextType === 'image' && !cfg.imagePath ? '' : cfg.imagePath,
              });
            },
          },
          {
            id: 'lock-screen',
            label: 'Lock Screen',
            description: 'Lock the screen immediately',
            category: 'Action',
            keywords: ['lock', 'secure', 'password'],
            action: () => {
              try {
                useAuthStore.getState().lock();
              } catch {
                /* ignore */
              }
            },
          },
          {
            id: 'open-apps',
            label: 'Applications',
            description: 'Browse all applications',
            category: 'Action',
            keywords: ['apps', 'programs', 'launcher'],
            action: () => {
              moduleWindowService.openModule('arunaos.applications').catch(() => {});
            },
          },
          {
            id: 'open-weather',
            label: 'Weather',
            description: 'Check the weather',
            category: 'Action',
            keywords: ['weather', 'forecast', 'climate'],
            action: () => {
              moduleWindowService.openModule('arunaos.weather').catch(() => {});
            },
          },
        ]);

        container.register('eventBus', () => bus);
        container.register('logger', () => logger);
        container.register('storage', () => storage);
        container.register('settings', () => settings);
        container.register('theme', () => theme);
        container.register('notification', () => notification);
        container.register('modal', () => modal);
        container.register('shortcut', () => shortcut);
        container.register('search', () => search);
        container.register('workspace', () => workspace);
        container.register('lifecycle', () => lifecycle);
        container.register('moduleRegistry', () => moduleRegistry);
        container.register('moduleLoader', () => moduleLoader);
        container.register('moduleIPC', () => moduleIPC);
        container.register('moduleWindow', () => moduleWindowService);
        container.register('modulePermissions', () => modulePermissions);
        container.register('moduleSettings', () => moduleSettings);
        container.register('moduleStore', () => moduleStore);
        container.register('externalModuleLoader', () => externalModuleLoader);
        container.register('securityRating', () => securityRating);
        container.bootstrap();

        // Bootstrap Aruna Core
        try {
          const containerGet = {
            get: (name: string) => {
              try {
                return container.get(name);
              } catch {
                return undefined;
              }
            },
          };
          getArunaCore().init(containerGet);
          setCoreContainer(containerGet);
        } catch (e) {
          logger.warn('ServiceProvider', 'Failed to init Aruna Core', e);
        }

        if (cancelled) return;
        bus.emit('app:ready', { timestamp: Date.now() });
        logger.info('ServiceProvider', 'All services initialized successfully');
        setValue({ container, eventBus: bus, logger, ready: true, error: null });
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('ServiceProvider', 'Failed to bootstrap services', error);
        setValue({ container: new ServiceContainer(), eventBus: bus, logger, ready: false, error });
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      bus.clear();
      logger.info('ServiceProvider', 'Services cleaned up');
    };
  }, []);

  // Global error loggers
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      getLogger().error('Window', 'Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      getLogger().error('Window', 'Unhandled promise rejection', {
        message: reason.message,
        stack: reason.stack,
      });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!value) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-sm text-white/60">Initializing services...</p>
        </div>
      </div>
    );
  }

  if (value.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold">Service Initialization Failed</h1>
          <pre className="text-sm text-red-400">{value.error.message}</pre>
        </div>
      </div>
    );
  }

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useService<T>(name: string): T {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return ctx.container.get<T>(name);
}

export function useEventBus(): EventBus {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useEventBus must be used within a ServiceProvider');
  }
  return ctx.eventBus;
}

export function useLogger(): Logger {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useLogger must be used within a ServiceProvider');
  }
  return ctx.logger;
}

export function useServices(): ServiceContextValue {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return ctx;
}
