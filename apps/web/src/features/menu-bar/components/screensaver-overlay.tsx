'use client';

import { useEffect, useRef } from 'react';
import { useEventBus } from '@/providers/service-provider';
import { usePerformanceStore } from '@/stores/performance.store';

export function ScreensaverOverlay() {
  const bus = useEventBus();
  const setMode = usePerformanceStore((s) => s.setMode);
  const dismissedRef = useRef(false);

  useEffect(() => {
    dismissedRef.current = false;
    const handle = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setMode('normal');
      bus.emit('screensaver:dismiss', {});
    };
    const evs = ['mousemove', 'mousedown', 'keyup', 'keydown', 'scroll', 'touchstart', 'wheel'];
    for (const ev of evs) {
      document.addEventListener(ev, handle, { passive: true });
    }
    return () => {
      for (const ev of evs) document.removeEventListener(ev, handle);
    };
  }, [bus, setMode]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div
        className="flex flex-col items-center gap-6"
        style={{
          animation: 'sa-float 5s ease-in-out infinite',
        }}
      >
        <div className="relative" style={{ animation: 'sa-breathe 4s ease-in-out infinite' }}>
          <img
            src="/logo.png"
            alt=""
            className="relative h-32 w-32"
            style={{
              opacity: 0.3,
              filter: 'grayscale(0.3)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
              animation: 'sa-glow 4s ease-in-out infinite',
            }}
          />
        </div>
        <p
          className="text-center text-sm font-light uppercase tracking-[0.3em]"
          style={{
            color: 'rgba(255,255,255,0.15)',
            animation: 'sa-fade 4s ease-in-out infinite',
          }}
        >
          ArunaOS
        </p>
        <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.07)' }}>
          Gerakkan mouse atau tekan tombol apa saja untuk kembali
        </p>
      </div>
      <style>{`
        @keyframes sa-breathe {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes sa-glow {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes sa-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes sa-fade {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
