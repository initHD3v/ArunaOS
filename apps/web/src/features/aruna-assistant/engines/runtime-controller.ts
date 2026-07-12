import type {
  RuntimeControllerEngine,
  RuntimeBridge,
  WindowController,
  ModuleController,
  WorkspaceController,
  NotificationController,
} from './types';

let windowStore: {
  getState: () => {
    windows: Record<string, { id: string; state: string }>;
    focusWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
  };
} | null = null;
let workspaceStore: {
  getState: () => {
    activeWorkspaceId: string;
    workspaces: Record<string, { id: string; name: string }>;
  };
  setState: (s: { activeWorkspaceId: string }) => void;
} | null = null;
let notificationStore: {
  getState: () => { queue: Array<{ id: string; type: string; message: string }> };
} | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  windowStore = require('@/features/window-manager/stores/window.store').useWindowStore;
} catch {
  /* ignore */
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  workspaceStore = require('@/features/workspace/stores/workspace.store').useWorkspaceStore;
} catch {
  /* ignore */
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  notificationStore = require('@/services/notification/notification-store').useNotificationStore;
} catch {
  /* ignore */
}

export class RuntimeController implements RuntimeControllerEngine {
  name = 'runtime-controller';

  bridge: RuntimeBridgeImpl;
  window: WindowControllerImpl;
  module: ModuleControllerImpl;
  workspace: WorkspaceControllerImpl;
  notification: NotificationControllerImpl;

  constructor() {
    this.bridge = new RuntimeBridgeImpl();
    this.window = new WindowControllerImpl(this.bridge);
    this.module = new ModuleControllerImpl(this.bridge);
    this.workspace = new WorkspaceControllerImpl();
    this.notification = new NotificationControllerImpl(this.bridge);
  }

  async init() {}

  destroy() {
    this.bridge.disconnect();
  }
}

/* ── Bridge ─────────────────────────────────────────── */

class RuntimeBridgeImpl implements RuntimeBridge {
  name = 'runtime-bridge';
  status: 'connected' | 'disconnected' | 'error' = 'disconnected';

  private container: { get: (name: string) => unknown } | null = null;

  connect(container: { get: (name: string) => unknown }) {
    this.container = container;
    this.status = 'connected';
  }

  disconnect() {
    this.container = null;
    this.status = 'disconnected';
  }

  getService<T>(name: string): T | null {
    if (!this.container) return null;
    try {
      return this.container.get(name) as T;
    } catch {
      return null;
    }
  }
}

/* ── Window Controller ──────────────────────────────── */

class WindowControllerImpl implements WindowController {
  private bridge: RuntimeBridgeImpl;

  constructor(bridge: RuntimeBridgeImpl) {
    this.bridge = bridge;
  }

  async openWindow(moduleId: string, params?: Record<string, unknown>): Promise<string | null> {
    const mw = this.bridge.getService<{
      openModule: (id: string, p?: Record<string, unknown>) => Promise<string>;
    }>('moduleWindow');
    if (!mw) return null;
    try {
      return await mw.openModule(moduleId, params);
    } catch {
      return null;
    }
  }

  async closeWindow(windowId: string) {
    const mw = this.bridge.getService<{ closeModule: (id: string) => void }>('moduleWindow');
    mw?.closeModule(windowId);
  }

  async focusWindow(windowId: string) {
    windowStore?.getState().focusWindow(windowId);
  }

  async minimizeWindow(windowId: string) {
    windowStore?.getState().minimizeWindow(windowId);
  }

  async maximizeWindow(windowId: string) {
    windowStore?.getState().maximizeWindow(windowId);
  }

  getActiveWindows(): string[] {
    try {
      const windows = windowStore?.getState().windows;
      if (!windows) return [];
      return Object.values(windows)
        .filter((w) => w.state === 'active')
        .map((w) => w.id);
    } catch {
      return [];
    }
  }
}

/* ── Module Controller ──────────────────────────────── */

class ModuleControllerImpl implements ModuleController {
  private bridge: RuntimeBridgeImpl;

  constructor(bridge: RuntimeBridgeImpl) {
    this.bridge = bridge;
  }

  async load(moduleId: string): Promise<boolean> {
    const loader = this.bridge.getService<{ load: (id: string) => Promise<void> }>('moduleLoader');
    const registry = this.bridge.getService<{ get: (id: string) => unknown }>('moduleRegistry');
    if (!loader || !registry) return false;
    if (!registry.get(moduleId)) return false;
    try {
      await loader.load(moduleId);
      return true;
    } catch {
      return false;
    }
  }

  async unload(moduleId: string): Promise<boolean> {
    const loader = this.bridge.getService<{ unload: (id: string) => Promise<void> }>(
      'moduleLoader',
    );
    if (!loader) return false;
    try {
      await loader.unload(moduleId);
      return true;
    } catch {
      return false;
    }
  }

  getStatus(moduleId: string): string {
    const registry = this.bridge.getService<{
      get: (id: string) => unknown;
      getStatus: (id: string) => string | null;
    }>('moduleRegistry');
    if (!registry) return 'unknown';
    const entry = registry.get(moduleId);
    if (!entry) return 'not-registered';
    const status = registry.getStatus(moduleId);
    return status ?? 'unknown';
  }

  getLoadedModules(): string[] {
    const loader = this.bridge.getService<{ getLoadedModules: () => string[] }>('moduleLoader');
    return loader?.getLoadedModules() ?? [];
  }

  search(query: string): Array<{ id: string; name: string }> {
    const registry = this.bridge.getService<{
      search: (q: string) => Array<{ manifest: { name: string } }>;
    }>('moduleRegistry');
    if (!registry) return [];
    try {
      return registry.search(query).map((entry) => ({
        id: (entry as unknown as { manifest: { id: string } }).manifest.id,
        name: entry.manifest.name,
      }));
    } catch {
      return [];
    }
  }
}

/* ── Workspace Controller ────────────────────────────── */

class WorkspaceControllerImpl implements WorkspaceController {
  getCurrent(): string {
    return workspaceStore?.getState().activeWorkspaceId ?? 'main';
  }

  async setWorkspace(id: string) {
    workspaceStore?.setState({ activeWorkspaceId: id });
  }

  getWorkspaces(): Array<{ id: string; name: string }> {
    try {
      const ws = workspaceStore?.getState().workspaces;
      if (!ws) return [{ id: 'main', name: 'Main' }];
      return Object.values(ws).map((w) => ({ id: w.id, name: w.name }));
    } catch {
      return [{ id: 'main', name: 'Main' }];
    }
  }

  getSuggestedWorkspace(): string | null {
    return null;
  }
}

/* ── Notification Controller ────────────────────────── */

class NotificationControllerImpl implements NotificationController {
  private bridge: RuntimeBridgeImpl;

  constructor(bridge: RuntimeBridgeImpl) {
    this.bridge = bridge;
  }

  async send(
    _title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
  ): Promise<string> {
    const ns = this.bridge.getService<{
      notify: (t: string, m: string, o?: { toast?: boolean; duration?: number }) => string;
    }>('notification');
    if (!ns) return '';
    return ns.notify(type, message, { toast: true });
  }

  async dismiss(id: string) {
    const ns = this.bridge.getService<{ dismiss: (id: string) => void }>('notification');
    ns?.dismiss(id);
  }

  getActive(): Array<{ id: string; title: string; message: string }> {
    try {
      const queue = notificationStore?.getState().queue;
      if (!queue) return [];
      return queue.map((n) => ({
        id: n.id,
        title: n.type,
        message: n.message,
      }));
    } catch {
      return [];
    }
  }

  getImportantCount(): number {
    try {
      const queue = notificationStore?.getState().queue;
      if (!queue) return 0;
      return queue.filter((n) => n.type === 'warning' || n.type === 'error').length;
    } catch {
      return 0;
    }
  }
}
