'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useService, useEventBus } from '@/providers/service-provider';
import type { SettingsService } from '@arunaos/services';
import { usePerformanceStore } from '@/stores/performance.store';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

export function useIdleTimer(onLock: () => void, onSleep: () => void) {
  const settings = useService<SettingsService>('settings');
  const bus = useEventBus();
  const setMode = usePerformanceStore((s) => s.setMode);
  const [showingScreensaver, setShowingScreensaver] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasScreensaverRef = useRef(false);

  const getTimeouts = useCallback(() => {
    return settings.get('power');
  }, [settings]);

  const clearAll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    timerRef.current = null;
    lockTimerRef.current = null;
    sleepTimerRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearAll();
    const { screensaver, lock, sleep } = getTimeouts();

    const schedule = (remaining: number, step: 'screensaver' | 'lock' | 'sleep') => {
      if (step === 'screensaver' && screensaver > 0) {
        timerRef.current = setTimeout(
          () => {
            wasScreensaverRef.current = true;
            setMode('screensaver');
            setShowingScreensaver(true);
            schedule(0, 'lock');
          },
          remaining > 0 ? remaining : screensaver,
        );
        return;
      }
      if (step === 'lock' && lock > 0) {
        const delay = wasScreensaverRef.current ? Math.max(0, lock - screensaver) : lock;
        if (delay <= 0) {
          onLock();
          schedule(0, 'sleep');
          return;
        }
        lockTimerRef.current = setTimeout(() => {
          onLock();
          schedule(0, 'sleep');
        }, delay);
        return;
      }
      if (step === 'sleep' && sleep > 0) {
        const delay = wasScreensaverRef.current
          ? Math.max(0, sleep - Math.max(lock, screensaver))
          : lock > 0
            ? Math.max(0, sleep - lock)
            : sleep;
        if (delay <= 0) {
          setMode('sleep');
          onSleep();
          return;
        }
        sleepTimerRef.current = setTimeout(() => {
          setMode('sleep');
          onSleep();
        }, delay);
      }
    };

    wasScreensaverRef.current = false;
    schedule(0, 'screensaver');
  }, [clearAll, getTimeouts, onLock, onSleep, setMode]);

  const reset = useCallback(() => {
    setMode('normal');
    if (wasScreensaverRef.current) {
      wasScreensaverRef.current = false;
      setShowingScreensaver(false);
    }
    startTimers();
  }, [startTimers, setMode]);

  useEffect(() => {
    startTimers();
    for (const ev of EVENTS) {
      document.addEventListener(ev, reset, { passive: true });
    }
    const unsubResume = bus.on('app:resume', () => {
      setMode('normal');
      startTimers();
    });
    const unsubTrigger = bus.on('screensaver:trigger', () => {
      clearAll();
      wasScreensaverRef.current = true;
      setMode('screensaver');
      setShowingScreensaver(true);
    });
    const unsubDismiss = bus.on('screensaver:dismiss', () => {
      wasScreensaverRef.current = false;
      setMode('normal');
      setShowingScreensaver(false);
      startTimers();
    });
    return () => {
      clearAll();
      for (const ev of EVENTS) {
        document.removeEventListener(ev, reset);
      }
      unsubResume();
      unsubTrigger();
      unsubDismiss();
    };
  }, [startTimers, reset, clearAll, setMode, bus]);

  return { showingScreensaver, dismissScreensaver: reset };
}
