import type { EventBus } from './event-bus';
import type { StorageService } from './storage';

export type WallpaperType = 'default' | 'gradient' | 'image';

export interface WallpaperConfig {
  type: WallpaperType;
  gradientIndex: number;
  imagePath: string;
  blur: number;
}

export interface SettingsSchema {
  version: number;
  theme: 'light' | 'dark' | 'system' | 'amoled' | 'high-contrast';
  wallpaper: WallpaperConfig;
  language: string;
  accessibility: {
    reducedMotion: boolean;
    fontScale: number;
  };
  startup: {
    restoreWindows: boolean;
  };
  dev: {
    debugMode: boolean;
  };
  power: {
    screensaver: number;
    lock: number;
    sleep: number;
  };
}

export const DEFAULT_SETTINGS: SettingsSchema = {
  version: 2,
  theme: 'system',
  wallpaper: { type: 'default', gradientIndex: 0, imagePath: '', blur: 0 },
  language: 'en',
  accessibility: {
    reducedMotion: false,
    fontScale: 1,
  },
  startup: {
    restoreWindows: true,
  },
  dev: {
    debugMode: false,
  },
  power: {
    screensaver: 0,
    lock: 0,
    sleep: 0,
  },
};

const SETTINGS_KEY = 'arunaos_settings';

export type SettingsListener = (settings: SettingsSchema) => void;

export class SettingsService {
  private settings: SettingsSchema = { ...DEFAULT_SETTINGS };
  private storage: StorageService;
  private bus: EventBus;
  private ready = false;

  constructor(storage: StorageService, bus: EventBus) {
    this.storage = storage;
    this.bus = bus;
  }

  async init(): Promise<void> {
    let stored = await this.storage.get<Partial<SettingsSchema>>(SETTINGS_KEY);
    if (stored) {
      if (!stored.version || stored.version < DEFAULT_SETTINGS.version) {
        stored = this.migrate(stored);
      }
      this.settings = { ...DEFAULT_SETTINGS, ...stored, version: DEFAULT_SETTINGS.version };
    }
    this.ready = true;
    this.bus.emit('settings:loaded', { settings: this.settings });
  }

  private migrate(stored: Partial<SettingsSchema>): Partial<SettingsSchema> {
    if (!stored.version || stored.version < 2) {
      const oldWallpaper = (stored as Record<string, unknown>).wallpaper as
        { index?: number; blur?: number } | undefined;
      if (oldWallpaper && 'index' in oldWallpaper) {
        stored.wallpaper = {
          type: oldWallpaper.index && oldWallpaper.index > 0 ? 'gradient' : 'default',
          gradientIndex: oldWallpaper.index ?? 0,
          imagePath: '',
          blur: oldWallpaper.blur ?? 0,
        };
      }
      stored.version = 2;
    }
    return stored;
  }

  get<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
    return this.settings[key];
  }

  getAll(): SettingsSchema {
    return { ...this.settings };
  }

  async set<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): Promise<void> {
    this.settings[key] = value;
    await this.persist();
    this.bus.emit('settings:updated', { key, value, settings: this.settings });
  }

  async update(partial: Partial<SettingsSchema>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    await this.persist();
    for (const key of Object.keys(partial) as (keyof SettingsSchema)[]) {
      this.bus.emit('settings:updated', {
        key,
        value: this.settings[key],
        settings: this.settings,
      });
    }
  }

  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.persist();
    this.bus.emit('settings:updated', { settings: this.settings });
  }

  isReady(): boolean {
    return this.ready;
  }

  private async persist(): Promise<void> {
    await this.storage.set(SETTINGS_KEY, this.settings);
  }
}
