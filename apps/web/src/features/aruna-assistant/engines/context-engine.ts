import type { ArunaEngine, SystemContext, TimeOfDay } from './types';

let arunaHomeStore: {
  getState: () => {
    weather: { temp: number; condition: string; icon: string; city: string } | null;
  };
} | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  arunaHomeStore = require('@/features/desktop-widgets/stores/aruna-home.store').useArunaHomeStore;
} catch {
  /* store not available */
}

export class ContextEngine implements ArunaEngine {
  name = 'context';

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(ctx: SystemContext) => void> = [];
  private _current: SystemContext | null = null;

  get current(): SystemContext | null {
    return this._current;
  }

  async init() {
    this.collect();
    this.intervalId = setInterval(() => this.collect(), 30_000);
  }

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.listeners = [];
  }

  onContextChange(fn: (ctx: SystemContext) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private collect() {
    const now = new Date();
    const h = now.getHours();

    let timeOfDay: TimeOfDay;
    if (h >= 4 && h < 11) timeOfDay = 'morning';
    else if (h >= 11 && h < 15) timeOfDay = 'afternoon';
    else if (h >= 15 && h < 19) timeOfDay = 'evening';
    else timeOfDay = 'night';

    /* Try reading weather from the existing store */
    let weather: SystemContext['weather'] = null;
    const w = arunaHomeStore?.getState().weather;
    if (w) {
      weather = { temp: w.temp, condition: w.condition, icon: w.icon, city: w.city };
    }

    const ctx: SystemContext = {
      time: {
        hour: h,
        minute: now.getMinutes(),
        dayOfWeek: now.getDay(),
        date: now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        timeOfDay,
      },
      weather,
      workspace: {
        activeModules: [],
        focusedWindow: null,
      },
      notifications: {
        total: 0,
        important: 0,
      },
      system: {
        battery: null,
        network: 'unknown',
        uptime: 0,
      },
    };

    this._current = ctx;
    this.listeners.forEach((fn) => fn(ctx));
  }
}
