import { create } from "zustand";
import type { ContextMenuItem, ContextMenuState, Position } from "@/types";

interface UIState {
  sidebarOpen: boolean;
  contextMenu: ContextMenuState;
  setSidebarOpen: (open: boolean) => void;
  showContextMenu: (position: Position, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  contextMenu: { visible: false, position: { x: 0, y: 0 }, items: [] },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  showContextMenu: (position, items) =>
    set({ contextMenu: { visible: true, position, items } }),

  hideContextMenu: () =>
    set({ contextMenu: { visible: false, position: { x: 0, y: 0 }, items: [] } }),
}));