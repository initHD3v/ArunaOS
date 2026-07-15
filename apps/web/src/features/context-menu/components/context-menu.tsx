'use client';

import { useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '@/stores/ui-store';
import { useClickOutside } from '@/hooks/use-click-outside';

export function ContextMenu() {
  const visible = useUIStore((s) => s.contextMenu.visible);
  const position = useUIStore((s) => s.contextMenu.position);
  const items = useUIStore((s) => s.contextMenu.items);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, hideContextMenu);

  useEffect(() => {
    if (visible) ref.current?.focus();
  }, [visible]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    },
    [hideContextMenu],
  );

  if (!visible) return null;

  return createPortal(
    <div
      ref={ref}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="bg-card/90 border-border/40 fixed z-[9999] min-w-44 rounded-xl border py-1 shadow-xl shadow-black/10 outline-none backdrop-blur-2xl"
      role="menu"
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.separator && <div className="border-border/30 mx-2 my-1 border-t" />}
          <button
            onClick={() => {
              try {
                item.action();
              } finally {
                hideContextMenu();
              }
            }}
            className="text-foreground/70 hover:bg-muted hover:text-foreground w-full px-3 py-1.5 text-left text-sm transition-colors"
            role="menuitem"
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>,
    document.getElementById('portal-root') ?? document.body,
  );
}
