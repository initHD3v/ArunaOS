import type { AIMessage, AIStreamChunk } from './types';

interface Pattern {
  regex: RegExp;
  respond: (match: RegExpMatchArray) => string;
}

const GREETING_WORDS = [
  'halo',
  'hai',
  'hi',
  'hello',
  'hey',
  'pagi',
  'siang',
  'sore',
  'malam',
  'selamat',
];
const FAREWELL_WORDS = ['bye', 'dadah', 'sampai jumpa', 'goodbye', 'see you'];
const GRATITUDE_WORDS = ['terima kasih', 'makasih', 'thanks', 'thank you'];

const PATTERNS: Pattern[] = [
  {
    regex: /\b(jam berapa|waktu|time|pukul)\b/i,
    respond: () => {
      const now = new Date();
      return `Sekarang pukul ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB.`;
    },
  },
  {
    regex: /\b(tanggal|date|hari ini)\b/i,
    respond: () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
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
      return `Hari ini ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}.`;
    },
  },
  {
    regex: /\b(cuaca|weather|berapa suhu)\b/i,
    respond: () =>
      'Cek informasi cuaca terkini lewat widget Cuaca di desktop atau panel notifikasi.',
  },
  {
    regex: /\b(help|bantuan|what can you do|apa yang bisa|command)\b/i,
    respond: () =>
      'Saya bisa membantu:\n' +
      '• Membuka modul/aplikasi (contoh: "buka kalkulator")\n' +
      '• Menampilkan waktu & tanggal\n' +
      '• Membuat modul baru (contoh: "buat catatan harian")\n' +
      '• Menjawab pertanyaan umum\n\n' +
      'Untuk kemampuan penuh, setup API key di Settings → AI.',
  },
  {
    regex: /\b(siapa (kamu|anda)|who are you|perkenalkan)\b/i,
    respond: () =>
      'Saya ArunaOS AI — asisten sistem operasi berbasis web. Saya siap bantu navigasi, kontrol sistem, dan tugas sehari-hari.',
  },
  {
    regex: /^\s*(buka|open|jalankan|start)\s+(.+)/i,
    respond: (match) =>
      `Membuka "${match[2]?.trim()}". Silakan gunakan launcher atau shortcut yang tersedia.`,
  },
  {
    regex: /\b(buat(kan)?|create|generate)\s+(modul|module|aplikasi|app)/i,
    respond: () =>
      'Gunakan Module DevTools → AI Generator untuk membuat modul dengan bantuan AI, atau setup API key untuk hasil lebih baik.',
  },
];

function getGreetingResponse(message: string): string | null {
  const lower = message.toLowerCase();
  const isGreeting = GREETING_WORDS.some((w) => lower.includes(w));
  if (isGreeting) {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi! Ada yang bisa saya bantu?';
    if (hour >= 11 && hour < 15) return 'Selamat siang! Ada yang bisa saya bantu?';
    if (hour >= 15 && hour < 19) return 'Selamat sore! Ada yang bisa saya bantu?';
    return 'Selamat malam! Ada yang bisa saya bantu?';
  }
  return null;
}

function getFarewellResponse(message: string): string | null {
  const lower = message.toLowerCase();
  if (FAREWELL_WORDS.some((w) => lower.includes(w)))
    return 'Sampai jumpa! Semoga harimu menyenangkan.';
  return null;
}

function getGratitudeResponse(message: string): string | null {
  const lower = message.toLowerCase();
  if (GRATITUDE_WORDS.some((w) => lower.includes(w))) return 'Sama-sama! Senang bisa membantu.';
  return null;
}

export class ChatFallback {
  respond(message: string): AIMessage {
    const content = this.generateResponse(message);
    return { role: 'assistant', content, timestamp: Date.now() };
  }

  async *respondStream(message: string): AsyncGenerator<AIStreamChunk> {
    const content = this.generateResponse(message);
    yield { type: 'text', content };
    yield { type: 'done', content: '', done: true };
  }

  private generateResponse(message: string): string {
    if (!message.trim()) return 'Silakan ketik pesan.';

    const greeting = getGreetingResponse(message);
    if (greeting) return greeting;

    const farewell = getFarewellResponse(message);
    if (farewell) return farewell;

    const gratitude = getGratitudeResponse(message);
    if (gratitude) return gratitude;

    for (const pattern of PATTERNS) {
      const match = message.match(pattern.regex);
      if (match) return pattern.respond(match);
    }

    return (
      'Maaf, saya belum bisa menjawab pertanyaan itu tanpa koneksi AI.\n\n' +
      'Setup API key di Settings → AI untuk mengaktifkan kemampuan penuh, ' +
      'atau coba pertanyaan seperti:\n' +
      '• "Jam berapa sekarang?"\n' +
      '• "Buka kalkulator"\n' +
      '• "Apa yang bisa kamu lakukan?"'
    );
  }
}
