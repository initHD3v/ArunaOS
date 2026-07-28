'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProgressEvent {
  status: string;
  loaded: number;
  total: number;
}

export function ModelDownloadProgress() {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<ProgressEvent>;
      setProgress(custom.detail);
      if (custom.detail.status === 'ready' || custom.detail.status === 'done') {
        setTimeout(() => setProgress(null), 2000);
      }
    };
    window.addEventListener('aruna-model-progress', handler as EventListener);
    return () => window.removeEventListener('aruna-model-progress', handler as EventListener);
  }, []);

  if (!progress) return null;

  const pct =
    progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;

  return (
    <div className="border-primary/10 bg-primary/5 border-b px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-foreground/70 font-medium">Downloading AI model...</span>
            <span className="text-foreground/40 font-mono text-[10px]">
              {(progress.loaded / 1024 / 1024).toFixed(1)}MB /{' '}
              {(progress.total / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>
          <div className="bg-primary/10 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
