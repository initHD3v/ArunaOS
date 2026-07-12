'use client';

import { useArunaEngine } from '@/features/engine/engine-context';
import { cn } from '@/lib/utils';
import { Cpu, Moon, Sun, Zap } from 'lucide-react';

const STATUS_ICONS: Record<string, typeof Cpu> = {
  booting: Zap,
  ready: Sun,
  active: Cpu,
  sleeping: Moon,
};

const STATUS_LABELS: Record<string, string> = {
  booting: 'Memulai...',
  ready: 'Siap',
  active: 'Aktif',
  sleeping: 'Tidur',
};

export function EngineStatus() {
  const { status } = useArunaEngine();
  const Icon = STATUS_ICONS[status] ?? Cpu;

  return (
    <div className="bg-card/40 border-border/20 flex items-center gap-1.5 rounded-md border px-2 py-1">
      <Icon
        size={12}
        className={cn(
          'text-foreground/40',
          status === 'active' && 'text-primary',
          status === 'ready' && 'text-success',
          status === 'booting' && 'text-warning animate-pulse',
        )}
      />
      <span className="text-foreground/40 text-[10px]">{STATUS_LABELS[status] ?? status}</span>
    </div>
  );
}
