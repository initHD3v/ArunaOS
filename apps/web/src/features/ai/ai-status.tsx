'use client';

import { Sparkles, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import { useAIHealth } from './use-ai-health';
import type { ModuleWindowService } from '@/services/module-window';

export function AIStatus() {
  const health = useAIHealth();
  const moduleWindow = useService<ModuleWindowService>('moduleWindow');

  const handleClick = () => {
    moduleWindow.openModule('arunaos.ai').catch(() => {});
  };

  const statusConfig = {
    full: { dot: 'bg-green-500', label: 'AI', title: 'AI Assistant — Connected' },
    limited: {
      dot: 'bg-yellow-500',
      label: 'AI Limited',
      title: 'AI — No internet, limited responses',
    },
    none: { dot: 'bg-red-500', label: 'AI Offline', title: 'AI not configured' },
  } as const;

  const config = statusConfig[health];

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
        health === 'full'
          ? 'text-primary hover:bg-primary/10'
          : 'text-foreground/40 hover:bg-muted',
      )}
      title={config.title}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {health === 'limited' && <WifiOff size={10} className="text-yellow-500" />}
      {health === 'none' && <AlertCircle size={10} className="text-red-500" />}
      {health === 'full' && <Sparkles size={10} />}
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  );
}
