import type { AIMessage, AIStreamChunk, AITool } from './types';
import { ToolRegistry } from './tools/registry';
import { ToolRouter } from './tools/tool-router';
import { ToolResultFormatter } from './tools/tool-formatter';
import { MODULE_REGISTRY } from './tools/system-tools';

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
      'Saya bisa membantu:\n• Membuka modul/aplikasi (contoh: "buka kalkulator")\n• Menampilkan waktu & tanggal\n• Membuat modul baru (contoh: "buat catatan harian")\n• Menjawab pertanyaan umum\n\nUntuk kemampuan penuh, setup API key di Settings → AI.',
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

const KNOWLEDGE_BASE: Array<{ patterns: RegExp[]; response: string }> = [
  {
    patterns: [/presiden indonesia/i, /indonesia.*presiden/i, /siapa presiden/i],
    response:
      'Presiden Indonesia saat ini adalah Prabowo Subianto, menjabat sejak 20 Oktober 2024.',
  },
  {
    patterns: [/ibu kota indonesia/i, /ibukota indonesia/i, /capital of indonesia/i],
    response: 'Ibu kota Indonesia adalah Nusantara di Kalimantan Timur.',
  },
  {
    patterns: [/prabowo/i],
    response:
      'Prabowo Subianto adalah Presiden Indonesia ke-8 yang menjabat sejak 20 Oktober 2024.',
  },
  {
    patterns: [/wakil presiden indonesia/i, /siapa wakil presiden/i, /\bwakil presiden\b/i],
    response:
      'Wakil Presiden Indonesia adalah Gibran Rakabuming Raka, menjabat sejak 20 Oktober 2024.',
  },
];

function getGreetingResponse(message: string): string | null {
  const lower = message.toLowerCase();
  if (GREETING_WORDS.some((w) => lower.includes(w))) {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi! Ada yang bisa saya bantu?';
    if (hour >= 11 && hour < 15) return 'Selamat siang! Ada yang bisa saya bantu?';
    if (hour >= 15 && hour < 19) return 'Selamat sore! Ada yang bisa saya bantu?';
    return 'Selamat malam! Ada yang bisa saya bantu?';
  }
  return null;
}

function getFarewellResponse(message: string): string | null {
  if (FAREWELL_WORDS.some((w) => message.toLowerCase().includes(w)))
    return 'Sampai jumpa! Semoga harimu menyenangkan.';
  return null;
}

function getGratitudeResponse(message: string): string | null {
  if (GRATITUDE_WORDS.some((w) => message.toLowerCase().includes(w)))
    return 'Sama-sama! Senang bisa membantu.';
  return null;
}

export class ChatFallback {
  private tools: ToolRegistry;
  private toolRouter: ToolRouter;
  private toolFormatter: ToolResultFormatter;

  constructor(toolList?: AITool[]) {
    this.tools = new ToolRegistry();
    if (toolList) {
      for (const tool of toolList) {
        this.tools.register(tool);
      }
    }
    this.toolRouter = new ToolRouter();
    this.toolFormatter = new ToolResultFormatter();
  }

  async respond(message: string): Promise<AIMessage> {
    const content = await this.generateResponse(message);
    return { role: 'assistant', content, timestamp: Date.now() };
  }

  async *respondStream(message: string): AsyncGenerator<AIStreamChunk> {
    yield { type: 'status', content: 'Thinking...', status: 'thinking' };

    const content = await this.generateResponse(message);

    yield { type: 'status', content: '', status: 'done' };
    yield { type: 'text', content };
    yield { type: 'done', content: '', done: true };
  }

  private async generateResponse(message: string): Promise<string> {
    if (!message.trim()) return 'Silakan ketik pesan.';

    const toolResult = await this.tryTools(message);
    if (toolResult) return toolResult;

    const kbResult = this.tryKnowledgeBase(message);
    if (kbResult) return kbResult;

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

  private async tryTools(message: string): Promise<string | null> {
    const route = this.toolRouter.route(message, { modules: MODULE_REGISTRY });
    if (!route) return null;

    const tool = this.tools.get(route.tool);
    if (!tool) return null;

    try {
      const result = await tool.execute(route.args);
      if (!result.success) return null;

      const note = this.toolFormatter.format(route.tool, result);
      if (!note) return null;

      return note.replace(/^Berikut informasi yang saya dapatkan:\n?/, '');
    } catch {
      return null;
    }
  }

  private tryKnowledgeBase(message: string): string | null {
    for (const entry of KNOWLEDGE_BASE) {
      if (entry.patterns.some((p) => p.test(message))) return entry.response;
    }
    return null;
  }
}
