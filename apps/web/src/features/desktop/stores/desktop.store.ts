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
  toggleDesktopIcons: () => void;
  triggerRefresh: () => void;
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
        set((s) => ({
          icons: [...s.icons, { ...icon, position: s.icons.length }],
        })),

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
            icons: icons.map((icon, i) => ({ ...icon, position: i })),
          };
        }),

      toggleDesktopIcons: () => set((s) => ({ desktopIconsHidden: !s.desktopIconsHidden })),

      triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
    }),
    {
      name: 'arunaos-desktop',
      partialize: (state) => ({
        icons: state.icons,
        desktopIconsHidden: state.desktopIconsHidden,
      }),
    },
  ),
);
