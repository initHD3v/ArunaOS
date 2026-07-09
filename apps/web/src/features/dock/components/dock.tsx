'use client';

import { useCallback } from 'react';
import { motion } from 'motion/react';
import { Monitor, Sparkles, FolderOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/features/window-manager/stores/window.store';

const dockItems = [
  { id: 'finder', icon: Monitor, label: 'Finder', appId: 'finder' },
  { id: 'ai', icon: Sparkles, label: 'AI', appId: 'ai' },
  { id: 'files', icon: FolderOpen, label: 'Files', appId: 'files' },
  { id: 'settings', icon: Settings, label: 'Settings', appId: 'settings' },
] as const;

export function Dock() {
  const windows = useWindowStore((s) => s.windows);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);

  const handleClick = useCallback(
    (appId: string) => {
      const entries = Object.entries(windows);
      const minimized = entries.find(([_, w]) => w.appId === appId && w.state === 'minimized');
      if (minimized) {
        restoreWindow(minimized[0]);
        return;
      }
      const openWin = entries.find(([_, w]) => w.appId === appId);
      if (openWin) {
        focusWindow(openWin[0]);
      }
    },
    [windows, focusWindow, restoreWindow],
  );

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2',
        'flex items-end gap-1',
        'px-3 py-2',
        'rounded-2xl',
        'bg-background/20 backdrop-blur-2xl',
        'border-border/30 border',
        'shadow-lg shadow-black/5',
      )}
    >
      {dockItems.map((item) => {
        const winEntries = Object.entries(windows);
        const hasMinimized = winEntries.some(
          ([_, w]) => w.appId === item.appId && w.state === 'minimized',
        );
        const hasOpen = winEntries.some(([_, w]) => w.appId === item.appId && w.state === 'active');

        return (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.15, y: -4 }}
            whileTap={{ scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
            onClick={() => handleClick(item.appId)}
            className={cn(
              'flex flex-col items-center gap-1',
              'px-3 py-1.5',
              'rounded-xl',
              'hover:bg-white/10 dark:hover:bg-white/10',
              'transition-colors duration-150',
              'cursor-default',
              'relative',
            )}
            aria-label={item.label}
          >
            <item.icon size={22} className="text-foreground/80 drop-shadow-sm" strokeWidth={1.5} />
            <span className="text-foreground/60 text-[10px] font-medium">{item.label}</span>
            {hasMinimized && (
              <span className="absolute -top-0.5 right-0.5 h-2 w-2 rounded-full bg-yellow-400 shadow-sm" />
            )}
            {hasOpen && !hasMinimized && (
              <span className="bg-foreground/40 absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
