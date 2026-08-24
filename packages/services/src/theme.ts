import type { EventBus } from './event-bus';
import type { SettingsService } from './settings';

export type ThemeMode = 'light' | 'dark' | 'system' | 'amoled' | 'high-contrast';

export class ThemeService {
  private bus: EventBus;
  private settings: SettingsService;
  private currentMode: ThemeMode = 'system';
  private disposeSettingsListener: (() => void) | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(settings: SettingsService, bus: EventBus) {
    this.settings = settings;
    this.bus = bus;
  }

  init(): void {
    // B13: make init idempotent — calling it twice (StrictMode/HMR) used to
    // stack duplicate settings listeners.
    if (this.disposeSettingsListener) return;

    this.currentMode = this.settings.get('theme');
    this.applyTheme(this.currentMode);

    this.disposeSettingsListener = this.bus.on('settings:updated', (payload: { key?: string }) => {
      if (payload.key === 'theme') {
        const mode = this.settings.get('theme') as ThemeMode;
        void this.setMode(mode);
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
          typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : 'light',
        );
        break;
    }

    // B13: in 'system' mode, follow OS theme switches live.
    this.syncSystemListener(mode);
  }

  private syncSystemListener(mode: ThemeMode): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    if (mode === 'system') {
      if (this.mediaQuery) return;
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery = mq;
      this.mediaListener = () => {
        if (this.currentMode === 'system') this.applyTheme('system');
      };
      mq.addEventListener('change', this.mediaListener);
    } else if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener('change', this.mediaListener);
      this.mediaQuery = null;
      this.mediaListener = null;
    }
  }

  dispose(): void {
    this.disposeSettingsListener?.();
    this.disposeSettingsListener = null;
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener('change', this.mediaListener);
    }
    this.mediaQuery = null;
    this.mediaListener = null;
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
