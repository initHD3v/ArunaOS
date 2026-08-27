'use client';

import { Camera, ShieldAlert, RefreshCw } from 'lucide-react';

export function PermissionPrimer({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-card flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-foreground text-background flex h-16 w-16 items-center justify-center rounded-2xl">
        <Camera size={24} />
      </div>
      <div>
        <h3 className="text-sm font-semibold">Allow camera access?</h3>
        <p className="text-muted-foreground mx-auto mt-1 max-w-[28ch] text-xs leading-relaxed">
          ArunaOS Camera needs permission to use your camera. Your photos stay on device and persist
          in gallery.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="bg-foreground text-background flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold"
      >
        <RefreshCw size={12} /> Allow Camera
      </button>
    </div>
  );
}

export function PermissionDenied({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-background/80 absolute inset-0 z-20 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="border-border bg-card w-full max-w-sm rounded-2xl border p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <ShieldAlert size={16} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Camera unavailable</h4>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onDismiss}
            className="bg-muted text-foreground/70 rounded-full px-4 py-1.5 text-xs font-medium"
          >
            Dismiss
          </button>
          <button
            onClick={onRetry}
            className="bg-foreground text-background rounded-full px-4 py-1.5 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
