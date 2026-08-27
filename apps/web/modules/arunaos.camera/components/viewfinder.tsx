'use client';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { FILTERS, type FilterId } from '../stores/camera.store';

export function Viewfinder({
  videoRef,
  canvasRef,
  streamReady,
  initializing,
  showGrid,
  mirror,
  filter,
  zoom,
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
  flash: boolean;
  countdown: number;
  onZoom: (z: number) => void;
}) {
  const css = FILTERS.find((f) => f.id === filter)?.css || '';

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
      {initializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          <span className="text-xs text-white/60">Starting camera…</span>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          streamReady ? 'opacity-100' : 'opacity-0',
          mirror && 'scale-x-[-1]',
        )}
        style={{
          filter: css || undefined,
          transform: `scale(${zoom}) ${mirror ? 'scaleX(-1)' : ''}`.trim(),
        }}
      />

      {/* Grid */}
      {showGrid && streamReady && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            <div className="border-r border-white/15" />
            <div className="border-r border-white/15" />
            <div className="col-span-3 border-t border-white/15" />
            <div className="col-span-3 border-t border-white/15" />
          </div>
        </div>
      )}

      {/* Countdown */}
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

      <canvas ref={canvasRef} className="hidden" />

      {/* Flash */}
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
