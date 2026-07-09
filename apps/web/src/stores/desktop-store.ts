import { create } from "zustand";

interface DesktopState {
  wallpaper: string;
  blur: number;
  setWallpaper: (wallpaper: string) => void;
  setBlur: (blur: number) => void;
}

export const useDesktopStore = create<DesktopState>((set) => ({
  wallpaper: "default",
  blur: 0,
  setWallpaper: (wallpaper) => set({ wallpaper }),
  setBlur: (blur) => set({ blur }),
}));