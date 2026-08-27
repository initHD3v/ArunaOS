'use client';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { FILTERS, ASPECTS, type FilterId, type AspectId } from '../stores/camera.store';

export function Viewfinder({
  videoRef,
  canvasRef,
  streamReady,
  initializing,
  showGrid,
  mirror,
  filter,
  zoom,
  aspect,
  flash,
  countdown,
  onZoom,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  streamReady: boolean;
  initializing: boolean;
  showGrid: boolean;
  mirror: boolean;
  filter: FilterId;
  zoom: number;
  aspect: AspectId;
  flash: boolean;
  countdown: number;
  onZoom: (z: number) => void;
}) {
  const css = FILTERS.find((f) => f.id === filter)?.css || '';
  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio || '';

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-2">
      {initializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          <span className="text-xs text-white/60">Starting camera…</span>
        </div>
      )}

      {/* Aspect wrapper — original fills, others letterbox */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-black shadow-lg',
          ratio ? 'max-h-full max-w-full' : 'h-full w-full',
        )}
        style={ratio ? { aspectRatio: ratio } : undefined}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            streamReady ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            filter: css || undefined,
            transform: `scale(${zoom}) ${mirror ? 'scaleX(-1)' : ''}`.trim(),
          }}
        />

        {/* Grid — high contrast, visible in both landscape & portrait */}
        {showGrid && streamReady && (
          <div className="pointer-events-none absolute inset-0">
            {/* vertical lines */}
            <div className="absolute bottom-0 left-1/3 top-0 w-px bg-white/55 shadow-[0_0_2px_rgba(0,0,0,0.7)]" />
            <div className="absolute bottom-0 left-2/3 top-0 w-px bg-white/55 shadow-[0_0_2px_rgba(0,0,0,0.7)]" />
            {/* horizontal lines */}
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/55 shadow-[0_0_2px_rgba(0,0,0,0.7)]" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/55 shadow-[0_0_2px_rgba(0,0,0,0.7)]" />
            {/* center cross for portrait focus */}
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/10 shadow-[0_0_4px_rgba(0,0,0,0.6)]" />
            {/* corner brackets for better visibility */}
            <div className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-white/70 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-white/70 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-white/70 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-white/70 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
          </div>
        )}

        {/* Countdown inside aspect */}
        <AnimatePresence>
          {countdown > 0 && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]"
            >
              <span className="text-8xl font-light tracking-tight text-white drop-shadow-2xl">
                {countdown}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flash inside aspect */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 bg-white"
            />
          )}
        </AnimatePresence>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Zoom slider — desktop */}
      {streamReady && (
        <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 backdrop-blur-md sm:flex">
          <button
            onClick={() => onZoom(1)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              zoom === 1 ? 'bg-white text-black' : 'text-white/70',
            )}
          >
            1×
          </button>
          <button
            onClick={() => onZoom(2)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              zoom === 2 ? 'bg-white text-black' : 'text-white/70',
            )}
          >
            2×
          </button>
          <button
            onClick={() => onZoom(3)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              zoom === 3 ? 'bg-white text-black' : 'text-white/70',
            )}
          >
            3×
          </button>
        </div>
      )}

      {/* Tap to focus ring — decorative */}
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
        <div className="h-16 w-16 rounded-xl border border-white/0" />
      </div>
    </div>
  );
}
