'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CameraMode = 'photo' | 'video';
export type TimerDuration = 0 | 3 | 10;
export type FilterId = 'none' | 'bw' | 'vivid' | 'warm' | 'cool' | 'soft';
export type AspectId = 'original' | '16:9' | '4:3' | '1:1' | '9:16';

export interface CameraSettings {
  mode: CameraMode;
  timer: TimerDuration;
  showGrid: boolean;
  mirror: boolean;
  flash: boolean;
  filter: FilterId;
  zoom: number;
  aspect: AspectId;
}

interface CameraStore extends CameraSettings {
  setMode: (m: CameraMode) => void;
  setTimer: (t: TimerDuration) => void;
  toggleGrid: () => void;
  toggleMirror: () => void;
  toggleFlash: () => void;
  setFilter: (f: FilterId) => void;
  setZoom: (z: number) => void;
  setAspect: (a: AspectId) => void;
}

export const useCameraStore = create<CameraStore>()(
  persist(
    (set) => ({
      mode: 'photo',
      timer: 0,
      showGrid: false,
      mirror: true,
      flash: false,
      filter: 'none',
      zoom: 1,
      aspect: 'original' as AspectId,
      setMode: (mode) => set({ mode }),
      setTimer: (timer) => set({ timer }),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleMirror: () => set((s) => ({ mirror: !s.mirror })),
      toggleFlash: () => set((s) => ({ flash: !s.flash })),
      setFilter: (filter) => set({ filter }),
      setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(1, zoom)) }),
      setAspect: (aspect) => set({ aspect }),
    }),
    { name: 'aruna-camera-settings' },
  ),
);

export const FILTERS: { id: FilterId; label: string; css: string }[] = [
  { id: 'none', label: 'Original', css: '' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.5) contrast(1.05)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.2) brightness(1.05)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(10deg) saturate(1.1) brightness(1.02)' },
  { id: 'soft', label: 'Soft', css: 'contrast(0.95) brightness(1.08) saturate(0.9)' },
];

export const ASPECTS: { id: AspectId; label: string; ratio: string }[] = [
  { id: 'original', label: 'Original', ratio: '' },
  { id: '16:9', label: '16:9', ratio: '16 / 9' },
  { id: '4:3', label: '4:3', ratio: '4 / 3' },
  { id: '1:1', label: '1:1', ratio: '1 / 1' },
  { id: '9:16', label: '9:16', ratio: '9 / 16' },
];
