'use client';

import { memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useIsMobile } from '@/hooks/use-media-query';
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

function getPos(e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) {
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0];
    return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
  }
  return { x: e.clientX, y: e.clientY };
}

function getStartPos(e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) {
  if ('touches' in e) {
    const t = e.touches[0];
    return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
  }
  return { x: e.clientX, y: e.clientY };
}

function getEndPos(e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) {
  if ('touches' in e) {
    const t = e.changedTouches[0];
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

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) e.preventDefault();
      focusWindow(data.id);
      const el = winRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const start = getStartPos(e);
      const offsetX = start.x - rect.left;
      const offsetY = start.y - rect.top;
      const baseX = data.position.x;
      const baseY = data.position.y;
      let isDragging = false;
      const startX = start.x;
      const startY = start.y;

      const MENUBAR_HEIGHT = 44;

      const onMove = (ev: MouseEvent | TouchEvent) => {
        const pos = getPos(ev);

        if (!isDragging) {
          if (Math.abs(pos.x - startX) < 4 && Math.abs(pos.y - startY) < 4) return;
          isDragging = true;
        }

        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          const newY = Math.max(MENUBAR_HEIGHT, pos.y - offsetY);
          el.style.transform = `translate(${pos.x - offsetX - baseX}px, ${newY - baseY}px)`;
        });
      };

      const onUp = (ev: MouseEvent | TouchEvent) => {
        cancelAnimationFrame(rafId.current);
        if (isDragging) {
          const end = getEndPos(ev);
          el.style.transform = '';
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
    [data.id, data.position, focusWindow, moveWindow, isMobile],
  );

  const handleMaximizeToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (data.state === 'maximized') {
        restoreWindow(data.id);
      } else {
        maximizeWindow(data.id);
      }
    },
    [data.id, data.state, maximizeWindow, restoreWindow],
  );

  const handleTitleDoubleClick = useCallback(() => {
    if (data.state === 'maximized') {
      restoreWindow(data.id);
    } else {
      maximizeWindow(data.id);
    }
  }, [data.id, data.state, maximizeWindow, restoreWindow]);

  function clampSize(w: number, h: number) {
    const MENUBAR_HEIGHT = 44;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - MENUBAR_HEIGHT;
    return {
      width: Math.min(maxW, Math.max(320, w)),
      height: Math.min(maxH, Math.max(240, h)),
    };
  }

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      const el = winRef.current;
      if (!el) return;

      const start = getStartPos(e);
      const startW = data.size.width;
      const startH = data.size.height;

      const onMove = (ev: MouseEvent | TouchEvent) => {
        const pos = getPos(ev);
        const { width, height } = clampSize(startW + pos.x - start.x, startH + pos.y - start.y);
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
      };

      const onUp = (ev: MouseEvent | TouchEvent) => {
        const end = getEndPos(ev);
        el.style.width = '';
        el.style.height = '';
        resizeWindow(data.id, clampSize(startW + end.x - start.x, startH + end.y - start.y));
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
    [data.id, data.size, resizeWindow, isMobile],
  );

  const handleBottomResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      const el = winRef.current;
      if (!el) return;
      const start = getStartPos(e);
      const startH = data.size.height;

      const onMove = (ev: MouseEvent | TouchEvent) => {
        const pos = getPos(ev);
        const { height } = clampSize(data.size.width, startH + pos.y - start.y);
        el.style.height = `${height}px`;
      };

      const onUp = (ev: MouseEvent | TouchEvent) => {
        const end = getEndPos(ev);
        el.style.height = '';
        resizeWindow(data.id, clampSize(data.size.width, startH + end.y - start.y));
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
    [data.id, data.size, resizeWindow, isMobile],
  );

  const handleRightResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      const el = winRef.current;
      if (!el) return;
      const start = getStartPos(e);
      const startW = data.size.width;

      const onMove = (ev: MouseEvent | TouchEvent) => {
        const pos = getPos(ev);
        const { width } = clampSize(startW + pos.x - start.x, data.size.height);
        el.style.width = `${width}px`;
      };

      const onUp = (ev: MouseEvent | TouchEvent) => {
        const end = getEndPos(ev);
        el.style.width = '';
        resizeWindow(data.id, clampSize(startW + end.x - start.x, data.size.height));
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
    [data.id, data.size, resizeWindow, isMobile],
  );

  const isMinimized = data.state === 'minimized';
  const isMaximized = data.state === 'maximized';

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          key={data.id}
          ref={winRef}
          initial={{ opacity: 0, scale: isMobile ? 0.98 : 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: isMobile ? 0.96 : 0.5,
            y: isMobile ? 0 : 60,
            transition: { duration: 0.2 },
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          onMouseDown={() => focusWindow(data.id)}
          onTouchStart={() => focusWindow(data.id)}
          style={{
            left: data.position.x,
            top: data.position.y,
            width: data.size.width,
            height: data.size.height,
            zIndex: data.zIndex,
          }}
          className={cn(
            'fixed flex flex-col overflow-hidden',
            'bg-card/80 border shadow-xl backdrop-blur-2xl',
            isMaximized ? 'rounded-none border-0' : 'border-border/60 rounded-xl',
            isFocused ? 'shadow-black/10' : 'shadow-black/5',
          )}
          role="dialog"
          aria-label={data.title}
          aria-modal={isFocused}
        >
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
                  'flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-green-500/20',
                  isMobile && 'hidden',
                )}
                aria-label={isMaximized ? 'Restore' : 'Maximize'}
              >
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
                <ModuleRenderer
                  moduleId={data.appId.replace('module-', '')}
                  appData={data.appData}
                />
              ) : (
                <div className="text-foreground/50 flex h-full items-center justify-center text-sm">
                  <p>{data.title} — belum ada konten</p>
                </div>
              ))}
          </div>

          {!isMaximized && (
            <>
              <div
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                className="absolute bottom-0 right-0 z-10 h-6 w-6 cursor-se-resize"
              >
                <div className="border-foreground/20 absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-br-sm border-b-2 border-r-2" />
              </div>
              <div
                onMouseDown={handleBottomResize}
                onTouchStart={handleBottomResize}
                className="absolute bottom-0 left-0 right-4 h-2 cursor-s-resize rounded-b-xl transition-colors hover:bg-blue-500/5"
              />
              <div
                onMouseDown={handleRightResize}
                onTouchStart={handleRightResize}
                className="absolute bottom-4 right-0 top-0 w-2 cursor-e-resize rounded-r-xl transition-colors hover:bg-blue-500/5"
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
