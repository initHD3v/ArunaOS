import type { EventBus } from './event-bus';
import type { SettingsService } from './settings';

export type ThemeMode = 'light' | 'dark' | 'system' | 'amoled' | 'high-contrast';

export class ThemeService {
  private bus: EventBus;
  private settings: SettingsService;
  private currentMode: ThemeMode = 'system';

  constructor(settings: SettingsService, bus: EventBus) {
    this.settings = settings;
    this.bus = bus;
  }

  init(): void {
    this.currentMode = this.settings.get('theme');
    this.applyTheme(this.currentMode);

    this.bus.on('settings:updated', (payload: { key?: string }) => {
      if (payload.key === 'theme') {
        const mode = this.settings.get('theme') as ThemeMode;
        this.setMode(mode);
      }
    });
  }

  getMode(): ThemeMode {
    return this.currentMode;
  }

  async setMode(mode: ThemeMode): Promise<void> {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.applyTheme(mode);
    await this.settings.set('theme', mode);
    this.bus.emit('theme:changed', { mode });
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.classList.remove('theme-amoled', 'theme-high-contrast');

    switch (mode) {
      case 'amoled':
        root.classList.add('theme-amoled');
        this.applyColorScheme('dark');
        break;
      case 'high-contrast':
        root.classList.add('theme-high-contrast');
        this.applyColorScheme('light');
        break;
      case 'light':
        this.applyColorScheme('light');
        break;
      case 'dark':
        this.applyColorScheme('dark');
        break;
      case 'system':
      default:
        this.applyColorScheme(
          window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        );
        break;
    }
  }

  private applyColorScheme(scheme: 'light' | 'dark'): void {
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.classList.toggle('dark', scheme === 'dark');
    document.documentElement.classList.toggle('light', scheme === 'light');
  }

  async toggle(): Promise<ThemeMode> {
    const modes: ThemeMode[] = ['light', 'dark', 'system', 'amoled', 'high-contrast'];
    const idx = modes.indexOf(this.currentMode);
    const next: ThemeMode = idx === -1 ? modes[0]! : modes[(idx + 1) % modes.length]!;
    await this.setMode(next);
    return next;
  }
}
