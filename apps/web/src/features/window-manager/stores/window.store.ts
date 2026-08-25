import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WindowData, WindowState, Position, Size } from '@/types';
import { MENUBAR_HEIGHT } from '@/constants/layout';

interface SavedState {
  position: Position;
  size: Size;
}

interface WindowStore {
  windows: Record<string, WindowData>;
  focusedWindowId: string | null;
  nextZIndex: number;
  savedStates: Record<string, SavedState>;
  /** Pre-zoom geometry for ⌥+click "fill" zoom — persisted so a reload
   * doesn't strand a fullscreen-sized window that can't be un-zoomed. */
  zoomOrigins: Record<string, SavedState>;

  openWindow: (win: WindowData) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, position: Position) => void;
  resizeWindow: (id: string, size: Size) => void;
  setWindowState: (id: string, state: WindowState) => void;
  setZoomOrigin: (id: string, origin: SavedState) => void;
  clearZoomOrigin: (id: string) => void;
}

export const useWindowStore = create<WindowStore>()(
  persist(
    (set) => ({
      windows: {},
      focusedWindowId: null,
      nextZIndex: 1,
      savedStates: {},
      zoomOrigins: {},

      openWindow: (win) =>
        set((s) => ({
          windows: { ...s.windows, [win.id]: { ...win, zIndex: s.nextZIndex } },
          focusedWindowId: win.id,
          nextZIndex: s.nextZIndex + 1,
        })),

      closeWindow: (id) =>
        set((s) => {
          const windows = { ...s.windows };
          delete windows[id];
          const savedStates = { ...s.savedStates };
          delete savedStates[id];
          const zoomOrigins = { ...s.zoomOrigins };
          delete zoomOrigins[id];
          // Auto-focus the topmost remaining visible window — otherwise
          // closing the focused window left every window unfocused.
          let nextFocused = s.focusedWindowId === id ? null : s.focusedWindowId;
          if (nextFocused === null) {
            const top = Object.values(windows)
              .filter((w) => w.state !== 'minimized')
              .sort((a, b) => b.zIndex - a.zIndex)[0];
            if (top) nextFocused = top.id;
          }
          return {
            windows,
            focusedWindowId: nextFocused,
            nextZIndex: Object.keys(windows).length === 0 ? 1 : s.nextZIndex,
            savedStates,
            zoomOrigins,
          };
        }),

      focusWindow: (id) =>
        set((s) => {
          const target = s.windows[id];
          if (!target || target.state === 'minimized') return s;
          return {
            windows: {
              ...s.windows,
              [id]: {
                ...target,
                // A maximized window must stay maximized — bumping it to
                // 'active' here silently un-maximized it on every click while
                // keeping fullscreen geometry, corrupting savedStates on the
                // next maximize.
                state: (target.state === 'maximized' ? 'maximized' : 'active') as WindowState,
                zIndex: s.nextZIndex,
              },
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
            windows: { ...s.windows, [id]: { ...target, state: 'minimized' as WindowState } },
            focusedWindowId: s.focusedWindowId === id ? null : s.focusedWindowId,
          };
        }),

      maximizeWindow: (id) =>
        set((s) => {
          const target = s.windows[id];
          if (!target) return s;

          if (target.state === 'maximized') {
            const saved = s.savedStates[id];
            if (!saved) return s;
            const savedStates = { ...s.savedStates };
            delete savedStates[id];
            return {
              windows: {
                ...s.windows,
                [id]: {
                  ...target,
                  state: 'active' as WindowState,
                  position: saved.position,
                  size: saved.size,
                  zIndex: s.nextZIndex,
                },
              },
              focusedWindowId: id,
              nextZIndex: s.nextZIndex + 1,
              savedStates,
            };
          }

          const vw = window.innerWidth;
          const vh = window.innerHeight;
          return {
            windows: {
              ...s.windows,
              [id]: {
                ...target,
                state: 'maximized' as WindowState,
                position: { x: 0, y: MENUBAR_HEIGHT },
                size: { width: vw, height: vh - MENUBAR_HEIGHT },
                zIndex: s.nextZIndex,
              },
            },
            focusedWindowId: id,
            nextZIndex: s.nextZIndex + 1,
            savedStates: {
              ...s.savedStates,
              [id]: { position: target.position, size: target.size },
            },
          };
        }),

      restoreWindow: (id) =>
        set((s) => {
          const target = s.windows[id];
          if (!target) return s;

          if (target.state === 'maximized') {
            const saved = s.savedStates[id];
            if (!saved) return s;
            const savedStates = { ...s.savedStates };
            delete savedStates[id];
            return {
              windows: {
                ...s.windows,
                [id]: {
                  ...target,
                  state: 'active' as WindowState,
                  position: saved.position,
                  size: saved.size,
                  zIndex: s.nextZIndex,
                },
              },
              focusedWindowId: id,
              nextZIndex: s.nextZIndex + 1,
              savedStates,
            };
          }

          if (target.state === 'minimized') {
            return {
              windows: {
                ...s.windows,
                [id]: {
                  ...target,
                  state: 'active' as WindowState,
                  zIndex: s.nextZIndex,
                },
              },
              focusedWindowId: id,
              nextZIndex: s.nextZIndex + 1,
            };
          }

          return s;
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

      setZoomOrigin: (id, origin) =>
        set((s) => ({ zoomOrigins: { ...s.zoomOrigins, [id]: origin } })),

      clearZoomOrigin: (id) =>
        set((s) => {
          const zoomOrigins = { ...s.zoomOrigins };
          delete zoomOrigins[id];
          return { zoomOrigins };
        }),
    }),
    {
      name: 'arunaos-windows',
      partialize: (state) => ({
        windows: state.windows,
        focusedWindowId: state.focusedWindowId,
        nextZIndex: state.nextZIndex,
        savedStates: state.savedStates,
        zoomOrigins: state.zoomOrigins,
      }),
      // P3: clamp restored windows to the CURRENT viewport — without this,
      // windows restored on a smaller screen / different monitor can end up
      // fully off-screen.
      merge: (persisted, current) => {
        const base = { ...current, ...(persisted as Partial<WindowStore>) } as WindowStore;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

        for (const win of Object.values(base.windows ?? {})) {
          if (!win) continue;
          if (win.state === 'maximized') {
            win.position = { x: 0, y: MENUBAR_HEIGHT };
            win.size = { width: vw, height: vh - MENUBAR_HEIGHT };
            continue;
          }
          const width = Math.min(win.size.width, vw);
          const height = Math.min(win.size.height, vh - MENUBAR_HEIGHT);
          win.position = {
            x: Math.max(0, Math.min(win.position.x, Math.max(0, vw - width))),
            y: Math.max(
              MENUBAR_HEIGHT,
              Math.min(win.position.y, Math.max(MENUBAR_HEIGHT, vh - height)),
            ),
          };
          win.size = { width, height };
        }
        return base;
      },
    },
  ),
);
