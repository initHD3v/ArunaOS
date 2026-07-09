"use client";

import { useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useUIStore } from "@/stores/ui-store";
import { useClickOutside } from "@/hooks/use-click-outside";

export function ContextMenu() {
  const { visible, position, items } = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, hideContextMenu);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") hideContextMenu();
    },
    [hideContextMenu],
  );

  if (!visible) return null;

  return createPortal(
    <div
      ref={ref}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: position.x, top: position.y }}
      className="fixed z-[9999] min-w-44 py-1 rounded-xl bg-card/90 backdrop-blur-2xl border border-border/40 shadow-xl shadow-black/10"
      role="menu"
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.separator && <div className="mx-2 my-1 border-t border-border/30" />}
          <button
            onClick={() => {
              item.action();
              hideContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
            role="menuitem"
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>,
    document.getElementById("portal-root") ?? document.body,
  );
}