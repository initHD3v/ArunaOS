'use client';

export interface Searchable {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  category?: string;
  action: () => void;
}

interface IndexEntry {
  type: string;
  item: Searchable;
}

export class SearchService {
  private index: IndexEntry[] = [];

  indexItems(type: string, items: Searchable[]): void {
    this.index = [
      ...this.index.filter((e) => e.type !== type),
      ...items.map((item) => ({ type, item })),
    ];
  }

  remove(type: string, id: string): void {
    this.index = this.index.filter((e) => !(e.type === type && e.item.id === id));
  }

  removeType(type: string): void {
    this.index = this.index.filter((e) => e.type !== type);
  }

  query(q: string): Searchable[] {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return this.getRecentItems();

    const scored = this.index
      .map((entry) => {
        const label = entry.item.label.toLowerCase();
        const desc = (entry.item.description ?? '').toLowerCase();
        const keywords = (entry.item.keywords ?? []).map((k) => k.toLowerCase());
        const category = (entry.item.category ?? '').toLowerCase();

        let score = 0;

        if (label === trimmed) score += 100;
        else if (label.startsWith(trimmed)) score += 80;
        else if (label.includes(trimmed)) score += 60;

        if (desc.includes(trimmed)) score += 30;
        if (category.includes(trimmed)) score += 20;
        if (keywords.some((k) => k.includes(trimmed))) score += 10;

        const words = trimmed.split(/\s+/);
        const allWordsMatch = words.every(
          (w) => label.includes(w) || desc.includes(w) || keywords.some((k) => k.includes(w)),
        );
        if (allWordsMatch && words.length > 1) score += 40;

        return { entry, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s) => s.entry.item);

    return scored;
  }

  getRecentItems(limit = 10): Searchable[] {
    return this.index.slice(0, limit).map((e) => e.item);
  }

  clear(): void {
    this.index = [];
  }

  count(): number {
    return this.index.length;
  }
}
