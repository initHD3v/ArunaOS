import type { ArunaEngine, ToolAction } from './types';

let desktopStore: { getState: () => { triggerRefresh: () => void } } | null = null;
let authStore: { getState: () => { lock: () => void } } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  desktopStore = require('@/features/desktop/stores/desktop.store').useDesktopStore;
} catch {
  /* ignore */
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  authStore = require('@/stores/auth.store').useAuthStore;
} catch {
  /* ignore */
}

const MODULE_ALIASES: Record<string, string> = {
  files: 'arunaos.files',
  settings: 'arunaos.settings',
  pengaturan: 'arunaos.settings',
  astat: 'arunaos.astat',
  camera: 'arunaos.camera',
  kamera: 'arunaos.camera',
  devtools: 'arunaos.devtools',
  installer: 'arunaos.installer',
  appstore: 'arunaos.appstore',
  weather: 'arunaos.weather',
  cuaca: 'arunaos.weather',
  applications: 'arunaos.applications',
  apps: 'arunaos.applications',
  ai: 'arunaos.ai',
};

export class ToolCallingEngine implements ArunaEngine {
  name = 'tool-calling';

  private tools: ToolAction[] = [];
  private moduleWindow: { openModule: (id: string) => Promise<void> } | null = null;

  async init() {
    // Will be connected when core is initialized with service container
  }

  destroy() {}

  connect(container: { get: (name: string) => unknown }) {
    try {
      this.moduleWindow = container.get('moduleWindow') as {
        openModule: (id: string) => Promise<void>;
      };
    } catch {
      /* ignore */
    }
    this.registerBuiltInTools();
  }

  private registerBuiltInTools() {
    this.tools = [
      {
        id: 'open-module',
        name: 'Open Module',
        description: 'Membuka module/aplikasi tertentu',
        execute: async (params) => {
          const target = (params.target ?? '').toLowerCase().trim();
          const moduleId = MODULE_ALIASES[target] ?? target;
          if (this.moduleWindow) {
            const id = moduleId.startsWith('arunaos.') ? moduleId : `arunaos.${moduleId}`;
            await this.moduleWindow.openModule(id);
          }
        },
      },
      {
        id: 'search-web',
        name: 'Search Web',
        description: 'Mencari informasi di web',
        execute: async (params) => {
          const query = params.query ?? '';
          window.open(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, '_blank');
        },
      },
      {
        id: 'change-wallpaper',
        name: 'Change Wallpaper',
        description: 'Mengganti wallpaper desktop',
        execute: async () => {
          try {
            desktopStore?.getState().triggerRefresh();
          } catch {
            /* ignore */
          }
        },
      },
      {
        id: 'lock-screen',
        name: 'Lock Screen',
        description: 'Mengunci layar',
        execute: async () => {
          try {
            authStore?.getState().lock();
          } catch {
            /* ignore */
          }
        },
      },
    ];
  }

  getTools(): ToolAction[] {
    return [...this.tools];
  }

  async executeTool(id: string, params: Record<string, string>): Promise<boolean> {
    const tool = this.tools.find((t) => t.id === id);
    if (!tool) return false;
    try {
      await tool.execute(params);
      return true;
    } catch {
      return false;
    }
  }

  async executeIntent(type: string, entities: Record<string, string>): Promise<string> {
    switch (type) {
      case 'open-module': {
        const ok = await this.executeTool('open-module', entities);
        if (ok) return `Membuka ${entities.target}...`;
        return `Maaf, saya tidak dapat membuka ${entities.target}`;
      }
      case 'search': {
        await this.executeTool('search-web', entities);
        return `Mencari informasi tentang ${entities.query}...`;
      }
      case 'greeting': {
        return '';
      }
      default:
        return 'Maaf, saya belum bisa melakukan itu. Saat ini saya masih dalam tahap pengembangan.';
    }
  }
}
