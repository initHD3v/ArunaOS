import { useWindowStore } from '@/features/window-manager/stores/window.store';
import type { ModuleRegistry, ModuleLoader } from '@arunaos/runtime';

export class ModuleWindowService {
  private registry: ModuleRegistry;
  private loader: ModuleLoader;

  constructor(registry: ModuleRegistry, loader: ModuleLoader) {
    this.registry = registry;
    this.loader = loader;
  }

  async openModule(moduleId: string, params?: Record<string, unknown>): Promise<string> {
    const entry = this.registry.get(moduleId);
    if (!entry) {
      throw new Error(`Module '${moduleId}' not found in registry`);
    }

    // Load if not already loaded
    if (!this.loader.isLoaded(moduleId)) {
      await this.loader.load(moduleId);
    }

    const manifest = entry.manifest;
    const winConfig: {
      defaultWidth?: number;
      defaultHeight?: number;
      minWidth?: number;
      minHeight?: number;
      resizable?: boolean;
      titleBar?: boolean;
    } = manifest.window ?? {};
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const dWidth = winConfig.defaultWidth ?? 640;
    const dHeight = winConfig.defaultHeight ?? 480;

    const windowId = `module-${moduleId}-${Date.now()}`;

    // Built-in modules with dedicated components use their appId directly
    const appIdMap: Record<string, string> = {
      'arunaos.files': 'files',
      'arunaos.settings': 'settings',
      'arunaos.astat': 'astat',
      'arunaos.camera': 'camera',
      'arunaos.devtools': 'devtools',
    };
    const appId = appIdMap[moduleId] ?? `module-${moduleId}`;

    const store = useWindowStore.getState();
    store.openWindow({
      id: windowId,
      title: manifest.name,
      icon: manifest.icon,
      appId,
      position: {
        x: Math.max(20, (viewportWidth - dWidth) / 2 + (Math.random() - 0.5) * 60),
        y: Math.max(20, (viewportHeight - dHeight) / 2 + (Math.random() - 0.5) * 30),
      },
      size: { width: dWidth, height: dHeight },
      zIndex: 1,
      state: 'active',
      appData: params,
    });

    return windowId;
  }

  closeModule(windowId: string): void {
    const store = useWindowStore.getState();
    store.closeWindow(windowId);
  }
}
