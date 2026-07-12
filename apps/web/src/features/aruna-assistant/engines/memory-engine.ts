import type { ArunaEngine, Memory, MemoryCategory, MemoryQuery } from './types';

const STORAGE_KEY = 'arunaos-memory';

export class MemoryEngine implements ArunaEngine {
  name = 'memory';

  private memories: Memory[] = [];

  async init() {
    this.load();
  }

  destroy() {
    this.save();
  }

  /* ── CRUD ──────────────────────────────────────────── */

  remember(content: string, category: MemoryCategory, metadata?: Record<string, string>): Memory {
    const mem: Memory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      content,
      timestamp: Date.now(),
      metadata,
    };
    this.memories.unshift(mem);
    this.save();
    return mem;
  }

  recall(query: MemoryQuery): Memory[] {
    let results = this.memories;

    if (query.category) {
      results = results.filter((m) => m.category === query.category);
    }

    if (query.keywords && query.keywords.length > 0) {
      const kw = query.keywords.map((k) => k.toLowerCase());
      results = results.filter((m) => kw.some((k) => m.content.toLowerCase().includes(k)));
    }

    if (query.since) {
      results = results.filter((m) => m.timestamp >= query.since!);
    }

    const limit = query.limit ?? 20;
    return results.slice(0, limit);
  }

  forget(id: string) {
    this.memories = this.memories.filter((m) => m.id !== id);
    this.save();
  }

  clear(category?: MemoryCategory) {
    if (category) {
      this.memories = this.memories.filter((m) => m.category !== category);
    } else {
      this.memories = [];
    }
    this.save();
  }

  /* ── Convenience ───────────────────────────────────── */

  recallRecent(limit = 5): Memory[] {
    return this.memories.slice(0, limit);
  }

  recallByCategory(category: MemoryCategory, limit = 10): Memory[] {
    return this.memories.filter((m) => m.category === category).slice(0, limit);
  }

  /* ── Persistence ───────────────────────────────────── */

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.memories = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
    } catch {
      /* ignore */
    }
  }
}
