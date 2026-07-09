"use client";

import { useCallback, useRef, useState } from "react";
import { useDesktopStore } from "@/features/desktop/stores/desktop.store";

export function Selection() {
  const setSelectedIcon = useDesktopStore((s) => s.setSelectedIcon);
  const [selecting, setSelecting] = useState(false);
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, [role='dialog'], [role='menu']")) return;
      setSelectedIcon(null);
      startPos.current = { x: e.clientX, y: e.clientY };
      setSelecting(true);

      const onMove = (ev: MouseEvent) => {
        setRect({
          x: Math.min(startPos.current.x, ev.clientX),
          y: Math.min(startPos.current.y, ev.clientY),
          w: Math.abs(ev.clientX - startPos.current.x),
          h: Math.abs(ev.clientY - startPos.current.y),
        });
      };

      const onUp = () => {
        setSelecting(false);
        setRect({ x: 0, y: 0, w: 0, h: 0 });
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [setSelectedIcon],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-0 z-0"
    >
      {selecting && rect.w > 5 && rect.h > 5 && (
        <div
          className="absolute rounded-lg bg-primary/10 border border-primary/30 pointer-events-none"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
          }}
        />
      )}
    </div>
  );
}