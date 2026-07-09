import { create } from "zustand";
import type { WindowData, WindowState, Position, Size } from "@/types";

interface WindowStore {
  windows: Record<string, WindowData>;
  focusedWindowId: string | null;
  nextZIndex: number;

  openWindow: (win: WindowData) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, position: Position) => void;
  resizeWindow: (id: string, size: Size) => void;
  setWindowState: (id: string, state: WindowState) => void;
}

export const useWindowStore = create<WindowStore>((set) => ({
  windows: {},
  focusedWindowId: null,
  nextZIndex: 1,

  openWindow: (win) =>
    set((s) => ({
      windows: { ...s.windows, [win.id]: { ...win, zIndex: s.nextZIndex } },
      focusedWindowId: win.id,
      nextZIndex: s.nextZIndex + 1,
    })),

  closeWindow: (id) =>
    set((s) => {
      const nextFocused = s.focusedWindowId === id ? null : s.focusedWindowId;
      const windows = { ...s.windows };
      delete windows[id];
      return {
        windows,
        focusedWindowId: nextFocused,
        nextZIndex: Object.keys(windows).length === 0 ? 1 : s.nextZIndex,
      };
    }),

  focusWindow: (id) =>
    set((s) => {
      const target = s.windows[id];
      if (!target || target.state === "minimized") return s;
      return {
        windows: {
          ...s.windows,
          [id]: { ...target, state: "active" as WindowState, zIndex: s.nextZIndex },
        },
        focusedWindowId: id,
        nextZIndex: s.nextZIndex + 1,
      };
    }),

  minimizeWindow: (id) =>
    set((s) => {
      const target = s.windows[id];
      if (!target) return s;
      return {
        windows: { ...s.windows, [id]: { ...target, state: "minimized" as WindowState } },
        focusedWindowId: s.focusedWindowId === id ? null : s.focusedWindowId,
      };
    }),

  maximizeWindow: (id) =>
    set((s) => {
      const target = s.windows[id];
      if (!target) return s;
      return {
        windows: { ...s.windows, [id]: { ...target, state: "maximized" as WindowState } },
      };
    }),

  restoreWindow: (id) =>
    set((s) => {
      const target = s.windows[id];
      if (!target) return s;
      const isMinimized = target.state === "minimized";
      return {
        windows: {
          ...s.windows,
          [id]: {
            ...target,
            state: "active" as WindowState,
            zIndex: isMinimized ? s.nextZIndex : target.zIndex,
          },
        },
        focusedWindowId: isMinimized ? id : s.focusedWindowId,
        nextZIndex: isMinimized ? s.nextZIndex + 1 : s.nextZIndex,
      };
    }),

  moveWindow: (id, position) =>
    set((s) => {
      const target = s.windows[id];
      if (!target) return s;
      return { windows: { ...s.windows, [id]: { ...target, position } } };
    }),

  resizeWindow: (id, size) =>
    set((s) => {
      const target = s.windows[id];
      if (!target) return s;
      return { windows: { ...s.windows, [id]: { ...target, size } } };
    }),

  setWindowState: (id, state) =>
    set((s) => {
      const target = s.windows[id];
      if (!target) return s;
      return { windows: { ...s.windows, [id]: { ...target, state } } };
    }),
}));