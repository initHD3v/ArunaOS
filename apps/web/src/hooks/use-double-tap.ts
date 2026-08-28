'use client';

import { useRef, useCallback } from 'react';

export function useDoubleTap(onDoubleTap: () => void, delay = 300) {
  const lastTapRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < delay) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      lastTapRef.current = 0;
      onDoubleTap();
    } else {
      lastTapRef.current = now;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        lastTapRef.current = 0;
      }, delay);
    }
  }, [onDoubleTap, delay]);

  return onTap;
}
