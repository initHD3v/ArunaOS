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
import { NotificationService } from '@/services/notification/notification-service';
import { ModalService } from '@/services/modal/modal-service';
import { ShortcutService } from '@/services/shortcut/shortcut-service';
import { SearchService } from '@/services/search/search-service';
import { WindowAdapter } from '@/services/window-adapter';
import { WorkspaceService } from '@/services/workspace/workspace-service';
import { LifecycleService } from '@/services/lifecycle/lifecycle-service';
import { setLogger, getLogger } from '@/lib/logger-client';

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

        search.indexItems('modules', [
          {
            id: 'finder',
            label: 'Finder',
            description: 'Browse files',
            category: 'Module',
            action: () => {},
          },
          {
            id: 'files',
            label: 'Files',
            description: 'File manager',
            category: 'Module',
            action: () => {},
          },
          {
            id: 'settings',
            label: 'Settings',
            description: 'System preferences',
            category: 'Module',
            action: () => {},
          },
          {
            id: 'astat',
            label: 'Activity Monitor',
            description: 'System monitor',
            category: 'Module',
            action: () => {},
          },
          {
            id: 'camera',
            label: 'Camera',
            description: 'Photo and video capture',
            category: 'Module',
            action: () => {},
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
              /* TODO: implement wallpaper cycling */
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
        container.bootstrap();

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
