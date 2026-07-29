interface ToolRoute {
  tool: string;
  args: Record<string, unknown>;
  confidence: number;
}

interface RouterContext {
  location?: { lat?: number; lon?: number; city?: string };
  modules?: Record<string, { name: string; description: string }>;
}

const MONTH_PATTERNS: Array<{ keywords: string[]; month: number }> = [
  { keywords: ['januari', 'january', 'jan'], month: 1 },
  { keywords: ['februari', 'february', 'feb'], month: 2 },
  { keywords: ['maret', 'march', 'mar'], month: 3 },
  { keywords: ['april', 'apr'], month: 4 },
  { keywords: ['mei', 'may'], month: 5 },
  { keywords: ['juni', 'june', 'jun'], month: 6 },
  { keywords: ['juli', 'july', 'jul'], month: 7 },
  { keywords: ['agustus', 'august', 'aug'], month: 8 },
  { keywords: ['september', 'sep'], month: 9 },
  { keywords: ['oktober', 'october', 'oct'], month: 10 },
  { keywords: ['november', 'nov'], month: 11 },
  { keywords: ['desember', 'december', 'dec'], month: 12 },
];

function findMentionedMonth(text: string): number | null {
  const lower = text.toLowerCase();
  for (const pattern of MONTH_PATTERNS) {
    for (const kw of pattern.keywords) {
      if (lower.includes(kw)) return pattern.month;
    }
  }
  return null;
}

function findMentionedYear(text: string): number | null {
  const match = text.match(/\b(20\d{2})\b/);
  const yearStr = match?.[1];
  return yearStr ? parseInt(yearStr, 10) : null;
}

function findAppId(
  text: string,
  modules?: Record<string, { name: string; description: string }>,
): string | null {
  if (!modules) return null;

  const lower = text.toLowerCase();

  for (const [id, info] of Object.entries(modules)) {
    const nameWords = info.name.toLowerCase().split(/\s+/);
    const descWords = info.description.toLowerCase().split(/\s+/);
    const idShort = id.split('.').pop() ?? '';

    if (nameWords.some((w) => w.length > 2 && lower.includes(w))) return id;
    if (descWords.some((w) => w.length > 3 && lower.includes(w))) return id;
    if (lower.includes(idShort)) return id;
    if (lower.includes(id)) return id;
  }

  return null;
}

export class ToolRouter {
  route(message: string, context: RouterContext): ToolRoute | null {
    const lower = message.toLowerCase().trim();
    if (!lower) return null;

    const timeDate = this.tryRouteDateTime(lower);
    if (timeDate) return timeDate;

    const weather = this.tryRouteWeather(lower, context);
    if (weather) return weather;

    const openApp = this.tryRouteOpenApp(lower, context);
    if (openApp) return openApp;

    return null;
  }

  private tryRouteDateTime(lower: string): ToolRoute | null {
    const timeWords = [
      'jam',
      'pukul',
      'waktu',
      'time',
      'hari',
      'day',
      'date',
      'tanggal',
      'bulan',
      'month',
      'tahun',
      'year',
      'kalender',
      'calendar',
      'sekarang',
      'skrg',
      'besok',
      'tomorrow',
      'kemarin',
      'yesterday',
      'minggu',
      'week',
      'dini',
      'pagi',
      'siang',
      'sore',
      'malam',
    ];

    const hasTimeWord = timeWords.some((w) => lower.includes(w));
    if (!hasTimeWord) return null;

    const eventWords = ['event', 'acara', 'agenda', 'festival', 'liburan', 'hari libur', 'jadwal'];
    if (eventWords.some((w) => lower.includes(w))) return null;

    const month = findMentionedMonth(lower);
    const year = findMentionedYear(lower);

    const args: Record<string, unknown> = {};
    if (month) args.month = month;
    if (year) args.year = year;

    return { tool: 'get_calendar', args, confidence: 0.8 };
  }

  private tryRouteWeather(lower: string, context: RouterContext): ToolRoute | null {
    const weatherWords = [
      'cuaca',
      'weather',
      'suhu',
      'temperatur',
      'temperature',
      'hujan',
      'rain',
      'panas',
      'hot',
      'dingin',
      'cold',
      'angin',
      'wind',
      'lembab',
      'humid',
      'derajat',
      '°',
      'celcius',
      'prakiraan',
      'forecast',
      'ramalan',
    ];

    const hasWeatherWord = weatherWords.some((w) => lower.includes(w));
    if (!hasWeatherWord) return null;

    const args: Record<string, unknown> = {};
    if (context.location?.lat) args.lat = context.location.lat;
    if (context.location?.lon) args.lon = context.location.lon;
    if (context.location?.city) args.city = context.location.city;

    return { tool: 'get_weather', args, confidence: 0.8 };
  }

  private tryRouteOpenApp(lower: string, context: RouterContext): ToolRoute | null {
    const openWords = ['buka', 'open', 'launch', 'jalankan', 'start', 'nyalakan'];
    const hasOpenWord = openWords.some((w) => lower.startsWith(w) || lower.includes(` ${w} `));
    if (!hasOpenWord) return null;

    const appId = findAppId(lower, context.modules);
    if (appId) {
      return { tool: 'open_app', args: { appId }, confidence: 0.9 };
    }

    return null;
  }
}
