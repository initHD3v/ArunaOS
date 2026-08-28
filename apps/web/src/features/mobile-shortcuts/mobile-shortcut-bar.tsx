'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Minus,
  Maximize2,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-media-query';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useMobileShortcutStore } from './mobile-shortcut-store';

export function MobileShortcutBar() {
  const isMobile = useIsMobile();
  const visible = useMobileShortcutStore((s) => s.visible);
  const hide = useMobileShortcutStore((s) => s.hide);
  const focusedId = useWindowStore((s) => s.focusedWindowId);
  const windows = useWindowStore((s) => s.windows);

  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const searchMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      if (searchMenuRef.current && !searchMenuRef.current.contains(e.target as Node))
        setShowSearchMenu(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h as EventListener);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h as EventListener);
    };
  }, []);

  if (!isMobile || !visible) return null;

  const hasWindows = Object.keys(windows).length > 0;
  const ids = Object.keys(windows);

  const openPalette = () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-command-palette-trigger]');
    if (btn) btn.click();
    else
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
  };

  const nextWindow = () => {
    if (ids.length < 2) return;
    const idx = focusedId ? ids.indexOf(focusedId) : -1;
    const next = ids[(idx + 1) % ids.length];
    if (next) useWindowStore.getState().focusWindow(next);
  };

  const prevWindow = () => {
    if (ids.length < 2) return;
    const idx = focusedId ? ids.indexOf(focusedId) : -1;
    const prev = ids[idx <= 0 ? ids.length - 1 : idx - 1];
    if (prev) useWindowStore.getState().focusWindow(prev);
  };

  const closeWindow = () => {
    if (focusedId) useWindowStore.getState().closeWindow(focusedId);
  };

  const minimizeWindow = () => {
    if (focusedId) useWindowStore.getState().minimizeWindow(focusedId);
  };

  const openAICommand = () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'i',
        code: 'KeyI',
        metaKey: true,
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  };

  const toggleMaximize = () => {
    if (focusedId) {
      const w = useWindowStore.getState().windows[focusedId];
      if (w?.state === 'maximized') useWindowStore.getState().restoreWindow(focusedId);
      else useWindowStore.getState().maximizeWindow(focusedId);
    }
  };

  return (
    <div className="fixed bottom-[72px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1.5 shadow-lg backdrop-blur-xl">
      <div ref={searchMenuRef} className="relative">
        <button
          onClick={() => setShowSearchMenu((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black active:scale-95"
          aria-label="Search"
        >
          <Search size={14} />
        </button>
        {showSearchMenu && (
          <div className="absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-1.5 shadow-xl backdrop-blur-xl">
            <button
              onClick={() => {
                setShowSearchMenu(false);
                openPalette();
              }}
              className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-black"
            >
              <Search size={12} /> Spotlight
            </button>
            <button
              onClick={() => {
                setShowSearchMenu(false);
                openAICommand();
              }}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-medium text-white"
            >
              <Sparkles size={12} /> AI Command
            </button>
          </div>
        )}
      </div>
      <div className="h-6 w-px bg-white/10" />
      <button
        onTouchEnd={(e) => {
          e.preventDefault();
          prevWindow();
        }}
        onClick={prevWindow}
        disabled={!hasWindows}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur active:scale-95 disabled:opacity-30"
        aria-label="Previous window"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        onTouchEnd={(e) => {
          e.preventDefault();
          nextWindow();
        }}
        onClick={nextWindow}
        disabled={!hasWindows}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur active:scale-95 disabled:opacity-30"
        aria-label="Next window"
      >
        <ChevronRight size={14} />
      </button>
      <div className="h-6 w-px bg-white/10" />
      <button
        onTouchEnd={(e) => {
          e.preventDefault();
          minimizeWindow();
        }}
        onClick={minimizeWindow}
        disabled={!focusedId}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 active:scale-95 disabled:opacity-30"
        aria-label="Minimize"
      >
        <Minus size={14} />
      </button>
      <button
        onTouchEnd={(e) => {
          e.preventDefault();
          toggleMaximize();
        }}
        onClick={toggleMaximize}
        disabled={!focusedId}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 active:scale-95 disabled:opacity-30"
        aria-label="Maximize"
      >
        <Maximize2 size={12} />
      </button>
      <button
        onTouchEnd={(e) => {
          e.preventDefault();
          closeWindow();
        }}
        onClick={closeWindow}
        disabled={!focusedId}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white active:scale-95 disabled:opacity-30"
        aria-label="Close window"
      >
        <X size={14} />
      </button>
      <div className="h-6 w-px bg-white/10" />
      <button
        onTouchEnd={(e) => {
          e.preventDefault();
          hide();
        }}
        onClick={hide}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur active:scale-95"
        aria-label="Hide shortcut bar"
      >
        <EyeOff size={12} />
      </button>
    </div>
  );
}
