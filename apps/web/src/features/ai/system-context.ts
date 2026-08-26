import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useWeatherStore } from '@/features/weather/weather.store';
import { useLocationStore } from '@/stores/location.store';

export interface SystemContext {
  location: { city: string | null; lat: number; lon: number } | null;
  weather: {
    label: string;
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    city: string | null;
  } | null;
  system: {
    platform: string;
    cores: number;
    deviceMemoryGB: number | null;
    memoryUsedMB: number | null;
    memoryTotalMB: number | null;
    uptimeMinutes: number;
    online: boolean;
    openWindows: string[];
  };
}

/**
 * Snapshot of live ArunaOS state (location, weather, system stats) collected
 * on the client — the AI server has no access to these, so they must be
 * injected into the prompt for weather/status questions to be accurate.
 */
export function collectSystemContext(): SystemContext {
  const loc = useLocationStore.getState();
  const weather = useWeatherStore.getState();
  const windows = useWindowStore.getState().windows;

  const perfMemory = (
    performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }
  ).memory;

  return {
    location:
      loc.enabled && loc.latitude != null && loc.longitude != null
        ? { city: loc.city, lat: loc.latitude, lon: loc.longitude }
        : null,
    weather:
      weather.label && weather.temp !== 0
        ? {
            label: weather.label,
            temp: weather.temp,
            feelsLike: weather.feelsLike,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed,
            city: weather.city,
          }
        : null,
    system: {
      platform: navigator.platform ?? 'unknown',
      cores: navigator.hardwareConcurrency ?? 0,
      deviceMemoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      memoryUsedMB: perfMemory ? Math.round(perfMemory.usedJSHeapSize / 1048576) : null,
      memoryTotalMB: perfMemory ? Math.round(perfMemory.jsHeapSizeLimit / 1048576) : null,
      uptimeMinutes: Math.round(performance.now() / 60000),
      online: navigator.onLine,
      openWindows: Object.values(windows).map((w) => w.appId ?? w.title),
    },
  };
}

/**
 * Human-readable block appended to the AI message so the model answers
 * weather/system questions from real ArunaOS data instead of guessing.
 */
export function formatSystemContext(ctx: SystemContext): string {
  const lines: string[] = [];

  lines.push(
    ctx.location
      ? `- Location (detected by ArunaOS): ${ctx.location.city ?? 'unknown city'} (${ctx.location.lat.toFixed(4)}, ${ctx.location.lon.toFixed(4)})`
      : '- Location: not enabled by the user',
  );

  if (ctx.weather) {
    lines.push(
      `- Current weather at the user's location (live from ArunaOS weather module): ` +
        `${ctx.weather.label}, ${Math.round(ctx.weather.temp)}°C ` +
        `(feels like ${Math.round(ctx.weather.feelsLike)}°C), ` +
        `humidity ${Math.round(ctx.weather.humidity)}%, wind ${Math.round(ctx.weather.windSpeed)} km/h` +
        `${ctx.weather.city ? ` — ${ctx.weather.city}` : ''}`,
    );
  } else {
    lines.push('- Weather: no live data loaded yet in ArunaOS weather module');
  }

  const s = ctx.system;
  lines.push(
    `- System status (live from ArunaOS): platform ${s.platform}, ${s.cores} CPU cores` +
      `${s.deviceMemoryGB != null ? `, ~${s.deviceMemoryGB} GB RAM` : ''}` +
      `${s.memoryUsedMB != null ? `, JS heap ${s.memoryUsedMB} MB used of ${s.memoryTotalMB} MB` : ''}` +
      `, ArunaOS running for ${s.uptimeMinutes} min, ${s.online ? 'online' : 'offline'}` +
      (s.openWindows.length > 0
        ? `, ${s.openWindows.length} app(s) open: ${s.openWindows.join(', ')}`
        : ', no apps open'),
  );

  return lines.join('\n');
}

/**
 * Fire-and-forget weather refresh so the snapshot is warm by the time the
 * user submits a command. Safe to call repeatedly.
 */
export function ensureWeatherFresh(): void {
  const w = useWeatherStore.getState();
  if (w.loading || (w.label && w.temp !== 0)) return;
  void w.fetchWeather(w.lat, w.lon, w.city);
}
