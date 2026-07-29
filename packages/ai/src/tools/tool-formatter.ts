import type { AIToolResult } from '../types';

function formatCurrentDateTime(): string {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const loc = typeof navigator !== 'undefined' ? navigator.language : 'id-ID';

  const datePart = new Intl.DateTimeFormat(loc, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  }).format(now);

  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const hour12 = hours % 12 || 12;
  const periode =
    hours < 4
      ? 'dini hari'
      : hours < 11
        ? 'pagi'
        : hours < 15
          ? 'siang'
          : hours < 18
            ? 'sore'
            : 'malam';

  return `${datePart}, jam ${hour12}:${minutes} ${periode}`;
}

export class ToolResultFormatter {
  format(toolName: string, result: AIToolResult): string {
    if (!result.success) return '';

    const info = this.formatInfo(toolName, result.data as Record<string, unknown>);
    if (!info) return '';

    return `Berikut informasi yang saya dapatkan:\n${info}`;
  }

  private formatInfo(toolName: string, data: Record<string, unknown>): string {
    switch (toolName) {
      case 'get_calendar':
        return this.formatCalendar(data);
      case 'get_weather':
        return this.formatWeather(data);
      case 'open_app':
        return this.formatOpenApp(data);
      case 'get_system_info':
        return this.formatSystemInfo(data);
      case 'get_system_context':
        return this.formatSystemContext(data);
      case 'search':
        return this.formatSearch(data);
      case 'notify':
        return this.formatNotify(data);
      case 'execute_command':
        return this.formatExecute(data);
      case 'generate_module':
        return this.formatGenerateModule(data);
      default:
        return '';
    }
  }

  private formatCalendar(data: Record<string, unknown>): string {
    const d = data as {
      localDateTime?: string;
      dayName: string;
      date: number;
      monthName: string;
      year: number;
      monthCalendar?: {
        events?: Array<{ day: number; name: string; type: string }>;
      };
    };

    let result: string;
    if (d.localDateTime) {
      result = `Saat ini ${formatCurrentDateTime()}.`;
    } else {
      result = `Hari ${d.dayName}, ${d.date} ${d.monthName} ${d.year}.`;
    }

    const events = d.monthCalendar?.events;
    if (events && events.length > 0) {
      const eventLines = events.map((e) => `  - ${e.day} ${d.monthName}: ${e.name}`);
      result += `\n\nAcara bulan ${d.monthName}:\n${eventLines.join('\n')}`;
    }

    return result;
  }

  private formatWeather(data: Record<string, unknown>): string {
    const d = data as {
      location?: string;
      current?: {
        temp: number;
        feelsLike: number;
        humidity: number;
        windSpeed: number;
        condition: string;
        emoji: string;
      };
    };

    if (!d.current) return '';

    const loc = d.location ?? 'Lokasi Anda';
    const { temp, feelsLike, humidity, windSpeed, condition, emoji } = d.current;
    const now = formatCurrentDateTime();

    return (
      `Saat ini ${now}. Cuaca di ${loc} ${temp}°C, ${condition} ${emoji}. ` +
      `Terasa ${feelsLike}°C. Kelembaban ${humidity}%, angin ${windSpeed} km/jam.`
    );
  }

  private formatOpenApp(data: Record<string, unknown>): string {
    const d = data as { message?: string; name?: string; appId?: string };
    return `Membuka ${d.name ?? d.appId}: ${d.message ?? ''}`;
  }

  private formatSystemInfo(data: Record<string, unknown>): string {
    const d = data as { platform?: string; timezone?: string };
    return `Platform ${d.platform ?? 'unknown'}, zona waktu ${d.timezone ?? 'unknown'}.`;
  }

  private formatSystemContext(_data: Record<string, unknown>): string {
    return 'Sistem berjalan normal.';
  }

  private formatSearch(data: Record<string, unknown>): string {
    const d = data as { query?: string; category?: string };
    return `Pencarian "${d.query}" di kategori ${d.category ?? 'semua'} telah dijalankan.`;
  }

  private formatNotify(data: Record<string, unknown>): string {
    const d = data as { title?: string; message?: string };
    return `Notifikasi terkirim: ${d.title}${d.message ? ` — ${d.message}` : ''}`;
  }

  private formatExecute(data: Record<string, unknown>): string {
    const d = data as { command?: string };
    return `Perintah "${d.command}" telah dijalankan.`;
  }

  private formatGenerateModule(data: Record<string, unknown>): string {
    const d = data as { name?: string; description?: string };
    return `Modul "${d.name}" sedang dibuat. Deskripsi: ${d.description}`;
  }
}
