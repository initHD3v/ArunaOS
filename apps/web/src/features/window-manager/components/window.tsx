"use client";

import { memo, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { useWindowStore } from "@/features/window-manager/stores/window.store";
import { cn } from "@/lib/utils";
import type { WindowData } from "@/types";

interface WindowProps {
  data: WindowData;
}

export const Window = memo(function Window({ data }: WindowProps) {
  const winRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const maximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const isFocused = useWindowStore(
    (s) => s.focusedWindowId === data.id,
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      focusWindow(data.id);
      const el = winRef.current;
      if (!el) return;

      dragStart.current = { x: e.clientX, y: e.clientY, posX: data.position.x, posY: data.position.y };

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - dragStart.current.x;
        const dy = ev.clientY - dragStart.current.y;
        const nx = dragStart.current.posX + dx;
        const ny = dragStart.current.posY + dy;
        el.style.transform = `translate(${nx}px, ${ny}px)`;
        el.style.setProperty("--dx", String(dx));
        el.style.setProperty("--dy", String(dy));
      };

      const onUp = (ev: MouseEvent) => {
        const dx = ev.clientX - dragStart.current.x;
        const dy = ev.clientY - dragStart.current.y;
        el.style.transform = "";
        el.style.removeProperty("--dx");
        el.style.removeProperty("--dy");
        moveWindow(data.id, {
          x: dragStart.current.posX + dx,
          y: dragStart.current.posY + dy,
        });
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [data.id, data.position, focusWindow, moveWindow],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = winRef.current;
      if (!el) return;

      resizeStart.current = { x: e.clientX, y: e.clientY, w: data.size.width, h: data.size.height };

      const onMove = (ev: MouseEvent) => {
        const dw = ev.clientX - resizeStart.current.x;
        const dh = ev.clientY - resizeStart.current.y;
        const nw = Math.max(480, resizeStart.current.w + dw);
        const nh = Math.max(320, resizeStart.current.h + dh);
        el.style.width = `${nw}px`;
        el.style.height = `${nh}px`;
      };

      const onUp = (ev: MouseEvent) => {
        const dw = ev.clientX - resizeStart.current.x;
        const dh = ev.clientY - resizeStart.current.y;
        el.style.width = "";
        el.style.height = "";
        resizeWindow(data.id, {
          width: Math.max(480, resizeStart.current.w + dw),
          height: Math.max(320, resizeStart.current.h + dh),
        });
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [data.id, data.size, resizeWindow],
  );

  const isMinimized = data.state === "minimized";
  if (isMinimized) return null;

  return (
    <motion.div
      ref={winRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
      onMouseDown={() => focusWindow(data.id)}
      style={{
        left: data.position.x,
        top: data.position.y,
        width: data.size.width,
        height: data.size.height,
        zIndex: data.zIndex,
      }}
      className={cn(
        "fixed flex flex-col",
        "rounded-xl overflow-hidden",
        "bg-card/80 backdrop-blur-2xl",
        "border shadow-xl",
        isFocused
          ? "border-border/60 shadow-black/10"
          : "border-border/20 shadow-black/5",
      )}
      role="dialog"
      aria-label={data.title}
      aria-modal={isFocused}
    >
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "flex items-center gap-3 px-4 h-10 shrink-0",
          "border-b",
          isFocused ? "border-border/40" : "border-border/10",
          "select-none",
        )}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); closeWindow(data.id); }}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            aria-label="Close"
          />
          <button
            onClick={(e) => { e.stopPropagation(); minimizeWindow(data.id); }}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
            aria-label="Minimize"
          />
          <button
            onClick={(e) => { e.stopPropagation(); maximizeWindow(data.id); }}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            aria-label="Maximize"
          />
        </div>
        <span className="flex-1 text-center text-xs font-medium text-foreground/60 truncate mx-4">
          {data.title}
        </span>
        <div className="w-14" />
      </div>

      <div className="flex-1 p-6 text-sm text-foreground/50 flex items-center justify-center">
        <p>{data.title} — belum ada konten</p>
      </div>

      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
      />
      <div
        onMouseDown={(e) => {
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
            el.style.height = "";
            resizeWindow(data.id, { width: data.size.width, height: Math.max(320, startH + dh) });
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        }}
        className="absolute bottom-0 left-0 right-4 h-2 cursor-s-resize"
      />
      <div
        onMouseDown={(e) => {
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
            el.style.width = "";
            resizeWindow(data.id, { width: Math.max(480, startW + dw), height: data.size.height });
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        }}
        className="absolute top-0 right-0 bottom-4 w-2 cursor-e-resize"
      />
    </motion.div>
  );
});