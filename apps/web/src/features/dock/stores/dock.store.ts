'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type LucideIcon } from 'lucide-react';
import { ICON_MAP as SHARED_ICON_MAP } from '@/lib/icon-mapping';

export interface DockItem {
  id: string;
  appId: string;
  label: string;
  iconName: string;
  hidden: boolean;
}

export type DockPosition = 'bottom' | 'left' | 'right';

export interface DockSettings {
  iconSize: number;
  position: DockPosition;
  autoHide: boolean;
  magnification: boolean;
  magnificationSize: number;
}

export interface DockStoreState {
  items: DockItem[];
  settings: DockSettings;
}

export interface DockStoreActions {
  setIconSize: (size: number) => void;
  setPosition: (pos: DockPosition) => void;
  setAutoHide: (v: boolean) => void;
  setMagnification: (v: boolean) => void;
  setMagnificationSize: (size: number) => void;
  reorderItems: (fromIdx: number, toIdx: number) => void;
  toggleItemVisibility: (id: string) => void;
  removeFromDock: (id: string) => void;
  addToDock: (item: DockItem) => void;
  isInDock: (appId: string) => boolean;
  resetItems: () => void;
}

const DEFAULT_ITEMS: DockItem[] = [
  {
    id: 'applications',
    appId: 'applications',
    label: 'Applications',
    iconName: 'grid',
    hidden: false,
  },
  { id: 'ai', appId: 'ai', label: 'AI', iconName: 'sparkles', hidden: false },
  { id: 'files', appId: 'files', label: 'Files', iconName: 'folder', hidden: false },
  { id: 'camera', appId: 'camera', label: 'Camera', iconName: 'camera', hidden: false },
  { id: 'astat', appId: 'astat', label: 'AStat', iconName: 'activity', hidden: false },
  { id: 'appstore', appId: 'appstore', label: 'AppStore', iconName: 'appstore', hidden: false },
  { id: 'settings', appId: 'settings', label: 'Settings', iconName: 'settings', hidden: false },
];

const DEFAULT_SETTINGS: DockSettings = {
  iconSize: 22,
  position: 'bottom',
  autoHide: false,
  magnification: false,
  magnificationSize: 32,
};

export const ICON_MAP: Record<string, LucideIcon> = SHARED_ICON_MAP;

export const useDockStore = create<DockStoreState & DockStoreActions>()(
  persist(
    (set, get) => ({
      items: DEFAULT_ITEMS,
      settings: DEFAULT_SETTINGS,

      setIconSize: (size) => set((s) => ({ settings: { ...s.settings, iconSize: size } })),
      setPosition: (pos) => set((s) => ({ settings: { ...s.settings, position: pos } })),
      setAutoHide: (v) => set((s) => ({ settings: { ...s.settings, autoHide: v } })),
      setMagnification: (v) => set((s) => ({ settings: { ...s.settings, magnification: v } })),
      setMagnificationSize: (size) =>
        set((s) => ({ settings: { ...s.settings, magnificationSize: size } })),

      reorderItems: (fromIdx, toIdx) =>
        set((s) => {
          const items = [...s.items];
          const [moved] = items.splice(fromIdx, 1);
          items.splice(toIdx, 0, moved!);
          return { items };
        }),

      toggleItemVisibility: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i)),
        })),

      removeFromDock: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
        })),

      addToDock: (item) =>
        set((s) => {
          if (s.items.some((i) => i.id === item.id)) return s;
          return { items: [...s.items, item] };
        }),

      isInDock: (appId) => get().items.some((i) => i.appId === appId && !i.hidden),

      resetItems: () => set({ items: DEFAULT_ITEMS }),
    }),
    { name: 'arunaos-dock' },
  ),
);
