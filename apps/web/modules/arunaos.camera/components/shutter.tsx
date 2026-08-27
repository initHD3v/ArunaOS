'use client';

import {
  Camera,
  Video,
  Timer,
  Grid3X3,
  RotateCcw,
  Sparkles,
  Zap,
  FlipHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimerDuration, FilterId } from '../stores/camera.store';
import { FILTERS } from '../stores/camera.store';

export function ShutterBar({
  mode,
  timer,
  showGrid,
  filter,
  mirror,
  flash,
  recording,
  devicesCount,
  showSettings = true,
  onCapture,
  onToggleMode,
  onTimer,
  onGrid,
  onFilter,
  onMirror,
  onFlash,
  onFlip,
  isMobile,
}: {
  mode: 'photo' | 'video';
  timer: TimerDuration;
  showGrid: boolean;
  filter: FilterId;
  mirror: boolean;
  flash: boolean;
  recording: boolean;
  devicesCount: number;
  showSettings?: boolean;
  onCapture: () => void;
  onToggleMode: () => void;
  onTimer: () => void;
  onGrid: () => void;
  onFilter: (f: FilterId) => void;
  onMirror: () => void;
  onFlash: () => void;
  onFlip: () => void;
  isMobile: boolean;
}) {
  return (
    <div className="bg-card/95 supports-[backdrop-filter]:bg-card/80 border-border/20 relative flex shrink-0 flex-col gap-2 border-t px-3 py-3 backdrop-blur-xl sm:px-4">
      {/* Top row: filters + utilities — hide when controls collapsed, shutter stays */}
      {showSettings && (
        <div className="flex items-center justify-between gap-2">
          <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => onFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  filter === f.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-muted border-border/20 text-foreground/60 hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <button
              onClick={onFlash}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border',
                flash
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'bg-muted border-border/20 text-foreground/60',
              )}
              title="Flash"
            >
              <Zap size={12} />
            </button>
            <button
              onClick={onMirror}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border',
                mirror
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-muted border-border/20 text-foreground/60',
              )}
              title="Mirror"
            >
              <FlipHorizontal size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main iOS-style bar */}
      <div className="flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-2">
          <button
            onClick={onGrid}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors',
              showGrid
                ? 'bg-foreground text-background border-foreground'
                : 'bg-muted border-border/20 text-foreground/60 hover:text-foreground',
            )}
            aria-label="Grid"
          >
            <Grid3X3 size={14} />
          </button>
          <button
            onClick={onTimer}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md',
              timer
                ? 'bg-foreground text-background border-foreground'
                : 'bg-muted border-border/20 text-foreground/60',
            )}
            aria-label="Timer"
          >
            <Timer size={14} />
            {timer > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                {timer}
              </span>
            )}
          </button>
        </div>

        {/* Center shutter + mode */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={onCapture}
              aria-label={
                mode === 'photo'
                  ? 'Capture photo'
                  : recording
                    ? 'Stop recording'
                    : 'Start recording'
              }
              className={cn(
                'border-foreground/10 bg-card flex items-center justify-center rounded-full border-4 shadow-lg transition-all active:scale-95',
                isMobile ? 'h-[68px] w-[68px]' : 'h-16 w-16',
                recording && 'border-red-500/30 bg-red-500',
                !recording && 'bg-white dark:bg-white',
              )}
            >
              {mode === 'photo' ? (
                <span className="h-12 w-12 rounded-full bg-white ring-4 ring-black/10 dark:bg-white" />
              ) : recording ? (
                <span className="h-7 w-7 rounded-[4px] bg-white" />
              ) : (
                <span className="h-12 w-12 rounded-full bg-red-500" />
              )}
            </button>
          </div>
          {/* Mode segmented — iOS style swipe */}
          <div className="bg-muted flex items-center rounded-full p-1">
            {(['photo', 'video'] as const).map((m) => (
              <button
                key={m}
                onClick={onToggleMode}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors',
                  mode === m ? 'bg-foreground text-background shadow' : 'text-foreground/50',
                )}
              >
                {m === 'photo' ? (
                  <span className="inline-flex items-center gap-1">
                    <Camera size={12} /> Photo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Video size={12} /> Video
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMode}
            className="bg-muted border-border/20 text-foreground/60 hidden h-9 w-9 items-center justify-center rounded-full border sm:flex"
            aria-label="Switch mode"
          >
            {mode === 'photo' ? <Video size={14} /> : <Camera size={14} />}
          </button>
          {devicesCount > 1 && (
            <button
              onClick={onFlip}
              className="bg-muted border-border/20 text-foreground/60 flex h-9 w-9 items-center justify-center rounded-full border"
              aria-label="Flip camera"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={onFlash}
            className="bg-muted border-border/20 text-foreground/60 flex h-9 w-9 items-center justify-center rounded-full border sm:hidden"
            aria-label="Flash"
          >
            <Zap size={14} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="text-muted-foreground flex items-center justify-center gap-1 text-[10px]">
          <Sparkles size={10} className="text-violet-500/60" />
          <span>Space to capture • H hide • Pinch 1×-3×</span>
        </div>
      )}
    </div>
  );
}
