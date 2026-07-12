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
    const dWidth = winConfig.defaultWidth ?? 640;
    const dHeight = winConfig.defaultHeight ?? 480;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const APP_PAD = 8;
    const MENUBAR_HEIGHT = 44;

    // Always clamp to viewport — same behaviour on all devices
    const winWidth = Math.min(dWidth, vw - APP_PAD * 2);
    const winHeight = Math.min(dHeight, vh - MENUBAR_HEIGHT - APP_PAD);
    const winX = Math.round((vw - winWidth) / 2);
    const winY = MENUBAR_HEIGHT + Math.round((vh - MENUBAR_HEIGHT - winHeight) / 2);

    const windowId = `module-${moduleId}-${Date.now()}`;

    const appId = getAppIdForModule(moduleId);

    const store = useWindowStore.getState();
    store.openWindow({
      id: windowId,
      title: manifest.name,
      icon: manifest.icon,
      appId,
      position: { x: winX, y: winY },
      size: { width: winWidth, height: winHeight },
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
