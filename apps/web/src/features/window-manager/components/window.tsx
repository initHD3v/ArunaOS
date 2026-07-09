'use client';

import { memo, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { cn } from '@/lib/utils';
import type { WindowData } from '@/types';

interface WindowProps {
  data: WindowData;
}

export const Window = memo(function Window({ data }: WindowProps) {
  const winRef = useRef<HTMLDivElement>(null);

  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const maximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const isFocused = useWindowStore((s) => s.focusedWindowId === data.id);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      focusWindow(data.id);
      const el = winRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const baseX = data.position.x;
      const baseY = data.position.y;

      const onMove = (ev: MouseEvent) => {
        const nx = ev.clientX - offsetX - baseX;
        const ny = ev.clientY - offsetY - baseY;
        el.style.transform = `translate(${nx}px, ${ny}px)`;
      };

      const onUp = (ev: MouseEvent) => {
        const nx = ev.clientX - offsetX;
        const ny = ev.clientY - offsetY;
        el.style.transform = '';
        moveWindow(data.id, { x: nx, y: ny });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [data.id, data.position, focusWindow, moveWindow],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = winRef.current;
      if (!el) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = data.size.width;
      const startH = data.size.height;

      const onMove = (ev: MouseEvent) => {
        const dw = ev.clientX - startX;
        const dh = ev.clientY - startY;
        const nw = Math.max(480, startW + dw);
        const nh = Math.max(320, startH + dh);
        el.style.width = `${nw}px`;
        el.style.height = `${nh}px`;
      };

      const onUp = (ev: MouseEvent) => {
        const dw = ev.clientX - startX;
        const dh = ev.clientY - startY;
        el.style.width = '';
        el.style.height = '';
        resizeWindow(data.id, {
          width: Math.max(480, startW + dw),
          height: Math.max(320, startH + dh),
        });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [data.id, data.size, resizeWindow],
  );

  const handleBottomResize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = winRef.current;
      if (!el) return;
      const startY = e.clientY;
      const startH = data.size.height;
      const onMove = (ev: MouseEvent) => {
        const dh = ev.clientY - startY;
        el.style.height = `${Math.max(320, startH + dh)}px`;
      };
      const onUp = (ev: MouseEvent) => {
        const dh = ev.clientY - startY;
        el.style.height = '';
        resizeWindow(data.id, {
          width: data.size.width,
          height: Math.max(320, startH + dh),
        });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [data.id, data.size, resizeWindow],
  );

  const handleRightResize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = winRef.current;
      if (!el) return;
      const startX = e.clientX;
      const startW = data.size.width;
      const onMove = (ev: MouseEvent) => {
        const dw = ev.clientX - startX;
        el.style.width = `${Math.max(480, startW + dw)}px`;
      };
      const onUp = (ev: MouseEvent) => {
        const dw = ev.clientX - startX;
        el.style.width = '';
        resizeWindow(data.id, {
          width: Math.max(480, startW + dw),
          height: data.size.height,
        });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [data.id, data.size, resizeWindow],
  );

  const isMinimized = data.state === 'minimized';
  if (isMinimized) return null;

  return (
    <motion.div
      ref={winRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
      onMouseDown={() => focusWindow(data.id)}
      style={{
        left: data.position.x,
        top: data.position.y,
        width: data.size.width,
        height: data.size.height,
        zIndex: data.zIndex,
      }}
      className={cn(
        'fixed flex flex-col',
        'overflow-hidden rounded-xl',
        'bg-card/80 backdrop-blur-2xl',
        'border shadow-xl',
        'group',
        isFocused ? 'border-border/60 shadow-black/10' : 'border-border/20 shadow-black/5',
      )}
      role="dialog"
      aria-label={data.title}
      aria-modal={isFocused}
    >
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'flex h-10 shrink-0 items-center gap-3 px-4',
          'border-b',
          isFocused ? 'border-border/40' : 'border-border/10',
          'select-none',
        )}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(data.id);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-red-500/20"
            aria-label="Close"
          >
            <span className="h-3 w-3 rounded-full bg-red-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(data.id);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-yellow-500/20"
            aria-label="Minimize"
          >
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(data.id);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-green-500/20"
            aria-label="Maximize"
          >
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </button>
        </div>
        <span className="text-foreground/60 mx-4 flex-1 truncate text-center text-xs font-medium">
          {data.title}
        </span>
        <div className="w-14" />
      </div>

      <div className="text-foreground/50 flex flex-1 items-center justify-center p-6 text-sm">
        <p>{data.title} — belum ada konten</p>
      </div>

      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 z-10 h-6 w-6 cursor-se-resize"
      >
        <div className="border-foreground/20 absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-br-sm border-b-2 border-r-2" />
      </div>
      <div
        onMouseDown={handleBottomResize}
        className="absolute bottom-0 left-0 right-4 h-2 cursor-s-resize rounded-b-xl transition-colors hover:bg-blue-500/5"
      />
      <div
        onMouseDown={handleRightResize}
        className="absolute bottom-4 right-0 top-0 w-2 cursor-e-resize rounded-r-xl transition-colors hover:bg-blue-500/5"
      />
    </motion.div>
  );
});
