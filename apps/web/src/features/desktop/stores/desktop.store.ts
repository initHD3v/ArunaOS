import { create } from "zustand";
import type { DesktopIconData } from "@/types";

interface DesktopState {
  icons: DesktopIconData[];
  selectedIconId: string | null;
  wallpaper: string;
  blur: number;

  setSelectedIcon: (id: string | null) => void;
  setWallpaper: (wallpaper: string) => void;
}

export const useDesktopStore = create<DesktopState>((set) => ({
  icons: [
    { id: "ai", title: "AI", icon: "sparkles", position: 0, appId: "ai" },
    { id: "files", title: "Files", icon: "folder", position: 1, appId: "files" },
    { id: "settings", title: "Settings", icon: "settings", position: 2, appId: "settings" },
  ],
  selectedIconId: null,
  wallpaper: "default",
  blur: 0,

  setSelectedIcon: (id) => set({ selectedIconId: id }),
  setWallpaper: (wallpaper) => set({ wallpaper }),
}));