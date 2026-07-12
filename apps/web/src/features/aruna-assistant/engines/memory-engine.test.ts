import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryEngine } from './memory-engine';

describe('MemoryEngine', () => {
  let mem: MemoryEngine;

  beforeEach(() => {
    localStorage.clear();
    mem = new MemoryEngine();
  });

  it('stores and retrieves memories', () => {
    const m = mem.remember('test content', 'short-term');
    expect(m.id).toBeTruthy();
    expect(m.content).toBe('test content');
    expect(m.category).toBe('short-term');

    const results = mem.recall({ category: 'short-term' });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(m.id);
  });

  it('filters by keywords', () => {
    mem.remember('hello world', 'semantic');
    mem.remember('goodbye world', 'semantic');
    mem.remember('foo bar', 'semantic');

    const results = mem.recall({ keywords: ['hello'] });
    expect(results).toHaveLength(1);
    expect(results[0]!.content).toBe('hello world');
  });

  it('limits results', () => {
    for (let i = 0; i < 10; i++) {
      mem.remember(`memory ${i}`, 'short-term');
    }
    const results = mem.recall({ limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('filters by category', () => {
    mem.remember('short', 'short-term');
    mem.remember('long', 'long-term');
    const short = mem.recall({ category: 'short-term' });
    expect(short).toHaveLength(1);
    expect(short[0]!.content).toBe('short');
  });

  it('filters by since timestamp', () => {
    mem.remember('new', 'short-term');
    const since = Date.now() + 1;
    // No memory should match a future timestamp
    const results = mem.recall({ since });
    expect(results).toHaveLength(0);
  });

  it('forgets specific memory', () => {
    const m = mem.remember('to forget', 'short-term');
    mem.forget(m.id);
    expect(mem.recall({})).toHaveLength(0);
  });

  it('clears all memories', () => {
    mem.remember('a', 'short-term');
    mem.remember('b', 'long-term');
    mem.clear();
    expect(mem.recall({})).toHaveLength(0);
  });

  it('clears by category', () => {
    mem.remember('a', 'short-term');
    mem.remember('b', 'long-term');
    mem.clear('short-term');
    const results = mem.recall({});
    expect(results).toHaveLength(1);
    expect(results[0]!.category).toBe('long-term');
  });

  it('recalls recent memories', () => {
    for (let i = 0; i < 5; i++) {
      mem.remember(`mem ${i}`, 'short-term');
    }
    const recent = mem.recallRecent(3);
    expect(recent).toHaveLength(3);
    expect(recent[0]!.content).toBe('mem 4');
  });

  it('recalls by category', () => {
    mem.remember('ep', 'episodic');
    mem.remember('st', 'short-term');
    const episodic = mem.recallByCategory('episodic');
    expect(episodic).toHaveLength(1);
  });

  it('persists to localStorage', () => {
    mem.remember('persist me', 'long-term');
    const mem2 = new MemoryEngine();
    mem2.init();
    const results = mem2.recall({});
    expect(results).toHaveLength(1);
    expect(results[0]!.content).toBe('persist me');
  });
});
