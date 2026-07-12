import { useWindowStore } from '@/features/window-manager/stores/window.store';
import type { ModuleRegistry, ModuleLoader } from '@arunaos/runtime';

// Map full module IDs to short appIds used by the window system
export const MODULE_APP_ID_MAP: Record<string, string> = {
  'arunaos.files': 'files',
  'arunaos.settings': 'settings',
  'arunaos.astat': 'astat',
  'arunaos.camera': 'camera',
  'arunaos.ai': 'ai',
  'arunaos.devtools': 'devtools',
  'arunaos.appstore': 'appstore',
  'arunaos.applications': 'applications',
  'arunaos.weather': 'weather',
};

export function getAppIdForModule(moduleId: string): string {
  return MODULE_APP_ID_MAP[moduleId] ?? `module-${moduleId}`;
}

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

    const isMobile = viewportWidth < 768;

    // On mobile, fit window between menu bar and dock
    const MENUBAR_HEIGHT = 44;
    const DOCK_HEIGHT = 64;

    let dWidth = winConfig.defaultWidth ?? 640;
    let dHeight = winConfig.defaultHeight ?? 480;
    let posX: number;
    let posY: number;

    if (isMobile) {
      dWidth = viewportWidth;
      dHeight = viewportHeight - MENUBAR_HEIGHT - DOCK_HEIGHT;
      posX = 0;
      posY = MENUBAR_HEIGHT;
    } else {
      posX = Math.max(20, (viewportWidth - dWidth) / 2 + (Math.random() - 0.5) * 60);
      posY = Math.max(20, (viewportHeight - dHeight) / 2 + (Math.random() - 0.5) * 30);
    }

    const windowId = `module-${moduleId}-${Date.now()}`;

    const appId = getAppIdForModule(moduleId);

    const store = useWindowStore.getState();
    store.openWindow({
      id: windowId,
      title: manifest.name,
      icon: manifest.icon,
      appId,
      position: { x: posX, y: posY },
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
