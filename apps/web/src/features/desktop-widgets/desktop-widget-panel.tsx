'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import { getTimeEmoji, useArunaHomeStore } from './stores/aruna-home.store';
import { useArunaEngine } from '@/features/engine/engine-context';
import { useWidgetPanelStore } from './stores/widget-panel.store';
import { GreetingWidget } from './components/greeting-widget';
import { ProactiveCard } from './components/proactive-card';
import { EngineStatus } from '@/features/engine/components/engine-status';
import { MemoryViewer } from '@/features/engine/components/memory-viewer';
import { X } from 'lucide-react';

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return 'pagi';
  if (h >= 11 && h < 15) return 'siang';
  if (h >= 15 && h < 19) return 'sore';
  return 'malam';
}

const STATUS_DOT: Record<string, string> = {
  booting: 'bg-warning',
  ready: 'bg-primary',
  active: 'bg-success',
  sleeping: 'bg-foreground/30',
};

export function DesktopWidgetPanel() {
  const isMobile = useIsMobile();
  const checkAndReset = useArunaHomeStore((s) => s.checkAndReset);
  const { status } = useArunaEngine();

  const { visible, position, width, collapsed, toggle, setPosition, toggleCollapsed } =
    useWidgetPanelStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const timeOfDay = getTimeOfDay();

  useEffect(() => {
    checkAndReset();
  }, [checkAndReset]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { startX: clientX, startY: clientY, origX: rect.left, origY: rect.top };
    setDragging(true);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isMobile) return;
      if ('touches' in e) {
        const t = e.touches[0]!;
        startDrag(t.clientX, t.clientY);
      } else {
        startDrag(e.clientX, e.clientY);
      }
    },
    [isMobile, startDrag],
  );

  useEffect(() => {
    if (!dragging || !dragRef.current) return;
    function onMove(e: MouseEvent | TouchEvent) {
      const d = dragRef.current;
      if (!d) return;
      const cx = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
      setPosition(d.origX + cx - d.startX, d.origY + cy - d.startY);
    }
    function onUp() {
      setDragging(false);
      dragRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, setPosition]);

  if (!visible) return null;

  const panelContent = (
    <>
      {/* Header */}
      <motion.div
        layout
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        className={cn(
          'rounded-xl border p-4 backdrop-blur-xl',
          'border-border/30 shadow-sm',
          'transition-shadow duration-200',
          isMobile ? 'bg-background/95' : 'bg-card/60',
          !isMobile && (dragging ? 'cursor-grabbing shadow-md' : 'cursor-grab'),
        )}
      >
        {/* Row 1: emoji + date + actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{getTimeEmoji()}</span>
            <span
              className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-foreground/30')}
            />
          </div>
          <span className="text-foreground/50 text-[11px] font-medium">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              className="text-foreground/20 hover:text-danger/70 hover:bg-danger/10 rounded-lg p-1.5 transition-colors"
              title="Tutup panel"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Greeting */}
        <div className="mt-2">
          <GreetingWidget />
        </div>

        {/* Bottom bar */}
        <div className="border-border/20 mt-2.5 flex items-center gap-2 border-t pt-2.5">
          <span className="text-foreground/30 bg-card/80 rounded-md px-1.5 py-0.5 text-[9px]">
            {timeOfDay === 'pagi' && '🌅 Pagi'}
            {timeOfDay === 'siang' && '☀️ Siang'}
            {timeOfDay === 'sore' && '🌇 Sore'}
            {timeOfDay === 'malam' && '🌙 Malam'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            className="text-foreground/20 hover:text-foreground/50 text-[9px] transition-colors"
          >
            {collapsed ? 'Tampilkan saran' : 'Sembunyikan saran'}
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <EngineStatus />
            <MemoryViewer />
          </div>
        </div>
      </motion.div>

      {/* Widget area */}
      <AnimatePresence mode="popLayout">
        {!collapsed && (
          <motion.div
            key="widgets"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 overflow-hidden"
          >
            <ProactiveCard />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (isMobile) {
    return (
      <div
        className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur-2xl"
        onClick={toggle}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-foreground/70 text-xs font-medium">Widget Panel</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            className="text-foreground/30 hover:text-foreground/60 text-xs"
          >
            Tutup
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto max-w-lg">{panelContent}</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: position.x || undefined,
        right: position.x ? undefined : 20,
        top: position.y || 56,
        width,
      }}
      className="z-50 flex select-none flex-col gap-2"
    >
      {panelContent}
    </motion.div>
  );
}
