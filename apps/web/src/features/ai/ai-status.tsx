'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import type { ModuleWindowService } from '@/services/module-window';

export function AIStatus() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const moduleWindow = useService<ModuleWindowService>('moduleWindow');

  useEffect(() => {
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then((data) => {
        const hasAvailable =
          data.providers?.some((p: { available: boolean }) => p.available) ?? false;
        setAvailable(hasAvailable);
      })
      .catch(() => setAvailable(false));
  }, []);

  const handleClick = () => {
    moduleWindow.openModule('arunaos.ai').catch(() => {});
  };

  if (available === null) return null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
        available ? 'text-primary hover:bg-primary/10' : 'text-foreground/40 hover:bg-muted',
      )}
      title={available ? 'AI Assistant' : 'AI not configured'}
    >
      <Sparkles size={12} />
      <span className="hidden sm:inline">{available ? 'AI' : 'AI Offline'}</span>
    </button>
  );
}
