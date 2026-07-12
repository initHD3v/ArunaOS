import type { ArunaEngine, TimeOfDay, DailyBrief, SystemContext } from './types';

let loadAccountFn: () => { displayName?: string; username?: string } = () => ({});
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loadAccountFn = require('@/features/settings/components/account-data').loadAccount;
} catch {
  /* not available */
}

const MESSAGES: Record<TimeOfDay, string[]> = {
  morning: [
    'Selamat pagi. Hari ini terlihat cerah dan penuh kesempatan.',
    'Pagi yang baik. Aku sudah menyiapkan ringkasan untukmu.',
    'Selamat pagi. Mari kita mulai hari dengan fokus.',
  ],
  afternoon: [
    'Siang yang produktif. Ada beberapa hal yang perlu perhatianmu.',
    'Semoga pekerjaanmu berjalan lancar hari ini.',
    'Istirahat sejenak mungkin akan membantu fokusmu.',
  ],
  evening: [
    'Hari yang cukup panjang. Ada beberapa progres yang perlu dicatat.',
    'Sore yang tenang. Aku sudah merangkum aktivitas hari ini.',
    'Waktunya mengevaluasi pekerjaan hari ini.',
  ],
  night: [
    'Malam yang damai. Besok kita lanjutkan lagi.',
    'Selamat malam. Semua sudah siap untuk hari esok.',
    'Waktunya beristirahat. Aku akan menjaga semuanya.',
  ],
};

const GREETINGS: Record<TimeOfDay, string> = {
  morning: 'Good Morning',
  afternoon: 'Good Afternoon',
  evening: 'Good Evening',
  night: 'Good Night',
};

const FOCUS_MESSAGES = [
  'Fokus pada satu hal besar hari ini akan memberikan hasil maksimal.',
  'Prioritaskan tugas yang paling penting terlebih dahulu.',
  'Cobalah teknik Pomodoro untuk menjaga konsentrasi.',
  'Break down tugas besar menjadi langkah-langkah kecil.',
];

export class PersonalityEngine implements ArunaEngine {
  name = 'personality';

  private username = 'User';

  async init() {
    try {
      const account = loadAccountFn();
      this.username = account.displayName || account.username || 'User';
    } catch {
      /* ignore */
    }
  }

  destroy() {}

  setUsername(name: string) {
    this.username = name;
  }

  getGreeting(timeOfDay: TimeOfDay): string {
    return GREETINGS[timeOfDay];
  }

  getPersonalityMessage(timeOfDay: TimeOfDay): string {
    const msgs = MESSAGES[timeOfDay] ?? MESSAGES.morning;
    return msgs[Math.floor(Math.random() * msgs.length)] ?? '';
  }

  getFocusRecommendation(): string {
    return FOCUS_MESSAGES[Math.floor(Math.random() * FOCUS_MESSAGES.length)] ?? '';
  }

  generateDailyBrief(ctx: SystemContext): DailyBrief {
    const tod = ctx.time.timeOfDay;
    const temp = ctx.weather ? `${ctx.weather.temp}° ${ctx.weather.condition}` : '--';

    return {
      greeting: `${this.getGreeting(tod)}, ${this.username}`,
      timeOfDay: tod,
      weather: `Cuaca hari ini ${temp}${ctx.weather ? ` di ${ctx.weather.city}` : ''}`,
      calendarSummary: '',
      emailSummary: '',
      pendingTasks: 0,
      focusRecommendation: this.getFocusRecommendation(),
      message: this.getPersonalityMessage(tod),
    };
  }
}
