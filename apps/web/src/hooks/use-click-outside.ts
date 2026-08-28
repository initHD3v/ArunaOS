import { useEffect, useRef, type RefObject } from 'react';

export function useClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handlerRef.current();
      }
    };
    document.addEventListener('mousedown', handleClick as EventListener);
    document.addEventListener('touchstart', handleClick as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick as EventListener);
      document.removeEventListener('touchstart', handleClick as EventListener);
    };
  }, [ref]);
}
