'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, X, Minus, HardDrive, Download } from 'lucide-react';

interface ModelProgress {
  status: string;
  loaded: number;
  total: number;
  modelId?: string;
}

interface ModelDownloadModalProps {
  open: boolean;
  onClose: () => void;
}

export function ModelDownloadModal({ open, onClose }: ModelDownloadModalProps) {
  const [progress, setProgress] = useState<ModelProgress | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProgress(null);
    setDone(false);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ModelProgress>).detail;
      setProgress(detail);
      if (detail.status === 'ready') {
        setDone(true);
      }
    };
    window.addEventListener('aruna-model-progress', handler as EventListener);
    return () => window.removeEventListener('aruna-model-progress', handler as EventListener);
  }, [open]);

  if (!open) return null;

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : 0;

  const modelName =
    progress?.modelId?.replace(/^onnx-community\//, '').replace(/^Xenova\//, '') ??
    'Qwen2.5-0.5B-Instruct';
  const loadedMb = progress ? (progress.loaded / 1024 / 1024).toFixed(1) : '0.0';
  const totalMb = progress ? (progress.total / 1024 / 1024).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border-border/20 mx-4 w-full max-w-sm rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="border-border/20 flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <HardDrive className="text-foreground/50 h-4 w-4" />
            <h3 className="text-sm font-medium">Download AI Model</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="text-foreground/40 hover:text-foreground/70 rounded-md p-1 transition-colors"
              title="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            {done && (
              <button
                onClick={onClose}
                className="text-foreground/50 hover:text-foreground rounded-md p-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 px-4 py-5">
          {/* Model info */}
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <Download className="text-primary h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-foreground/70 text-xs font-medium">{modelName}</p>
              <p className="text-foreground/40 mt-0.5 text-[10px]">
                Quantized INT8 — runs in your browser via ONNX
              </p>
            </div>
          </div>

          {/* Status */}
          {!done && progress?.status === 'waiting' && (
            <div className="flex items-center gap-2">
              <Loader2 className="text-foreground/40 h-3.5 w-3.5 animate-spin" />
              <span className="text-foreground/40 text-xs">
                Waiting for another download to finish...
              </span>
            </div>
          )}

          {!done &&
            (progress?.status === 'downloading' ||
              progress?.status === 'progress' ||
              progress?.status === 'initiate' ||
              progress?.status === 'done') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/60 font-medium">Downloading...</span>
                  <span className="text-foreground/40 font-mono text-[10px]">
                    {loadedMb}MB / {totalMb}MB
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-foreground/30 text-center text-[10px]">{pct}% complete</p>
              </div>
            )}

          {!done && !progress && (
            <div className="flex items-center gap-2">
              <Loader2 className="text-foreground/40 h-3.5 w-3.5 animate-spin" />
              <span className="text-foreground/40 text-xs">Starting download...</span>
            </div>
          )}

          {done && (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-foreground/70 text-sm font-medium">Model Ready</p>
              <p className="text-foreground/40 text-center text-[11px] leading-relaxed">
                {modelName} has been downloaded and cached. AI Chat will now use it offline.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border/20 flex justify-end border-t px-4 py-3">
          <button
            onClick={onClose}
            disabled={!done}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-medium transition-all',
              done
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-foreground/30 cursor-not-allowed',
            )}
          >
            {done ? 'Done' : 'Downloading...'}
          </button>
        </div>
      </div>
    </div>
  );
}
