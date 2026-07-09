import { useCallback, useRef } from "react";
import type { Position } from "@/types";

export function useDrag() {
  const dragging = useRef(false);
  const lastPos = useRef<Position>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement | null>(null);
  const onDragEndRef = useRef<((pos: Position) => void) | null>(null);
  const initialPosRef = useRef<Position>({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, el: HTMLDivElement | null, onEnd?: (pos: Position) => void) => {
      e.preventDefault();
      dragging.current = true;
      elementRef.current = el;
      onDragEndRef.current = onEnd ?? null;
      lastPos.current = { x: e.clientX, y: e.clientY };

      if (el) {
        const tx = parseFloat(el.style.getPropertyValue("--tx")) || 0;
        const ty = parseFloat(el.style.getPropertyValue("--ty")) || 0;
        initialPosRef.current = { x: tx, y: ty };
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current || !elementRef.current) return;
        const dx = ev.clientX - lastPos.current.x;
        const dy = ev.clientY - lastPos.current.y;
        lastPos.current = { x: ev.clientX, y: ev.clientY };

        const el = elementRef.current;
        const tx = (parseFloat(el.style.getPropertyValue("--tx")) || 0) + dx;
        const ty = (parseFloat(el.style.getPropertyValue("--ty")) || 0) + dy;
        el.style.setProperty("--tx", String(tx));
        el.style.setProperty("--ty", String(ty));
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        onDragEndRef.current?.({
          x: (parseFloat(elementRef.current?.style.getPropertyValue("--tx") ?? "0")),
          y: (parseFloat(elementRef.current?.style.getPropertyValue("--ty") ?? "0")),
        });
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [],
  );

  return { handleMouseDown };
}