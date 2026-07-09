import type { EventBus } from './event-bus';
import type { StorageService } from './storage';

export interface SettingsSchema {
  version: number;
  theme: 'light' | 'dark' | 'system' | 'amoled' | 'high-contrast';
  wallpaper: { index: number; blur: number };
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
}

export const DEFAULT_SETTINGS: SettingsSchema = {
  version: 1,
  theme: 'system',
  wallpaper: { index: 0, blur: 0 },
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
    const stored = await this.storage.get<Partial<SettingsSchema>>(SETTINGS_KEY);
    if (stored) {
      this.settings = { ...DEFAULT_SETTINGS, ...stored, version: DEFAULT_SETTINGS.version };
    }
    this.ready = true;
    this.bus.emit('settings:loaded', { settings: this.settings });
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
