'use client';

import { memo, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useIsMobile } from '@/hooks/use-media-query';
import { MENUBAR_HEIGHT } from '@/constants/layout';
import { Finder } from '@modules/arunaos.files/components/finder';
import { Settings } from '@/features/settings/components/settings';
import { ViewerWindow } from '@/features/viewer/components/viewer-window';
import { AStat } from '@modules/arunaos.astat/components/astat';
import { CameraApp } from '@modules/arunaos.camera/components/camera';
import { ModuleRenderer } from '@/features/modules/components/module-renderer';
import { ModuleDevtools } from '@/features/module-devtools/module-devtools';
import { ModuleInstaller } from '@/features/module-installer/module-installer';
import { AppStore } from '@/features/appstore/components/appstore';
import { AIChat } from '@/features/ai/ai-chat';
import { Applications } from '@/features/applications/applications';
import { WeatherApp } from '@/features/weather/weather-app';
import { cn } from '@/lib/utils';
import type { WindowData } from '@/types';

interface WindowProps {
  data: WindowData;
}

function getPointerPosition(
  e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent,
  mode: 'current' | 'start' | 'end' = 'current',
) {
  if ('touches' in e) {
    const list = mode === 'end' ? e.changedTouches : e.touches;
    const t = list[0];
    return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
  }
  return { x: e.clientX, y: e.clientY };
}

export const Window = memo(function Window({ data }: WindowProps) {
  const winRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);
  const isMobile = useIsMobile();

  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const maximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const isFocused = useWindowStore((s) => s.focusedWindowId === data.id);
  const zoomOrigin = useWindowStore((s) => s.zoomOrigins[data.id]);
  const setZoomOrigin = useWindowStore((s) => s.setZoomOrigin);
  const clearZoomOrigin = useWindowStore((s) => s.clearZoomOrigin);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) e.preventDefault();
      focusWindow(data.id);
      // A maximized window must not be draggable — moving it while the state
      // stays 'maximized' desyncs geometry from state.
      if (data.state === 'maximized') return;
      const el = winRef.current;
      if (!el) return;

      const start = getPointerPosition(e, 'start');
      const offsetX = start.x - data.position.x;
      const offsetY = start.y - data.position.y;
      let isDragging = false;
      const startX = start.x;
      const startY = start.y;

      const onMove = (ev: MouseEvent | TouchEvent) => {
        const pos = getPointerPosition(ev);

        if (!isDragging) {
          if (Math.abs(pos.x - startX) < 4 && Math.abs(pos.y - startY) < 4) return;
          isDragging = true;
        }

        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          const newX = Math.max(0, pos.x - offsetX);
          const newY = Math.max(MENUBAR_HEIGHT, pos.y - offsetY);
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        });
      };

      const onUp = (ev: MouseEvent | TouchEvent) => {
        cancelAnimationFrame(rafId.current);
        if (isDragging) {
          const end = getPointerPosition(ev, 'end');
          const clampedX = Math.max(0, end.x - offsetX);
          const clampedY = Math.max(MENUBAR_HEIGHT, end.y - offsetY);
          moveWindow(data.id, { x: clampedX, y: clampedY });
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    },
    [data.id, data.state, data.position, focusWindow, moveWindow, isMobile],
  );

  const handleMaximizeToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const isZoomed = !!zoomOrigin;

      if (e.altKey || isZoomed) {
        if (data.state === 'maximized') {
          restoreWindow(data.id);
        } else if (isZoomed) {
          moveWindow(data.id, { x: zoomOrigin.position.x, y: zoomOrigin.position.y });
          resizeWindow(data.id, { width: zoomOrigin.size.width, height: zoomOrigin.size.height });
          clearZoomOrigin(data.id);
        } else {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          setZoomOrigin(data.id, {
            position: { x: data.position.x, y: data.position.y },
            size: { width: data.size.width, height: data.size.height },
          });
          moveWindow(data.id, { x: 0, y: MENUBAR_HEIGHT });
          resizeWindow(data.id, { width: vw, height: vh - MENUBAR_HEIGHT });
        }
      } else {
        if (data.state === 'maximized') {
          restoreWindow(data.id);
        } else {
          maximizeWindow(data.id);
        }
      }
    },
    [
      data.id,
      data.state,
      data.position,
      data.size,
      zoomOrigin,
      maximizeWindow,
      restoreWindow,
      moveWindow,
      resizeWindow,
      setZoomOrigin,
      clearZoomOrigin,
    ],
  );

  const handleTitleDoubleClick = useCallback(() => {
    if (data.state === 'maximized') {
      restoreWindow(data.id);
    } else {
      maximizeWindow(data.id);
    }
  }, [data.id, data.state, maximizeWindow, restoreWindow]);

  const handleResizeStart = useCallback(
    (dir: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') =>
      (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        const el = winRef.current;
        if (!el) return;

        const startP = getPointerPosition(e, 'start');
        const startX = data.position.x;
        const startY = data.position.y;
        const startW = data.size.width;
        const startH = data.size.height;

        // Resize dari sisi utara/barat juga memindahkan posisi window.
        const apply = (dx: number, dy: number) => {
          let x = startX;
          let y = startY;
          let w = startW;
          let h = startH;
          if (dir.includes('e')) w = startW + dx;
          if (dir.includes('w')) {
            w = startW - dx;
            x = startX + dx;
          }
          if (dir.includes('s')) h = startH + dy;
          if (dir.includes('n')) {
            h = startH - dy;
            y = startY + dy;
          }
          const minW = 320;
          const minH = 240;
          if (w < minW) {
            if (dir.includes('w')) x -= minW - w;
            w = minW;
          }
          if (h < minH) {
            if (dir.includes('n')) y -= minH - h;
            h = minH;
          }
          const maxW = window.innerWidth;
          const maxH = window.innerHeight - MENUBAR_HEIGHT;
          if (w > maxW) {
            if (dir.includes('w')) x -= w - maxW;
            w = maxW;
          }
          if (h > maxH) {
            if (dir.includes('n')) y -= h - maxH;
            h = maxH;
          }
          if (x < 0) {
            w += x;
            x = 0;
          }
          if (y < MENUBAR_HEIGHT) {
            h += y - MENUBAR_HEIGHT;
            y = MENUBAR_HEIGHT;
          }
          return { x, y, w, h };
        };

        const onMove = (ev: MouseEvent | TouchEvent) => {
          const pos = getPointerPosition(ev);
          const r = apply(pos.x - startP.x, pos.y - startP.y);
          el.style.left = `${r.x}px`;
          el.style.top = `${r.y}px`;
          el.style.width = `${r.w}px`;
          el.style.height = `${r.h}px`;
        };

        const onUp = (ev: MouseEvent | TouchEvent) => {
          const pos = getPointerPosition(ev, 'end');
          const r = apply(pos.x - startP.x, pos.y - startP.y);
          // JANGAN kosongkan inline style di sini — onMove sudah menulis
          // nilai final yang sama, dan React skip penulisan saat nilai baru
          // == nilai render sebelumnya (mengosongkan style di sini membuat
          // window collapse ke 0/2px karena React tidak menulis ulang).
          moveWindow(data.id, { x: r.x, y: r.y });
          resizeWindow(data.id, { width: r.w, height: r.h });
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
      },
    [data.id, data.position, data.size, moveWindow, resizeWindow],
  );

  const isMinimized = data.state === 'minimized';
  const isMaximized = data.state === 'maximized';

  if (isMinimized) return null;

  return (
    <motion.div
      key={data.id}
      ref={winRef}
      initial={{ opacity: 0, scale: isMobile ? 0.98 : 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: isMobile ? 0.96 : 0.5,
        y: isMobile ? 0 : 60,
        transition: { duration: 0.15, ease: 'easeInOut' },
      }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onMouseDown={() => focusWindow(data.id)}
      onTouchStart={() => focusWindow(data.id)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') closeWindow(data.id);
      }}
      style={{
        left: data.position.x,
        top: data.position.y,
        width: data.size.width,
        height: data.size.height,
        zIndex: data.zIndex,
      }}
      className={cn(
        'fixed flex flex-col',
        'bg-card/80 border shadow-xl backdrop-blur-2xl',
        isMaximized ? 'rounded-none border-0' : 'border-border/60 rounded-xl',
        isFocused ? 'shadow-black/10' : 'shadow-black/5',
      )}
      role="dialog"
      aria-label={data.title}
      aria-modal={isFocused}
    >
      {/* Clip wrapper — overflow-hidden lives here (not on the root) so the
          resize handles below are never clipped by the rounded corners. */}
      <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[inherit]">
        <div
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onDoubleClick={handleTitleDoubleClick}
          className={cn(
            'flex shrink-0 items-center border-b',
            isMobile ? 'h-11 gap-2 px-3' : 'h-10 gap-3 px-4',
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
              onClick={handleMaximizeToggle}
              className={cn(
                'group relative flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-green-500/20',
                isMobile && 'hidden',
              )}
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {isMaximized ? 'Kembalikan' : 'Layar Penuh'}
                <span className="ml-1 text-white/50">⌥ + Klik untuk Zoom</span>
              </span>
              {isMaximized ? (
                <span className="relative h-2.5 w-2.5">
                  <span className="absolute inset-0 rounded-[1px] border-[1.5px] border-green-500" />
                  <span className="absolute bottom-[-1px] left-[1px] right-[-1px] top-[1px] rounded-[1px] border-[1.5px] border-green-500 bg-green-500/20" />
                </span>
              ) : (
                <span className="h-3 w-3 rounded-full bg-green-500" />
              )}
            </button>
          </div>
          <span
            className={cn(
              'flex-1 truncate text-center text-xs font-medium',
              isMobile ? 'text-foreground/70 mx-2' : 'text-foreground/60 mx-4',
            )}
          >
            {data.title}
          </span>
          {!isMobile && <div className="w-14" />}
        </div>

        <div className="flex-1 overflow-hidden">
          {data.appId === 'files' && <Finder />}
          {data.appId === 'settings' && <Settings />}
          {data.appId === 'viewer' && <ViewerWindow data={data} />}
          {data.appId === 'astat' && <AStat />}
          {data.appId === 'camera' && <CameraApp />}
          {data.appId === 'ai' && <AIChat />}
          {data.appId === 'devtools' && <ModuleDevtools />}
          {data.appId === 'module-installer' && <ModuleInstaller />}
          {data.appId === 'appstore' && <AppStore />}
          {data.appId === 'applications' && <Applications />}
          {data.appId === 'weather' && <WeatherApp />}
          {data.appId !== 'files' &&
            data.appId !== 'settings' &&
            data.appId !== 'viewer' &&
            data.appId !== 'astat' &&
            data.appId !== 'camera' &&
            data.appId !== 'ai' &&
            data.appId !== 'devtools' &&
            data.appId !== 'module-installer' &&
            data.appId !== 'appstore' &&
            data.appId !== 'applications' &&
            data.appId !== 'weather' &&
            (data.appId?.startsWith('module-') ? (
              <ModuleRenderer moduleId={data.appId.replace('module-', '')} appData={data.appData} />
            ) : (
              <div className="text-foreground/50 flex h-full items-center justify-center text-sm">
                <p>{data.title} — belum ada konten</p>
              </div>
            ))}
        </div>
      </div>

      {!isMaximized && (
        <>
          {/* Sisi */}
          <div
            onMouseDown={handleResizeStart('n')}
            onTouchStart={handleResizeStart('n')}
            className="absolute left-3 right-3 top-0 z-10 h-1.5 cursor-n-resize rounded-t-lg transition-colors hover:bg-blue-500/10"
            aria-label="Resize from top"
            role="presentation"
          />
          <div
            onMouseDown={handleResizeStart('s')}
            onTouchStart={handleResizeStart('s')}
            className="absolute bottom-0 left-3 right-3 z-10 h-1.5 cursor-s-resize rounded-b-lg transition-colors hover:bg-blue-500/10"
            aria-label="Resize from bottom"
            role="presentation"
          />
          <div
            onMouseDown={handleResizeStart('e')}
            onTouchStart={handleResizeStart('e')}
            className="absolute bottom-3 right-0 top-3 z-10 w-1.5 cursor-e-resize rounded-r-lg transition-colors hover:bg-blue-500/10"
            aria-label="Resize from right"
            role="presentation"
          />
          <div
            onMouseDown={handleResizeStart('w')}
            onTouchStart={handleResizeStart('w')}
            className="absolute bottom-3 left-0 top-3 z-10 w-1.5 cursor-w-resize rounded-l-lg transition-colors hover:bg-blue-500/10"
            aria-label="Resize from left"
            role="presentation"
          />
          {/* Sudut */}
          <div
            onMouseDown={handleResizeStart('ne')}
            onTouchStart={handleResizeStart('ne')}
            className="absolute right-0 top-0 z-10 h-4 w-4 cursor-ne-resize"
            aria-label="Resize from top right"
            role="presentation"
          />
          <div
            onMouseDown={handleResizeStart('nw')}
            onTouchStart={handleResizeStart('nw')}
            className="absolute left-0 top-0 z-10 h-4 w-4 cursor-nw-resize"
            aria-label="Resize from top left"
            role="presentation"
          />
          <div
            onMouseDown={handleResizeStart('se')}
            onTouchStart={handleResizeStart('se')}
            className="absolute bottom-0 right-0 z-10 h-6 w-6 cursor-se-resize"
            aria-label="Resize from corner"
            role="presentation"
          >
            <div className="border-foreground/20 absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-br-sm border-b-2 border-r-2" />
          </div>
          <div
            onMouseDown={handleResizeStart('sw')}
            onTouchStart={handleResizeStart('sw')}
            className="absolute bottom-0 left-0 z-10 h-4 w-4 cursor-sw-resize"
            aria-label="Resize from bottom left"
            role="presentation"
          />
        </>
      )}
    </motion.div>
  );
});
