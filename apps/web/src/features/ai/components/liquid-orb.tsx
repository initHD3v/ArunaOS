'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { createOrbRenderer, isWebGPUAvailable } from '../orb/orb-renderer';
import type { OrbStyleName } from '../orb/orb-params';

interface LiquidOrbProps {
  size?: number;
  style?: OrbStyleName;
  /** Speeds up the liquid motion and shows orbiting light rings. */
  thinking?: boolean;
  className?: string;
}

/**
 * A single comet-like light arc orbiting the orb. The conic gradient is
 * masked down to a thin ring so only the arc's glow is visible; rotating
 * the layer makes the arc travel around the orb like a satellite.
 */
function OrbitRing({
  inset,
  duration,
  opacity,
  thickness,
  reverse = false,
}: {
  inset: number;
  duration: number;
  opacity: number;
  thickness: number;
  reverse?: boolean;
}) {
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${thickness + 0.5}px), black calc(100% - ${thickness}px))`;
  return (
    <div
      className={cn(
        'pointer-events-none absolute animate-spin rounded-full blur-[1.5px]',
        reverse && '[animation-direction:reverse]',
      )}
      style={{
        inset: -inset,
        animationDuration: `${duration}s`,
        animationTimingFunction: 'cubic-bezier(0.4, 0.1, 0.6, 0.9)',
        background: `conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,${opacity}) 55deg, rgba(255,255,255,${opacity * 0.35}) 95deg, transparent 130deg)`,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
}

/**
 * Liquid glass orb rendered via WebGPU (adapted from LerSent001/orb, MIT).
 * Falls back to an animated CSS gradient orb when WebGPU is unavailable.
 */
export function LiquidOrb({
  size = 96,
  style = 'siriMono',
  thinking = false,
  className,
}: LiquidOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(1);
  const [webgpuReady, setWebgpuReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isWebGPUAvailable() || !canvasRef.current) return;

    let dispose: (() => void) | null = null;

    const id = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      dispose = createOrbRenderer({
        canvas,
        style,
        speedScale: speedRef,
        onError: () => setFailed(true),
      });
      window.setTimeout(() => setWebgpuReady(true), 300);
    }, 0);

    return () => {
      clearTimeout(id);
      dispose?.();
    };
  }, [style]);

  useEffect(() => {
    speedRef.current = thinking ? 3.2 : 1;
  }, [thinking]);

  const showFallback = !webgpuReady || failed;

  return (
    <motion.div
      aria-hidden
      style={{ width: size, height: size }}
      className={cn('relative', className)}
      animate={thinking ? { scale: [1, 1.055, 1] } : { scale: 1 }}
      transition={
        thinking
          ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 260, damping: 22 }
      }
    >
      {thinking && (
        <>
          <OrbitRing inset={12} duration={2.6} opacity={0.95} thickness={2.5} />
          <OrbitRing inset={24} duration={4.1} opacity={0.5} thickness={2} reverse />
          <OrbitRing inset={36} duration={5.8} opacity={0.26} thickness={1.5} />
        </>
      )}

      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-500',
          webgpuReady && !failed ? 'opacity-100' : 'opacity-0',
        )}
      />
      {showFallback && (
        <div className="absolute inset-0">
          <div
            className={cn(
              'absolute inset-0 rounded-full blur-[2px]',
              thinking ? 'animate-pulse [animation-duration:1.6s]' : 'animate-pulse',
              'bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#ededf2_35%,#c9c9d4_65%,#8e8e9c_100%)]',
            )}
          />
          <div className="bg-background/25 absolute inset-[18%] rounded-full backdrop-blur-sm" />
        </div>
      )}
    </motion.div>
  );
}
