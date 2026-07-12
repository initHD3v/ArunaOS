'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import type { ModuleStore, ModuleStoreState } from '@arunaos/runtime';
import type { ModuleWindowService } from '@/services/module-window';
import { ApplicationDetail } from './application-detail';
import { Grid3X3, Search } from 'lucide-react';

const ICON_MAP: Record<string, string> = {
  folder: '📁',
  settings: '⚙️',
  activity: '📊',
  camera: '📷',
  sparkles: '✨',
  grid: '🔲',
  code: '💻',
  monitor: '🖥️',
  file: '📄',
  appstore: '🏪',
};

function getIcon(icon: string): string {
  return (ICON_MAP[icon] ?? icon.length <= 2) ? icon : '🧩';
}

export function Applications() {
  const store = useService<ModuleStore>('moduleStore');
  const moduleWindowService = useService<ModuleWindowService>('moduleWindow');

  const [state, setState] = useState<ModuleStoreState>(store.getSnapshot());
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [opening, setOpening] = useState<Set<string>>(new Set());

  useEffect(() => {
    return store.subscribe((s) => setState(s));
  }, [store]);

  const entries = state.entries
    .filter((e) => e.manifest.type !== 'system')
    .filter(
      (e) =>
        !filter ||
        e.manifest.name.toLowerCase().includes(filter.toLowerCase()) ||
        e.manifest.id.toLowerCase().includes(filter.toLowerCase()),
    );

  const handleOpen = useCallback(
    async (id: string) => {
      setOpening((prev) => new Set(prev).add(id));
      try {
        await moduleWindowService.openModule(id);
      } catch {
        /* ignore */
      }
      setOpening((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [moduleWindowService],
  );

  const selectedEntry = selected ? state.getEntry(selected) : undefined;

  return (
    <div className="bg-background text-foreground flex h-full w-full flex-col">
      {/* Header */}
      <div className="border-border/30 flex items-center gap-3 border-b px-5 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
          <Grid3X3 size={16} />
        </span>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Applications</h2>
          <p className="text-foreground/40 text-[11px]">
            {state.entries.filter((e) => e.manifest.type !== 'system').length} apps installed
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="border-border/30 flex items-center gap-2 border-b px-4 py-2">
        <Search size={12} className="text-foreground/30 shrink-0" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari aplikasi..."
          className="text-foreground placeholder:text-foreground/20 min-w-0 flex-1 bg-transparent text-[11px] outline-none"
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        {entries.length === 0 ? (
          <div className="text-foreground/20 flex h-full flex-col items-center justify-center gap-2">
            <Grid3X3 size={28} />
            <p className="text-xs">{filter ? 'Tidak ditemukan' : 'Belum ada aplikasi'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {entries.map((entry) => (
              <motion.button
                key={entry.manifest.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelected(entry.manifest.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all',
                  'hover:bg-muted/50 hover:border-border/20 border border-transparent',
                  selected === entry.manifest.id && 'bg-muted/30 border-border/20',
                )}
              >
                <span className="bg-muted/50 flex h-10 w-10 items-center justify-center rounded-xl text-lg">
                  {getIcon(entry.manifest.icon)}
                </span>
                <span className="text-foreground/70 line-clamp-2 text-center text-[10px] leading-tight">
                  {entry.manifest.name}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Detail overlay */}
      <AnimatePresence>
        {selectedEntry && (
          <ApplicationDetail
            entry={selectedEntry}
            opening={opening.has(selectedEntry.manifest.id)}
            onClose={() => setSelected(null)}
            onOpen={() => handleOpen(selectedEntry.manifest.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
