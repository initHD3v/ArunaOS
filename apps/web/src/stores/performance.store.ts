import { create } from 'zustand';

export type PerfMode = 'normal' | 'screensaver' | 'sleep';

interface PerformanceStore {
  mode: PerfMode;
  setMode: (mode: PerfMode) => void;
}

export const usePerformanceStore = create<PerformanceStore>((set) => ({
  mode: 'normal',
  setMode: (mode) => set({ mode }),
}));
