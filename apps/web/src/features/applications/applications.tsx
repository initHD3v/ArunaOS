'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import type { ModuleStore, ModuleStoreState } from '@arunaos/runtime';
import type { ModuleWindowService } from '@/services/module-window';
import { useUIStore } from '@/stores/ui-store';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { useDockStore } from '@/features/dock/stores/dock.store';
import { useAIContextStore } from '@/stores/ai-context.store';
import { getAppIdForModule } from '@/services/module-window';
import { ApplicationDetail } from './application-detail';
import { Grid3X3, Search } from 'lucide-react';
import { getIcon } from '@/lib/icon-mapping';
import type { LucideIcon } from 'lucide-react';

function AppIcon({ iconName, size = 20 }: { iconName: string; size?: number }) {
  const Icon = getIcon(iconName) as LucideIcon;
  return <Icon size={size} className="text-foreground/80" strokeWidth={1.5} />;
}

export function Applications() {
  const store = useService<ModuleStore>('moduleStore');
  const moduleWindowService = useService<ModuleWindowService>('moduleWindow');
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addDesktopIcon = useDesktopStore((s) => s.addIcon);
  const addToDock = useDockStore((s) => s.addToDock);

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

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, entryId: string, entryName: string, entryIcon: string) => {
      e.preventDefault();
      e.stopPropagation();
      const mappedAppId = getAppIdForModule(entryId);
      showContextMenu({ x: e.clientX, y: e.clientY }, [
        { id: 'open', label: 'Open', action: () => handleOpen(entryId) },
        { id: 'sep1', label: '', action: () => {}, separator: true },
        {
          id: 'add-dock',
          label: 'Add to Dock',
          action: () =>
            addToDock({
              id: entryId,
              appId: mappedAppId,
              label: entryName,
              iconName: entryIcon,
              hidden: false,
            }),
        },
        {
          id: 'add-desktop',
          label: 'Add to Desktop',
          action: () =>
            addDesktopIcon({
              id: `desktop-${entryId}-${Date.now()}`,
              title: entryName,
              icon: entryIcon,
              appId: mappedAppId,
              position: 0,
            }),
        },
        { id: 'sep2', label: '', action: () => {}, separator: true },
        { id: 'info', label: 'Info', action: () => setSelected(entryId) },
        { id: 'sep3', label: '', action: () => {}, separator: true },
        {
          id: 'ai-ask',
          label: `Ask AI about "${entryName}"`,
          action: () => useAIContextStore.getState().askAI(`Tell me about "${entryName}"`),
        },
        {
          id: 'ai-tips',
          label: `Usage tips for ${entryName}`,
          action: () =>
            useAIContextStore.getState().askAI(`Give me tips and tricks for using "${entryName}"`),
        },
      ]);
    },
    [showContextMenu, handleOpen, addToDock, addDesktopIcon],
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
                draggable
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                layout={false}
                onClick={() => handleOpen(entry.manifest.id)}
                onContextMenu={(e) =>
                  handleContextMenu(e, entry.manifest.id, entry.manifest.name, entry.manifest.icon)
                }
                onDoubleClick={() => setSelected(entry.manifest.id)}
                onDragStart={(e) => {
                  const dt = (e as unknown as React.DragEvent).dataTransfer;
                  if (dt) {
                    const mappedAppId = getAppIdForModule(entry.manifest.id);
                    dt.effectAllowed = 'copy';
                    dt.setData(
                      'application/arunaos-module',
                      JSON.stringify({
                        id: entry.manifest.id,
                        name: entry.manifest.name,
                        icon: entry.manifest.icon,
                        appId: mappedAppId,
                      }),
                    );
                    dt.setData('text/plain', entry.manifest.id);
                    (e.currentTarget as HTMLElement).style.opacity = '0.6';
                  }
                }}
                onDragEnd={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '';
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all',
                  'hover:bg-muted/50 hover:border-border/20 border border-transparent',
                  selected === entry.manifest.id && 'bg-muted/30 border-border/20',
                )}
              >
                <span className="bg-muted/50 flex h-10 w-10 items-center justify-center rounded-xl">
                  <AppIcon iconName={entry.manifest.icon} size={20} />
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
