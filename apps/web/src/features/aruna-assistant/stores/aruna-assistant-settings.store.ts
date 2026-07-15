'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CollapsedButtonSize = 'small' | 'medium' | 'large';

interface ArunaAssistantSettingsState {
  startCollapsed: boolean;
  idleTimeout: number;
  idleOpacity: number;
  collapseOnEscape: boolean;
  buttonSize: CollapsedButtonSize;
  showWeather: boolean;
  showSuggestions: boolean;
  showContextSummary: boolean;
  rememberPosition: boolean;
  contextAware: boolean;

  setStartCollapsed: (v: boolean) => void;
  setIdleTimeout: (v: number) => void;
  setIdleOpacity: (v: number) => void;
  setCollapseOnEscape: (v: boolean) => void;
  setButtonSize: (v: CollapsedButtonSize) => void;
  setShowWeather: (v: boolean) => void;
  setShowSuggestions: (v: boolean) => void;
  setShowContextSummary: (v: boolean) => void;
  setRememberPosition: (v: boolean) => void;
  setContextAware: (v: boolean) => void;
}

export const useArunaAssistantSettings = create<ArunaAssistantSettingsState>()(
  persist(
    (set) => ({
      startCollapsed: false,
      idleTimeout: 3,
      idleOpacity: 0.25,
      collapseOnEscape: true,
      buttonSize: 'medium',
      showWeather: true,
      showSuggestions: true,
      showContextSummary: true,
      rememberPosition: true,
      contextAware: true,

      setStartCollapsed: (v) => set({ startCollapsed: v }),
      setIdleTimeout: (v) => set({ idleTimeout: v }),
      setIdleOpacity: (v) => set({ idleOpacity: v }),
      setCollapseOnEscape: (v) => set({ collapseOnEscape: v }),
      setButtonSize: (v) => set({ buttonSize: v }),
      setShowWeather: (v) => set({ showWeather: v }),
      setShowSuggestions: (v) => set({ showSuggestions: v }),
      setShowContextSummary: (v) => set({ showContextSummary: v }),
      setRememberPosition: (v) => set({ rememberPosition: v }),
      setContextAware: (v) => set({ contextAware: v }),
    }),
    { name: 'arunaos-assistant-settings' },
  ),
);

export const BUTTON_SIZE_MAP: Record<CollapsedButtonSize, { container: string; logo: string }> = {
  small: { container: 'h-14 w-14', logo: 'h-8 w-8' },
  medium: { container: 'h-20 w-20', logo: 'h-11 w-11' },
  large: { container: 'h-24 w-24', logo: 'h-14 w-14' },
};
