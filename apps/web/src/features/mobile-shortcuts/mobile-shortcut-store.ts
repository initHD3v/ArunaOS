'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MobileShortcutState {
  visible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

export const useMobileShortcutStore = create<MobileShortcutState>()(
  persist(
    (set, get) => ({
      visible: false, // default hide saat ArunaOS di-hide / fresh load
      show: () => set({ visible: true }),
      hide: () => set({ visible: false }),
      toggle: () => set({ visible: !get().visible }),
    }),
    { name: 'aruna-mobile-shortcut-visible' },
  ),
);
