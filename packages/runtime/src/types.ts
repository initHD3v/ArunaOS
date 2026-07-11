export type ModuleType = 'system' | 'builtin' | 'external';

export type ModuleStatus = 'registered' | 'loading' | 'active' | 'suspended' | 'error';

export type Permission =
  | 'storage:read'
  | 'storage:write'
  | 'camera'
  | 'microphone'
  | 'notification'
  | 'clipboard:read'
  | 'clipboard:write'
  | 'network'
  | 'geolocation';

export interface ModuleWindowConfig {
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  titleBar?: boolean;
}

export interface ModuleAPIConfig {
  expose?: string[];
  require?: string[];
}

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  entry: string;
  type: ModuleType;
  permissions?: Permission[];
  window?: ModuleWindowConfig;
  shortcuts?: string[];
  dependencies?: string[];
  api?: ModuleAPIConfig;
}

export type ModuleInstance = Record<string, unknown>;

export interface ModuleEntry {
  manifest: ModuleManifest;
  status: ModuleStatus;
  instance: ModuleInstance | null;
  error?: Error;
}

export interface ModuleLifecycleHooks {
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
  onMount?(params?: Record<string, unknown>): Promise<void>;
  onUnmount?(): Promise<void>;
  onSleep?(): Promise<void>;
  onResume?(): Promise<void>;
  onThemeChange?(mode: string): void;
  onSettingsChange?(key: string, value: unknown): void;
}

export interface IPCMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'broadcast';
  source: string;
  target?: string;
  method?: string;
  event?: string;
  payload?: unknown;
  error?: string;
  timestamp: number;
}

export interface SystemAPI {
  // Window
  openWindow(config: {
    title: string;
    icon?: string;
    width?: number;
    height?: number;
    appData?: Record<string, unknown>;
  }): string | Promise<string>;
  closeWindow(windowId: string): void;

  // Notification
  notify(
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    options?: {
      duration?: number;
      action?: { label: string; handler: () => void };
    },
  ): string;

  // Storage
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // Settings
  settings: {
    get(key: string): unknown;
    set(key: string, value: unknown): Promise<void>;
  };

  // Theme
  theme: {
    getMode(): string;
    setMode(mode: string): Promise<void>;
  };

  // Logger
  logger: {
    info(module: string, message: string, data?: unknown): void;
    warn(module: string, message: string, data?: unknown): void;
    error(module: string, message: string, data?: unknown): void;
  };
}

// ── Phase 5: External Module ──

export interface ExternalModuleManifest extends ModuleManifest {
  type: 'external';
  checksum: string;
  manifestUrl: string;
  registry?: string;
  updatedAt?: string;
  signature?: string;
  homepage?: string;
  author?: string;
  categories?: string[];
  screenshots?: string[];
}

export interface UpdateInfo {
  id: string;
  currentVersion: string;
  latestVersion: string;
  manifestUrl: string;
}

export interface ExternalModuleEntry {
  id: string;
  manifest: ExternalModuleManifest;
  installedAt: number;
  updatedAt: number;
  source: 'url' | 'registry';
  bundleUrl: string;
  bundleSize: number;
}
