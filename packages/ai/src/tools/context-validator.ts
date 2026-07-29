export type FactType = 'day' | 'period' | 'month' | 'year' | 'date';

export interface Fact {
  type: FactType;
  value: string;
}

export type ValidationResult = 'pass' | 'retry' | 'override';

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const PERIODS = ['dini hari', 'pagi', 'siang', 'sore', 'malam'];

const MONTH_NAMES = [
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

export class ContextValidator {
  extractFacts(contextNote: string): Fact[] {
    const facts: Fact[] = [];
    const lower = contextNote.toLowerCase();

    for (const day of DAY_NAMES) {
      if (lower.includes(day.toLowerCase())) {
        facts.push({ type: 'day', value: day });
        break;
      }
    }

    for (const period of PERIODS) {
      if (lower.includes(period)) {
        facts.push({ type: 'period', value: period });
        break;
      }
    }

    for (const month of MONTH_NAMES) {
      if (lower.includes(month.toLowerCase())) {
        facts.push({ type: 'month', value: month });
        break;
      }
    }

    const yearMatch = lower.match(/\b(20\d{2})\b/);
    if (yearMatch?.[1]) {
      facts.push({ type: 'year', value: yearMatch[1] });
    }

    const dayMonthMatch = lower.match(
      /(\d{1,2})\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i,
    );
    if (dayMonthMatch?.[1]) {
      facts.push({ type: 'date', value: dayMonthMatch[1] });
    }

    return facts;
  }

  checkContradiction(response: string, facts: Fact[]): string | null {
    const lower = response.toLowerCase();

    for (const fact of facts) {
      switch (fact.type) {
        case 'day': {
          const correct = fact.value.toLowerCase();
          if (lower.includes(correct)) break;
          for (const day of DAY_NAMES) {
            if (day.toLowerCase() === correct) continue;
            if (lower.includes(day.toLowerCase())) {
              return `hari: model "${day}", harusnya "${fact.value}"`;
            }
          }
          break;
        }
        case 'period': {
          const correct = fact.value;
          if (lower.includes(correct)) break;
          for (const period of PERIODS) {
            if (period === correct) continue;
            if (lower.includes(period)) {
              return `periode: model "${period}", harusnya "${fact.value}"`;
            }
          }
          break;
        }
        case 'month': {
          const correct = fact.value.toLowerCase();
          if (lower.includes(correct)) break;
          for (const month of MONTH_NAMES) {
            if (month.toLowerCase() === correct) continue;
            if (lower.includes(month.toLowerCase())) {
              return `bulan: model "${month}", harusnya "${fact.value}"`;
            }
          }
          break;
        }
        case 'year': {
          const match = lower.match(/\b(20\d{2})\b/);
          if (match?.[1] && match[1] !== fact.value) {
            return `tahun: model "${match[1]}", harusnya "${fact.value}"`;
          }
          break;
        }
        case 'date': {
          const match = lower.match(
            /(\d{1,2})\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i,
          );
          if (match?.[1] && match[1] !== fact.value) {
            return `tanggal: model "${match[1]}", harusnya "${fact.value}"`;
          }
          break;
        }
      }
    }

    return null;
  }

  validate(response: string, contextNote: string, retryCount: number): ValidationResult {
    if (!response || !contextNote) return 'pass';
    const facts = this.extractFacts(contextNote);
    if (facts.length === 0) return 'pass';
    const contradiction = this.checkContradiction(response, facts);
    if (!contradiction) return 'pass';
    return retryCount < 2 ? 'retry' : 'override';
  }

  generateSafeResponse(contextNote: string): string {
    const clean = contextNote.replace(/^Berikut informasi yang saya dapatkan:\n?/, '');
    return clean;
  }
}
