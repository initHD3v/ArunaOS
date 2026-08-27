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
  PanelBottomClose,
  PanelBottomOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimerDuration, FilterId, AspectId } from '../stores/camera.store';
import { FILTERS, ASPECTS } from '../stores/camera.store';

export function ShutterBar({
  mode,
  timer,
  showGrid,
  filter,
  aspect,
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
  onAspect,
  onMirror,
  onFlash,
  onFlip,
  onToggleSettings,
  isMobile,
}: {
  mode: 'photo' | 'video';
  timer: TimerDuration;
  showGrid: boolean;
  filter: FilterId;
  aspect: AspectId;
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
  onAspect: (a: AspectId) => void;
  onMirror: () => void;
  onFlash: () => void;
  onFlip: () => void;
  onToggleSettings?: () => void;
  isMobile: boolean;
}) {
  return (
    <div className="relative flex shrink-0 flex-col gap-2 border-t border-white/10 bg-black/20 px-3 py-3 backdrop-blur-2xl sm:px-4">
      {/* Top row: filters + utilities + aspect — hide when collapsed, shutter stays */}
      {showSettings && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onFilter(f.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition-colors',
                    filter === f.id
                      ? 'border-white bg-white text-black shadow'
                      : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white',
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
                  'flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-md',
                  flash
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/15 hover:text-white',
                )}
                title="Flash"
              >
                <Zap size={12} />
              </button>
              <button
                onClick={onMirror}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-md',
                  mirror
                    ? 'border-white bg-white text-black'
                    : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/15 hover:text-white',
                )}
                title="Mirror"
              >
                <FlipHorizontal size={12} />
              </button>
            </div>
          </div>
          <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
            <span className="shrink-0 text-[10px] font-medium text-white/40">Aspect</span>
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                onClick={() => onAspect(a.id)}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition-colors',
                  aspect === a.id
                    ? 'border-white bg-white text-black shadow'
                    : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/15 hover:text-white',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main iOS-style bar — more transparent, shutter always visible */}
      <div className="flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-2">
          <button
            onClick={onGrid}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors',
              showGrid
                ? 'border-white bg-white text-black shadow'
                : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white',
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
                ? 'border-white bg-white text-black shadow'
                : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white',
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
          {/* Hide settings — left side for thumb reach on mobile */}
          {onToggleSettings && (
            <button
              onClick={onToggleSettings}
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 backdrop-blur-md hover:bg-white/15 hover:text-white sm:flex"
              aria-label={showSettings ? 'Hide settings' : 'Show settings'}
              title={showSettings ? 'Hide settings (H)' : 'Show settings (H)'}
            >
              {showSettings ? <PanelBottomClose size={14} /> : <PanelBottomOpen size={14} />}
            </button>
          )}
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
                'flex items-center justify-center rounded-full border-4 border-white/20 bg-white shadow-lg backdrop-blur-md transition-all active:scale-95',
                isMobile ? 'h-[68px] w-[68px]' : 'h-16 w-16',
                recording && 'border-red-500/30 bg-red-500',
              )}
            >
              {mode === 'photo' ? (
                <span className="h-12 w-12 rounded-full bg-white ring-4 ring-black/10" />
              ) : recording ? (
                <span className="h-7 w-7 rounded-[4px] bg-white" />
              ) : (
                <span className="h-12 w-12 rounded-full bg-red-500" />
              )}
            </button>
          </div>
          {/* Mode segmented — iOS style, more transparent */}
          <div className="flex items-center rounded-full bg-black/30 p-1 backdrop-blur-md">
            {(['photo', 'video'] as const).map((m) => (
              <button
                key={m}
                onClick={onToggleMode}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors',
                  mode === m ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white',
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
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 backdrop-blur-md hover:bg-white/15 hover:text-white sm:flex"
            aria-label="Switch mode"
          >
            {mode === 'photo' ? <Video size={14} /> : <Camera size={14} />}
          </button>
          {devicesCount > 1 && (
            <button
              onClick={onFlip}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 backdrop-blur-md hover:bg-white/15 hover:text-white"
              aria-label="Flip camera"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={onFlash}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 backdrop-blur-md hover:bg-white/15 hover:text-white sm:hidden"
            aria-label="Flash"
          >
            <Zap size={14} />
          </button>
          {/* Hide settings — mobile visible on right for thumb reach */}
          {onToggleSettings && (
            <button
              onClick={onToggleSettings}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 backdrop-blur-md hover:bg-white/15 hover:text-white sm:hidden"
              aria-label={showSettings ? 'Hide settings' : 'Show settings'}
            >
              {showSettings ? <PanelBottomClose size={14} /> : <PanelBottomOpen size={14} />}
            </button>
          )}
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
