import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesktopIconData } from '@/types';

export interface DesktopState {
  icons: DesktopIconData[];
  selectedIconId: string | null;
  renamingIconId: string | null;
  refreshKey: number;
  desktopIconsHidden: boolean;

  setSelectedIcon: (id: string | null) => void;
  setRenamingIcon: (id: string | null) => void;
  addIcon: (icon: DesktopIconData) => void;
  removeIcon: (id: string) => void;
  renameIcon: (id: string, title: string) => void;
  moveIcon: (fromIndex: number, toIndex: number) => void;
  /** Free positioning: pindahkan ikon ke sel grid (kolom/baris) mana pun. */
  moveIconToCell: (id: string, col: number, row: number) => void;
  toggleDesktopIcons: () => void;
  triggerRefresh: () => void;
}

/** Ukuran sel grid desktop — ikon w-20 (80px) + gap 8. */
export const DESKTOP_CELL_W = 88;
export const DESKTOP_CELL_H = 96;
export const DESKTOP_GRID_COLS = 4;

/** Cari sel kosong pertama (scan urutan baca) untuk ikon baru. */
function firstFreeCell(icons: DesktopIconData[]): { position: number; row: number } {
  const taken = new Set(icons.map((i) => `${i.position}:${i.row ?? 0}`));
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < DESKTOP_GRID_COLS; col++) {
      if (!taken.has(`${col}:${row}`)) return { position: col, row };
    }
  }
  return { position: 0, row: 0 };
}

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set) => ({
      icons: [
        { id: 'ai', title: 'AI', icon: 'sparkles', position: 0, appId: 'ai' },
        { id: 'files', title: 'Files', icon: 'folder', position: 1, appId: 'files' },
        { id: 'settings', title: 'Settings', icon: 'settings', position: 2, appId: 'settings' },
      ],
      selectedIconId: null,
      renamingIconId: null,
      refreshKey: 0,
      desktopIconsHidden: false,

      setSelectedIcon: (id) => set({ selectedIconId: id }),

      setRenamingIcon: (id) => set({ renamingIconId: id }),

      addIcon: (icon) =>
        set((s) => {
          const cell = firstFreeCell(s.icons);
          return {
            icons: [...s.icons, { ...icon, position: cell.position, row: cell.row }],
          };
        }),

      removeIcon: (id) =>
        set((s) => ({
          icons: s.icons.filter((icon) => icon.id !== id),
          selectedIconId: s.selectedIconId === id ? null : s.selectedIconId,
          renamingIconId: s.renamingIconId === id ? null : s.renamingIconId,
        })),

      renameIcon: (id, title) =>
        set((s) => ({
          icons: s.icons.map((icon) => (icon.id === id ? { ...icon, title } : icon)),
          renamingIconId: null,
        })),

      moveIcon: (fromIndex, toIndex) =>
        set((s) => {
          const icons = [...s.icons];
          const moved = icons.splice(fromIndex, 1)[0];
          if (!moved) return s;
          icons.splice(toIndex, 0, moved);
          return {
            icons: icons.map((icon, i) => ({ ...icon, position: i, row: 0 })),
          };
        }),

      moveIconToCell: (id, col, row) =>
        set((s) => ({
          icons: s.icons.map((icon) => (icon.id === id ? { ...icon, position: col, row } : icon)),
        })),

      toggleDesktopIcons: () => set((s) => ({ desktopIconsHidden: !s.desktopIconsHidden })),

      triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
    }),
    {
      name: 'arunaos-desktop',
      partialize: (state) => ({
        icons: state.icons,
        desktopIconsHidden: state.desktopIconsHidden,
      }),
      // Migrasi ikon lama (position = indeks baris tunggal) ke grid bebas.
      merge: (persisted, current) => {
        const base = { ...current, ...(persisted as Partial<DesktopState>) } as DesktopState;
        base.icons = (base.icons ?? []).map((i) => ({
          ...i,
          position: ((i.position % DESKTOP_GRID_COLS) + DESKTOP_GRID_COLS) % DESKTOP_GRID_COLS,
          row: i.row ?? Math.floor(i.position / DESKTOP_GRID_COLS),
        }));
        return base;
      },
    },
  ),
);
