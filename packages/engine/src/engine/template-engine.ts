export type TimeOfDay = 'pagi' | 'siang' | 'sore' | 'malam';

export interface EngineContext {
  timeOfDay: TimeOfDay;
  date: Date;
  weather?: {
    temp: number;
    condition: string;
    city: string;
  };
  tasks?: {
    total: number;
    done: number;
  };
  lastSession?: {
    tasksCompleted: number;
    topMood: string;
  };
}

export interface GreetingResult {
  greeting: string;
  mood: string;
}

const GREETING_TEMPLATES: Record<TimeOfDay, Array<{ greeting: string; mood: string }>> = {
  pagi: [
    {
      greeting:
        'Selamat pagi! ☀️ Matahari sudah terbit, saatnya memulai hari dengan semangat baru.',
      mood: 'Energetic',
    },
    {
      greeting: 'Pagi yang cerah! 🌅 Semoga hari ini penuh dengan hal-hal baik.',
      mood: 'Positive',
    },
    { greeting: 'Selamat pagi! Saatnya meraih mimpi-mimpi hari ini.', mood: 'Focused' },
  ],
  siang: [
    {
      greeting: 'Selamat siang! 🍵 Tetap semangat, masih ada waktu untuk menyelesaikan banyak hal.',
      mood: 'Focused',
    },
    { greeting: 'Siang hari yang produktif! Saatnya review progress.', mood: 'Productive' },
    { greeting: 'Selamat siang! Jangan lupa istirahat sejenak.', mood: 'Calm' },
  ],
  sore: [
    {
      greeting: 'Selamat sore! 🌇 Saatnya mereview apa yang sudah kamu capai hari ini.',
      mood: 'Reflective',
    },
    { greeting: 'Sore yang tenang. Bagaimana progres pekerjaanmu?', mood: 'Calm' },
    {
      greeting: 'Selamat sore! Waktu yang tepat untuk menyelesaikan task terakhir.',
      mood: 'Focused',
    },
  ],
  malam: [
    {
      greeting: 'Selamat malam! 🌙 Istirahat yang cukup, besok adalah hari yang baru.',
      mood: 'Calm',
    },
    { greeting: 'Malam yang damai. Saatnya recharge energy untuk besok.', mood: 'Reflective' },
    {
      greeting: 'Selamat malam! Jangan lupa evaluasi hari ini dan rencanakan besok.',
      mood: 'Reflective',
    },
  ],
};

function getSeed(ctx: EngineContext): number {
  const day = ctx.date.getDate();
  const month = ctx.date.getMonth();
  return day + month * 31;
}

const RAIN_CONDITIONS = ['rain', 'drizzle', 'thunderstorm', 'sleet'];
const SNOW_CONDITIONS = ['snow', 'heavy_snow'];
const CLOUDY_CONDITIONS = ['cloudy', 'overcast', 'foggy'];

function isRainy(condition: string): boolean {
  const c = condition.toLowerCase();
  return RAIN_CONDITIONS.some((x) => c.includes(x));
}

function isSnowy(condition: string): boolean {
  const c = condition.toLowerCase();
  return SNOW_CONDITIONS.some((x) => c.includes(x));
}

function isCloudy(condition: string): boolean {
  const c = condition.toLowerCase();
  return CLOUDY_CONDITIONS.some((x) => c.includes(x));
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length] ?? arr[0]!;
}

export class TemplateEngine {
  generateGreeting(ctx: EngineContext): GreetingResult {
    const templates = GREETING_TEMPLATES[ctx.timeOfDay];
    const seed = getSeed(ctx);
    const base = pick(templates, seed);

    let greeting = base.greeting;
    let mood = base.mood;

    // Personalize with weather
    if (ctx.weather) {
      const cond = ctx.weather.condition;
      if (ctx.weather.temp > 33) {
        greeting += ' Cuaca cukup panas hari ini, jaga hidrasi!';
      } else if (ctx.weather.temp < 25) {
        greeting += ' Cuaca sejuk, cocok untuk bekerja produktif.';
      } else if (isRainy(cond)) {
        greeting += ' Hujan di luar, saat yang tepat untuk fokus pada pekerjaan indoor.';
      } else if (isSnowy(cond)) {
        greeting += ' Salju di luar, pastikan kamu tetap hangat!';
      } else if (isCloudy(cond)) {
        greeting += ' Cuaca mendung, waktu yang cocok untuk deep work.';
      }
    }

    // Personalize with tasks
    if (ctx.tasks && ctx.tasks.total > 0) {
      const remaining = ctx.tasks.total - ctx.tasks.done;
      if (remaining > 0) {
        greeting += ` Kamu masih punya ${remaining} tugas tersisa.`;
      } else {
        greeting += ' Semua tugas sudah selesai! Selamat! 🎉';
      }
    }

    // Personalize with last session
    if (ctx.lastSession) {
      if (ctx.lastSession.tasksCompleted > 0) {
        mood = ctx.lastSession.topMood;
      }
    }

    return { greeting, mood };
  }

  generateMoodSuggestion(ctx: EngineContext): string {
    const hour = ctx.date.getHours();
    if (hour >= 4 && hour < 11) return 'Energetic — awali hari dengan semangat dan gerakan.';
    if (hour >= 11 && hour < 14)
      return 'Focused — fokus pada prioritas utama sebelum siang berakhir.';
    if (hour >= 14 && hour < 17)
      return 'Productive — gunakan energi sore untuk menyelesaikan task.';
    if (hour >= 17 && hour < 21) return 'Reflective — evaluasi hari ini dan rencanakan besok.';
    return 'Calm — tenangkan pikiran, istirahat yang cukup.';
  }

  generateSuggestion(ctx: EngineContext): string | null {
    if (ctx.tasks && ctx.tasks.total > 0) {
      const remaining = ctx.tasks.total - ctx.tasks.done;
      if (remaining > 3) {
        return `Kamu punya ${remaining} tugas tersisa. Mulai dari yang paling penting.`;
      }
      if (remaining === 0 && ctx.tasks.total > 0) {
        return 'Semua tugas selesai! Saatnya rewarding diri sendiri. 🎉';
      }
    }

    if (ctx.weather && isRainy(ctx.weather.condition)) {
      return 'Hujan di luar. Saat yang tepat untuk mengerjakan tugas yang butuh konsentrasi tinggi.';
    }

    return null;
  }

  getTimeOfDay(date?: Date): TimeOfDay {
    const h = (date ?? new Date()).getHours();
    if (h >= 4 && h < 11) return 'pagi';
    if (h >= 11 && h < 15) return 'siang';
    if (h >= 15 && h < 19) return 'sore';
    return 'malam';
  }

  getTimeEmoji(date?: Date): string {
    const tod = this.getTimeOfDay(date);
    switch (tod) {
      case 'pagi':
        return '🌅';
      case 'siang':
        return '☀️';
      case 'sore':
        return '🌇';
      case 'malam':
        return '🌙';
    }
  }
}
