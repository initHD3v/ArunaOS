import { create } from 'zustand';
import type { DesktopIconData } from '@/types';

export interface DesktopState {
  icons: DesktopIconData[];
  selectedIconId: string | null;
  wallpaperIndex: number;
  blur: number;
  refreshKey: number;

  setSelectedIcon: (id: string | null) => void;
  addIcon: (icon: DesktopIconData) => void;
  moveIcon: (fromIndex: number, toIndex: number) => void;
  cycleWallpaper: () => void;
  triggerRefresh: () => void;
}

export const useDesktopStore = create<DesktopState>((set) => ({
  icons: [
    { id: 'ai', title: 'AI', icon: 'sparkles', position: 0, appId: 'ai' },
    { id: 'files', title: 'Files', icon: 'folder', position: 1, appId: 'files' },
    { id: 'settings', title: 'Settings', icon: 'settings', position: 2, appId: 'settings' },
  ],
  selectedIconId: null,
  wallpaperIndex: 0,
  blur: 0,
  refreshKey: 0,

  setSelectedIcon: (id) => set({ selectedIconId: id }),

  addIcon: (icon) =>
    set((s) => ({
      icons: [...s.icons, { ...icon, position: s.icons.length }],
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

  cycleWallpaper: () => set((s) => ({ wallpaperIndex: (s.wallpaperIndex + 1) % 4 })),

  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
