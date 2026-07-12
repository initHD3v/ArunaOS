'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ProviderInfo {
  type: string;
  model: string;
  available: boolean;
}

interface ModelSelectorProps {
  onSelect: (provider: string) => void;
  currentProvider: string;
}

export function ModelSelector({ onSelect, currentProvider }: ModelSelectorProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then((data) => setProviders(data.providers ?? []))
      .catch(() => {});
  }, []);

  const current = providers.find((p) => p.type === currentProvider);

  if (providers.length <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
          'text-foreground/60 hover:bg-muted hover:text-foreground/80',
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            current?.available ? 'bg-success' : 'bg-foreground/30',
          )}
        />
        {current?.model ?? 'AI'}
        <svg
          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={cn(
              'absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border py-1 shadow-xl backdrop-blur-2xl',
              'border-border/20 bg-card',
            )}
          >
            {providers.map((p) => (
              <button
                key={p.type}
                onClick={() => {
                  onSelect(p.type);
                  setOpen(false);
                }}
                className={cn(
                  'hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                  p.type === currentProvider ? 'text-primary' : 'text-foreground/60',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    p.available ? 'bg-success' : 'bg-foreground/30',
                  )}
                />
                <span className="font-medium capitalize">{p.type}</span>
                <span className="text-foreground/40">{p.model}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
