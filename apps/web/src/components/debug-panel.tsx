'use client';

import { useEffect, useState } from 'react';
import { getLogger } from '@/lib/logger-client';
import type { LogEntry } from '@arunaos/services';

const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-slate-400',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setLogs(getLogger().getBuffer().slice(-200));
    }, 500);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="fixed bottom-12 right-4 z-[99999] flex h-80 w-[500px] flex-col rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/70">Debug</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60"
          >
            <option value="all">All</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">{logs.length} entries</span>
          <button
            onClick={() => {
              getLogger().clearBuffer();
              setLogs([]);
            }}
            className="text-[10px] text-white/30 hover:text-white/60"
          >
            Clear
          </button>
          <button onClick={() => setOpen(false)} className="text-xs text-white/50 hover:text-white">
            Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-relaxed">
        {filtered.length === 0 && <p className="italic text-white/20">No log entries</p>}
        {filtered.map((entry, i) => (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 text-white/20">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className={LEVEL_COLORS[entry.level] ?? ''}>[{entry.module}]</span>
            <span className="text-white/80">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
