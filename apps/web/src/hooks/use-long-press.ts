'use client';

import { useRef, useCallback } from 'react';

export function useLongPress(onLongPress: (e: TouchEvent | MouseEvent) => void, delay = 500) {
  const timerRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      movedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const point = 'touches' in e ? e.touches[0] : null;
      const x = point ? point.clientX : (e as React.MouseEvent).clientX;
      const y = point ? point.clientY : (e as React.MouseEvent).clientY;
      timerRef.current = window.setTimeout(() => {
        if (!movedRef.current) {
          // synthesize contextmenu-like event
          const synthetic = {
            clientX: x,
            clientY: y,
            preventDefault: () => e.preventDefault(),
          } as unknown as TouchEvent;
          onLongPress(synthetic);
        }
      }, delay);
    },
    [onLongPress, delay],
  );

  const move = useCallback(() => {
    movedRef.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  return {
    onTouchStart: start as unknown as React.TouchEventHandler,
    onTouchMove: move as unknown as React.TouchEventHandler,
    onTouchEnd: cancel as unknown as React.TouchEventHandler,
    onTouchCancel: cancel as unknown as React.TouchEventHandler,
  };
}
