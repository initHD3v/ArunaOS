'use client';

import { memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { Finder } from '@modules/arunaos.files/components/finder';
import { Settings } from '@/features/settings/components/settings';
import { ViewerWindow } from '@/features/viewer/components/viewer-window';
import { AStat } from '@modules/arunaos.astat/components/astat';
import { CameraApp } from '@modules/arunaos.camera/components/camera';
import { ModuleRenderer } from '@/features/modules/components/module-renderer';
import { ModuleDevtools } from '@/features/module-devtools/module-devtools';
import { ModuleInstaller } from '@/features/module-installer/module-installer';
import { AppStore } from '@/features/appstore/components/appstore';
import { cn } from '@/lib/utils';
import type { WindowData } from '@/types';

interface WindowProps {
  data: WindowData;
}

export const Window = memo(function Window({ data }: WindowProps) {
  const winRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const maximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
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
      let isDragging = false;

      const onMove = (ev: MouseEvent) => {
        const cx = ev.clientX;
        const cy = ev.clientY;

        if (!isDragging) {
          const dx = cx - e.clientX;
          const dy = cy - e.clientY;
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
          isDragging = true;
        }

        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          const nx = cx - offsetX - baseX;
          const ny = cy - offsetY - baseY;
          el.style.transform = `translate(${nx}px, ${ny}px)`;
        });
      };

      const onUp = (ev: MouseEvent) => {
        cancelAnimationFrame(rafId.current);
        if (isDragging) {
          const nx = ev.clientX - offsetX;
          const ny = ev.clientY - offsetY;
          el.style.transform = '';
          moveWindow(data.id, { x: nx, y: ny });
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [data.id, data.position, focusWindow, moveWindow],
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
  const isMaximized = data.state === 'maximized';

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          key={data.id}
          ref={winRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, y: 60, transition: { duration: 0.2 } }}
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
            'fixed flex flex-col overflow-hidden',
            'bg-card/80 group border shadow-xl backdrop-blur-2xl',
            isMaximized ? 'rounded-none' : 'rounded-xl',
            isFocused ? 'border-border/60 shadow-black/10' : 'border-border/20 shadow-black/5',
          )}
          role="dialog"
          aria-label={data.title}
          aria-modal={isFocused}
        >
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={handleTitleDoubleClick}
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
                onClick={handleMaximizeToggle}
                className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-green-500/20"
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
            <span className="text-foreground/60 mx-4 flex-1 truncate text-center text-xs font-medium">
              {data.title}
            </span>
            <div className="w-14" />
          </div>

          <div className="flex-1 overflow-hidden">
            {data.appId === 'files' && <Finder />}
            {data.appId === 'settings' && <Settings />}
            {data.appId === 'viewer' && <ViewerWindow data={data} />}
            {data.appId === 'astat' && <AStat />}
            {data.appId === 'camera' && <CameraApp />}
            {data.appId === 'devtools' && <ModuleDevtools />}
            {data.appId === 'module-installer' && <ModuleInstaller />}
            {data.appId === 'appstore' && <AppStore />}
            {data.appId !== 'files' &&
              data.appId !== 'settings' &&
              data.appId !== 'viewer' &&
              data.appId !== 'astat' &&
              data.appId !== 'camera' &&
              data.appId !== 'devtools' &&
              data.appId !== 'module-installer' &&
              data.appId !== 'appstore' &&
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
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
