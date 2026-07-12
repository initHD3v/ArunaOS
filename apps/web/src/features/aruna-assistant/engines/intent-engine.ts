import type { ArunaEngine, Intent, IntentType } from './types';

interface IntentPattern {
  type: IntentType;
  patterns: RegExp[];
  extractEntities: (text: string) => Record<string, string>;
}

const PATTERNS: IntentPattern[] = [
  {
    type: 'open-module',
    patterns: [
      /buka\s+(.+)/i,
      /open\s+(.+)/i,
      /tolong\s+buka\s+(.+)/i,
      /please\s+open\s+(.+)/i,
      /launch\s+(.+)/i,
      /jalankan\s+(.+)/i,
    ],
    extractEntities: (text) => {
      const match =
        text.match(/buka\s+(.+)/i) ||
        text.match(/open\s+(.+)/i) ||
        text.match(/tolong\s+buka\s+(.+)/i) ||
        text.match(/please\s+open\s+(.+)/i) ||
        text.match(/launch\s+(.+)/i) ||
        text.match(/jalankan\s+(.+)/i);
      return { target: match?.[1]?.trim() ?? '' };
    },
  },
  {
    type: 'search',
    patterns: [/cari\s+(.+)/i, /search\s+(.+)/i, /find\s+(.+)/i, /carikan\s+(.+)/i],
    extractEntities: (text) => {
      const match =
        text.match(/cari\s+(.+)/i) ||
        text.match(/search\s+(.+)/i) ||
        text.match(/find\s+(.+)/i) ||
        text.match(/carikan\s+(.+)/i);
      return { query: match?.[1]?.trim() ?? '' };
    },
  },
  {
    type: 'ask-info',
    patterns: [
      /(?:apa|siapa|kapan|dimana|bagaimana|mengapa)\s+(.+)/i,
      /(?:what|who|when|where|how|why)\s+(.+)/i,
      /(?:berapa|apakah|bisakah)\s+(.+)/i,
      /informasi\s+(?:tentang)?\s*(.+)/i,
      /info\s+(?:about)?\s*(.+)/i,
      /tell\s+me\s+(?:about|the)\s+(.+)/i,
    ],
    extractEntities: (text) => {
      // Extract the question part
      const cleaned = text.replace(/^(?:tolong|please|bisa|can you|could you)\s+/i, '').trim();
      return { question: cleaned };
    },
  },
  {
    type: 'create-task',
    patterns: [
      /(?:buat|tambah|add|create)\s+(?:task|tugas|todo)\s+(.+)/i,
      /(?:ingatkan|remind)\s+me\s+(?:to\s+)?(.+)/i,
      /catat\s+(.+)/i,
    ],
    extractEntities: (text) => {
      const match =
        text.match(/(?:buat|tambah|add|create)\s+(?:task|tugas|todo)\s+(.+)/i) ||
        text.match(/(?:ingatkan|remind)\s+me\s+(?:to\s+)?(.+)/i) ||
        text.match(/catat\s+(.+)/i);
      return { task: match?.[1]?.trim() ?? '' };
    },
  },
  {
    type: 'set-reminder',
    patterns: [
      /(?:ingatkan|remind)\s+(.+?)\s+(?:dalam|in|pukul|at)\s+(.+)/i,
      /set\s+(?:reminder|pengingat)\s+(.+)/i,
      /buat\s+(?:reminder|pengingat)\s+(.+)/i,
    ],
    extractEntities: (text) => {
      const match =
        text.match(/(?:ingatkan|remind)\s+(.+?)\s+(?:dalam|in|pukul|at)\s+(.+)/i) ||
        text.match(/(?:set|buat)\s+(?:reminder|pengingat)\s+(.+)/i);
      return {
        task: match?.[1]?.trim() ?? text,
        time: match?.[2]?.trim() ?? '',
      };
    },
  },
  {
    type: 'change-setting',
    patterns: [
      /(?:ubah|ganti|change|set|switch)\s+(.+?)\s+(?:ke|to|menjadi|jadi)\s+(.+)/i,
      /(?:aktifkan|enable|disable|matikan|turn\s+(?:on|off))\s+(.+)/i,
    ],
    extractEntities: (text) => {
      const match =
        text.match(/(?:ubah|ganti|change|set|switch)\s+(.+?)\s+(?:ke|to|menjadi|jadi)\s+(.+)/i) ||
        text.match(/(?:aktifkan|enable|disable|matikan|turn\s+(?:on|off))\s+(.+)/i);
      return {
        setting: match?.[1]?.trim() ?? '',
        value: match?.[2]?.trim() ?? 'toggle',
      };
    },
  },
  {
    type: 'greeting',
    patterns: [
      /^(halo|hai|hi|hello|hey|selamat\s+\w+)$/i,
      /^(good\s+(?:morning|afternoon|evening|night))/i,
      /^(pagi|siang|sore|malam)$/i,
    ],
    extractEntities: () => ({}),
  },
];

export class IntentEngine implements ArunaEngine {
  name = 'intent';

  async init() {}

  destroy() {}

  recognize(text: string): Intent {
    const trimmed = text.trim();
    if (!trimmed) {
      return { type: 'unknown', confidence: 0, entities: {}, raw: text };
    }

    let best: Intent = { type: 'unknown', confidence: 0, entities: {}, raw: text };

    for (const pattern of PATTERNS) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmed)) {
          const entities = pattern.extractEntities(trimmed);
          const confidence = this.calculateConfidence(pattern.type, trimmed);
          if (confidence > best.confidence) {
            best = { type: pattern.type, confidence, entities, raw: text };
          }
        }
      }
    }

    return best;
  }

  private calculateConfidence(type: IntentType, text: string): number {
    const length = text.length;
    let base = 0.6;

    // Longer, more specific inputs get higher confidence
    if (length > 20) base += 0.15;
    else if (length > 10) base += 0.1;

    // Greetings are short but high confidence
    if (type === 'greeting') base = 0.95;

    return Math.min(base, 1.0);
  }
}
