export class WebSearchCache {
  private cache = new Map<string, { result: string; timestamp: number }>();
  private readonly TTL = 30 * 60 * 1000;

  get(query: string): string | null {
    const key = query.toLowerCase().trim();
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.TTL) return entry.result;
    this.cache.delete(key);
    return null;
  }

  set(query: string, result: string): void {
    const key = query.toLowerCase().trim();
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}

export class WebSearchRateLimiter {
  private lastSearch = 0;
  private count = 0;
  private windowStart = Date.now();
  private readonly MIN_INTERVAL = 2000;
  private readonly MAX_PER_MINUTE = 10;

  canSearch(): boolean {
    const now = Date.now();
    if (now - this.lastSearch < this.MIN_INTERVAL) return false;
    if (now - this.windowStart > 60000) {
      this.count = 0;
      this.windowStart = now;
    }
    if (this.count >= this.MAX_PER_MINUTE) return false;
    return true;
  }

  recordSearch(): void {
    this.lastSearch = Date.now();
    this.count++;
  }
}

const GREETINGS = ['halo', 'hai', 'hi', 'hey', 'selamat', 'pagi', 'siang', 'sore', 'malam', 'good'];
const FAREWELLS = ['bye', 'dadah', 'sampai jumpa', 'goodbye', 'see you'];
const GRATITUDES = ['terima kasih', 'makasih', 'thanks', 'thank you'];

export function shouldSearchWeb(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (!lower || lower.length < 5) return false;
  if (GREETINGS.some((g) => lower.startsWith(g) || lower === g)) return false;
  if (FAREWELLS.some((w) => lower.includes(w))) return false;
  if (GRATITUDES.some((w) => lower.includes(w))) return false;
  return true;
}

async function searchWikipedia(query: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(query);
    const summaryUrl = `https://id.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(4000) });
    if (summaryRes.ok) {
      const data = await summaryRes.json();
      if (data.extract) return data.extract.slice(0, 600);
      if (data.description) return data.description;
    }

    const searchUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srlimit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;

    const detailRes = await fetch(
      `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!detailRes.ok) return null;
    const detail = await detailRes.json();
    return detail.extract ? detail.extract.slice(0, 600) : null;
  } catch {
    return null;
  }
}

async function searchDuckDuckGo(query: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      no_html: '1',
      skip_disambig: '1',
    });
    const res = await fetch(`https://api.duckduckgo.com/?${params}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (data.AbstractText) return data.AbstractText.slice(0, 600);

    if (data.RelatedTopics?.length > 0) {
      const texts: string[] = [];
      for (const topic of data.RelatedTopics.slice(0, 3)) {
        if (topic.Text) texts.push(topic.Text);
      }
      if (texts.length > 0) return texts.join('\n').slice(0, 600);
    }

    return null;
  } catch {
    return null;
  }
}

const cache = new WebSearchCache();
const rateLimiter = new WebSearchRateLimiter();

export async function webSearch(query: string): Promise<string | null> {
  const cached = cache.get(query);
  if (cached) return cached;

  if (!rateLimiter.canSearch()) return null;
  rateLimiter.recordSearch();

  const wikiResult = await searchWikipedia(query);
  if (wikiResult) {
    cache.set(query, wikiResult);
    return wikiResult;
  }

  const ddgResult = await searchDuckDuckGo(query);
  if (ddgResult) {
    cache.set(query, ddgResult);
    return ddgResult;
  }

  return null;
}
