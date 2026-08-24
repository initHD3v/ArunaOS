import type { AITool, AIToolResult } from '../types';
import { HOLIDAYS_2026 } from '../data/holidays-2026';

async function resolveLocation(): Promise<{ lat: number; lon: number; city: string } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.latitude != null && d.longitude != null) {
      return {
        lat: d.latitude,
        lon: d.longitude,
        city: d.city ?? d.region ?? d.country_name ?? 'Unknown',
      };
    }
    return null;
  } catch {
    return null;
  }
}

function formatLocationName(addr: Record<string, string> | undefined): string | null {
  if (!addr) return null;

  const specific = addr.hamlet || addr.suburb || addr.neighbourhood || addr.isolated_dwelling || '';
  const local = addr.village || addr.town || addr.city || '';
  const county = addr.county || addr.state_district || '';
  const state = addr.state || '';
  const country = addr.country || '';

  let name: string;
  if (specific && local && specific !== local) {
    name = `${specific}, ${local}`;
  } else if (specific) {
    name = specific;
  } else if (local) {
    name = local;
  } else if (county) {
    name = county;
  } else if (state) {
    name = state;
  } else {
    return null;
  }

  return country ? `${name}, ${country}` : name;
}

async function resolveCityName(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id`,
      {
        headers: { 'User-Agent': 'arunaOS/1.0' },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = formatLocationName(data.address);
    if (result) return result;
    if (data.display_name) return data.display_name.split(', ').slice(0, 2).join(', ');
    return null;
  } catch {
    return null;
  }
}

const WMO_LABELS: Record<number, string> = {
  0: 'Cerah',
  1: 'Cerah Berawan',
  2: 'Berawan Sebagian',
  3: 'Berawan',
  45: 'Berkabut',
  48: 'Berkabut',
  51: 'Gerimis Ringan',
  53: 'Gerimis Sedang',
  55: 'Gerimis Deras',
  56: 'Gerimis Beku Ringan',
  57: 'Gerimis Beku Deras',
  61: 'Hujan Ringan',
  63: 'Hujan Sedang',
  65: 'Hujan Deras',
  66: 'Hujan Beku Ringan',
  67: 'Hujan Beku Deras',
  71: 'Salju Ringan',
  73: 'Salju Sedang',
  75: 'Salju Deras',
  77: 'Butiran Salju',
  80: 'Hujan Lokal Ringan',
  81: 'Hujan Lokal Sedang',
  82: 'Hujan Lokal Deras',
  85: 'Salju Lokal Ringan',
  86: 'Salju Lokal Deras',
  95: 'Badai Petir',
  96: 'Badai Petir dengan Hujan Es',
  99: 'Badai Petir dengan Hujan Es Deras',
};

function weatherCondition(code: number): string {
  return WMO_LABELS[code] ?? 'Tidak diketahui';
}

function weatherEmoji(code: number): string {
  if (code === 0) return '\u2600\uFE0F';
  if (code <= 3) return '\u26C5';
  if (code <= 48) return '\uD83C\uDF2B';
  if (code <= 57) return '\uD83C\uDF26';
  if (code <= 67) return '\uD83C\uDF27';
  if (code <= 77) return '\u2744\uFE0F';
  if (code <= 86) return '\uD83C\uDF26';
  return '\u26C8';
}

export function createSystemInfoTool(): AITool {
  return {
    id: 'get_system_info',
    name: 'get_system_info',
    description:
      'Get information about the current system state including OS, platform, and resources',
    category: 'system',
    parameters: [],
    async execute(): Promise<AIToolResult> {
      return {
        success: true,
        data: {
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'server',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          language: typeof navigator !== 'undefined' ? navigator.language : 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: Date.now(),
        },
      };
    },
  };
}

export const MODULE_REGISTRY: Record<string, { name: string; description: string }> = {
  'arunaos.files': {
    name: 'File Manager',
    description: 'Browse, manage, and organize files and folders',
  },
  'arunaos.settings': { name: 'Settings', description: 'System settings and configuration' },
  'arunaos.weather': { name: 'Weather', description: 'Real-time weather information and forecast' },
  'arunaos.camera': {
    name: 'Camera',
    description: 'Take photos and record videos using the device camera',
  },
  'arunaos.ai': { name: 'AI Chat', description: 'Chat with the ArunaOS AI assistant' },
  'arunaos.devtools': {
    name: 'Developer Tools',
    description: 'Developer utilities and debugging tools',
  },
  'arunaos.installer': { name: 'Installer', description: 'Install and manage system packages' },
  'arunaos.appstore': { name: 'App Store', description: 'Browse and install applications' },
  'arunaos.applications': {
    name: 'Applications',
    description: 'Browse all installed applications',
  },
};

export function createOpenAppTool(): AITool {
  return {
    id: 'open_app',
    name: 'open_app',
    description: 'Open an application or module by its ID',
    category: 'system',
    parameters: [
      {
        name: 'appId',
        type: 'string',
        description:
          'The ID of the application to open (e.g., "arunaos.files", "arunaos.settings")',
        required: true,
      },
    ],
    async execute(params): Promise<AIToolResult> {
      const appId = String(params.appId ?? '');
      if (!appId) {
        return { success: false, error: 'appId is required' };
      }
      const module = MODULE_REGISTRY[appId];
      return {
        success: true,
        data: {
          action: 'open_app',
          appId,
          name: module?.name ?? appId,
          description: module?.description ?? 'Unknown module',
          message: module ? `Membuka ${module.name}: ${module.description}` : `Opening ${appId}`,
        },
      };
    },
  };
}

export function createGetWeatherTool(): AITool {
  return {
    id: 'get_weather',
    name: 'get_weather',
    description:
      'Get real-time weather data for a location. Uses Open-Meteo API (free, no key). Returns current conditions, hourly forecast, and 7-day forecast.',
    category: 'system',
    parameters: [
      {
        name: 'lat',
        type: 'number',
        description: 'Latitude (optional — uses IP geolocation if omitted)',
      },
      {
        name: 'lon',
        type: 'number',
        description: 'Longitude (optional — uses IP geolocation if omitted)',
      },
      {
        name: 'city',
        type: 'string',
        description: 'City name for display (optional — auto-resolved from coordinates if omitted)',
      },
    ],
    async execute(params): Promise<AIToolResult> {
      let lat = Number(params.lat) || 0;
      let lon = Number(params.lon) || 0;
      let city = params.city ? String(params.city) : null;

      if (!lat || !lon) {
        const loc = await resolveLocation();
        if (loc) {
          lat = loc.lat;
          lon = loc.lon;
          if (!city) city = loc.city;
        } else {
          lat = -6.2088;
          lon = 106.8456;
        }
      }

      try {
        const paramsUrl = new URLSearchParams({
          latitude: lat.toString(),
          longitude: lon.toString(),
          current:
            'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
          hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code',
          daily:
            'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max,sunrise,sunset',
          timezone: 'auto',
          forecast_days: '7',
        });

        const url = `https://api.open-meteo.com/v1/forecast?${paramsUrl}`;
        let res: Response | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          try {
            res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) break;
          } catch {
            clearTimeout(timeoutId);
            if (attempt === 1) throw new Error('Weather API unavailable');
          }
        }
        if (!res || !res.ok) {
          return {
            success: false,
            error: `Weather API responded with ${res?.status ?? 'no response'}`,
          };
        }

        const data = await res.json();
        const current = data.current;

        if (!city) {
          city = await resolveCityName(lat, lon);
        }

        const now = new Date();
        const hourlyIdx = data.hourly.time.findIndex((t: string) => new Date(t) >= now);
        const hourlySlice = data.hourly.time.slice(hourlyIdx, hourlyIdx + 7);
        const hourly = hourlySlice.map((_: string, i: number) => {
          const idx = hourlyIdx + i;
          return {
            time: data.hourly.time[idx],
            temp: Math.round(data.hourly.temperature_2m[idx]),
            feelsLike: Math.round(data.hourly.apparent_temperature[idx]),
            weatherCode: data.hourly.weather_code[idx],
            condition: weatherCondition(data.hourly.weather_code[idx]),
            emoji: weatherEmoji(data.hourly.weather_code[idx]),
            precipitation: data.hourly.precipitation_probability[idx] ?? 0,
          };
        });

        const daily = data.daily.time.map((_: string, i: number) => ({
          date: data.daily.time[i],
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          weatherCode: data.daily.weather_code[i],
          condition: weatherCondition(data.daily.weather_code[i]),
          emoji: weatherEmoji(data.daily.weather_code[i]),
          precipitationSum: data.daily.precipitation_sum[i] ?? 0,
          precipitationProb: data.daily.precipitation_probability_max[i] ?? 0,
        }));

        const weatherCode: number = current.weather_code;

        return {
          success: true,
          data: {
            location: city ?? 'Lokasi tidak diketahui',
            lat,
            lon,
            timezone: data.timezone,
            current: {
              temp: Math.round(current.temperature_2m),
              feelsLike: Math.round(current.apparent_temperature),
              humidity: current.relative_humidity_2m,
              windSpeed: Math.round(current.wind_speed_10m),
              weatherCode,
              condition: weatherCondition(weatherCode),
              emoji: weatherEmoji(weatherCode),
            },
            hourly,
            daily,
            sunrise: data.daily.sunrise?.[0] ?? '',
            sunset: data.daily.sunset?.[0] ?? '',
          },
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Gagal mengambil data cuaca: ${msg}` };
      }
    },
  };
}

export function createGetCalendarTool(): AITool {
  return {
    id: 'get_calendar',
    name: 'get_calendar',
    description:
      'Get current date, time, calendar information, and Indonesian national holidays (2026). Returns day, week, month, year, month overview, and holiday events for the requested month/year.',
    category: 'system',
    parameters: [
      {
        name: 'year',
        type: 'number',
        description: 'Year (default: current year if omitted)',
      },
      {
        name: 'month',
        type: 'number',
        description: 'Month 1-12 (default: current month if omitted)',
      },
    ],
    async execute(params: Record<string, unknown>): Promise<AIToolResult> {
      const now = new Date();
      const targetYear = (params.year as number) ?? now.getFullYear();
      const targetMonth = ((params.month as number) ?? now.getMonth() + 1) - 1;

      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthNames = [
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
      ];

      const year = now.getFullYear();
      const date = now.getDate();
      const dayOfWeek = now.getDay();
      const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 0).getTime()) / 86_400_000);

      const startOfYear = new Date(year, 0, 1);
      const diff = now.getTime() - startOfYear.getTime();
      const weekNumber = Math.ceil((diff / 86_400_000 + startOfYear.getDay() + 1) / 7);

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = typeof navigator !== 'undefined' ? navigator.language : 'id-ID';

      const localTime = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone,
        hour12: false,
      }).format(now);

      const localDate = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone,
      }).format(now);

      const localDateTime = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone,
        hour12: false,
      }).format(now);

      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(targetYear, targetMonth, 1).getDay();

      const monthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
      const events = Object.entries(HOLIDAYS_2026)
        .filter(([key]) => key.startsWith(monthPrefix))
        .flatMap(([key, evts]) =>
          evts.map((e) => ({
            date: key,
            day: parseInt(key.split('-')[2]!, 10),
            name: e.name,
            type: e.type,
            category: e.category,
          })),
        )
        .sort((a, b) => a.day - b.day);

      const weeks: Array<{ week: number; days: Array<{ day: number; isToday: boolean }> }> = [];
      let currentWeek: Array<{ day: number; isToday: boolean }> = [];

      for (let i = 0; i < firstDayOfMonth; i++) {
        currentWeek.push({ day: 0, isToday: false });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        currentWeek.push({
          day: d,
          isToday: d === date && now.getMonth() === targetMonth && now.getFullYear() === targetYear,
        });
        if (currentWeek.length === 7) {
          weeks.push({ week: weeks.length + 1, days: currentWeek });
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ day: 0, isToday: false });
        }
        weeks.push({ week: weeks.length + 1, days: currentWeek });
      }

      return {
        success: true,
        data: {
          iso: now.toISOString(),
          timestamp: now.getTime(),
          year: targetYear,
          month: targetMonth + 1,
          monthName: monthNames[targetMonth],
          date,
          dayOfWeek,
          dayName: dayNames[dayOfWeek],
          dayOfYear,
          weekNumber,
          daysInMonth,
          timezone: timeZone,
          locale,
          localTime,
          localDate,
          localDateTime,
          monthCalendar: {
            year: targetYear,
            month: targetMonth + 1,
            monthName: monthNames[targetMonth],
            daysInMonth,
            firstDayOfMonth,
            weeks,
            events,
          },
        },
      };
    },
  };
}

export function createSearchTool(): AITool {
  return {
    id: 'search',
    name: 'search',
    description: 'Search for files, modules, settings, or any content in the system',
    category: 'search',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query',
        required: true,
      },
      {
        name: 'category',
        type: 'string',
        description: 'Category to search in (files, modules, settings, apps)',
        enum: ['files', 'modules', 'settings', 'apps', 'all'],
      },
    ],
    async execute(params): Promise<AIToolResult> {
      const query = String(params.query ?? '');
      if (!query) {
        return { success: false, error: 'query is required' };
      }
      return {
        success: true,
        data: { action: 'search', query, category: params.category ?? 'all' },
      };
    },
  };
}

export function createGetSystemContextTool(): AITool {
  return {
    id: 'get_system_context',
    name: 'get_system_context',
    description:
      'Get the current system context including active windows, workspace state, theme, and modules',
    category: 'system',
    parameters: [],
    async execute(): Promise<AIToolResult> {
      return {
        success: true,
        data: { action: 'get_system_context' },
      };
    },
  };
}

export function createNotifyTool(): AITool {
  return {
    id: 'notify',
    name: 'notify',
    description: 'Send a desktop notification to the user',
    category: 'system',
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Notification title',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        description: 'Notification message body',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Notification type',
        enum: ['info', 'success', 'warning', 'error'],
      },
    ],
    async execute(params): Promise<AIToolResult> {
      return {
        success: true,
        data: {
          action: 'notify',
          title: params.title,
          message: params.message,
          type: params.type ?? 'info',
        },
      };
    },
  };
}

export function createExecuteCommandTool(): AITool {
  return {
    id: 'execute_command',
    name: 'execute_command',
    description: 'Execute a system command or action (like opening settings, toggling theme, etc.)',
    category: 'system',
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'The command to execute',
        required: true,
      },
      {
        name: 'params',
        type: 'object',
        description: 'Optional parameters for the command',
      },
    ],
    async execute(params): Promise<AIToolResult> {
      return {
        success: true,
        data: { action: 'execute_command', command: params.command, params: params.params },
      };
    },
  };
}

export function createModuleGeneratorTool(): AITool {
  return {
    id: 'generate_module',
    name: 'generate_module',
    description:
      'Generate a new ArunaOS module based on a description. Returns the module code, manifest, and file structure.',
    category: 'module',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name of the module',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of what the module does',
        required: true,
      },
      {
        name: 'capabilities',
        type: 'array',
        description: 'List of capabilities the module should have',
      },
    ],
    async execute(params): Promise<AIToolResult> {
      const name = String(params.name ?? '').trim();
      const description = String(params.description ?? '').trim();
      if (!name || !description) {
        return { success: false, error: 'name and description are required' };
      }
      const capabilities = Array.isArray(params.capabilities)
        ? (params.capabilities as unknown[]).map(String)
        : [];
      try {
        // Defer import to avoid a circular dependency — ai-generator imports
        // AIService from the same package root.
        const { AIModuleGenerator } = await import('../ai-generator');
        const generator = new AIModuleGenerator();
        const result = await generator.generate({ name, description, capabilities });
        return {
          success: true,
          data: {
            action: 'generate_module',
            id: result.id,
            manifest: result.manifest,
            files: Object.keys(result.files ?? {}),
            code: result.code,
            codeLength: typeof result.code === 'string' ? result.code.length : 0,
            message: `Modul '${result.id}' berhasil dibuat dan siap diinstall.`,
          },
        };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Module generation failed',
        };
      }
    },
  };
}

export function getDefaultTools(): AITool[] {
  return [
    createSystemInfoTool(),
    createOpenAppTool(),
    createGetWeatherTool(),
    createGetCalendarTool(),
    createSearchTool(),
    createGetSystemContextTool(),
    createNotifyTool(),
    createExecuteCommandTool(),
    createModuleGeneratorTool(),
  ];
}
