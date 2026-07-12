import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AssistantState,
  DailyBrief,
  DailyReflection,
  ProductivitySummary,
  Suggestion,
} from '../engines/types';
import { getArunaCore } from '../engines/aruna-core';

let _container: { get: (name: string) => unknown } | null = null;

export function setCoreContainer(container: { get: (name: string) => unknown }) {
  _container = container;
}

interface ArunaAssistantState {
  /* Core state */
  initialized: boolean;
  brief: DailyBrief | null;
  dailyReflection: DailyReflection | null;
  productivitySummary: ProductivitySummary | null;
  suggestions: Suggestion[];
  assistantState: AssistantState;
  conversationPreview: string;

  /* UI state */
  collapsed: boolean;
  position: { x: number; y: number };

  /* Input mode */
  inputMode: 'idle' | 'voice' | 'keyboard';
  voiceActive: boolean;
  processing: boolean;

  /* Actions */
  init: (container?: { get: (name: string) => unknown }) => Promise<void>;
  destroy: () => void;
  suspend: () => void;
  restore: () => Promise<void>;
  refreshBrief: () => void;
  refreshSuggestions: () => void;
  refreshReflection: () => void;
  setCollapsed: (v: boolean) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setInputMode: (mode: 'idle' | 'voice' | 'keyboard') => void;
  toggleVoice: () => void;
  processInput: (text: string) => Promise<string>;
}

export const useArunaAssistantStore = create<ArunaAssistantState>()(
  persist(
    (set, get) => {
      const core = getArunaCore();

      return {
        initialized: false,
        brief: null,
        dailyReflection: null,
        productivitySummary: null,
        suggestions: [],
        assistantState: 'idle',
        conversationPreview: "I'm ready whenever you are.",
        collapsed: false,
        position: { x: 0, y: 0 },
        inputMode: 'idle',
        voiceActive: false,
        processing: false,

        init: async (container) => {
          if (get().initialized) return;
          if (container) _container = container;
          await core.init(_container ?? undefined);
          set({ initialized: true, assistantState: core.state.current });

          const brief = core.generateBrief();
          const suggestions = core.generateSuggestions();
          set({ brief, suggestions });

          core.state.onStateChange((_from, to) => {
            set({ assistantState: to });
          });

          core.onContextChange(() => {
            const s = core.generateSuggestions();
            set({ suggestions: s });
          });
        },

        destroy: () => {
          core.destroy();
          set({ initialized: false });
        },

        suspend: () => {
          core.destroy();
          set({
            initialized: false,
            assistantState: 'sleeping',
            processing: false,
            voiceActive: false,
            inputMode: 'idle',
          });
        },

        restore: async () => {
          if (get().initialized || !_container) return;
          await core.init(_container ?? undefined);
          set({ initialized: true, assistantState: core.state.current });

          const brief = core.generateBrief();
          const suggestions = core.generateSuggestions();
          set({ brief, suggestions });

          core.state.onStateChange((_from, to) => {
            set({ assistantState: to });
          });

          core.onContextChange(() => {
            const s = core.generateSuggestions();
            set({ suggestions: s });
          });
        },

        refreshBrief: () => {
          const brief = core.generateBrief();
          set({ brief });
        },

        refreshSuggestions: () => {
          const suggestions = core.generateSuggestions();
          set({ suggestions });
        },

        refreshReflection: () => {
          const reflection = core.generateDailyReflection();
          const summary = core.getProductivitySummary();
          set({ dailyReflection: reflection, productivitySummary: summary });
        },

        setCollapsed: (v) => set({ collapsed: v }),
        setPosition: (pos) => set({ position: pos }),
        setInputMode: (mode) => set({ inputMode: mode }),

        toggleVoice: () => {
          const active = !get().voiceActive;
          set({ voiceActive: active, inputMode: active ? 'voice' : 'idle' });
        },

        processInput: async (text) => {
          set({ processing: true });
          try {
            const result = core.processInput(text);
            const response = await core.executeIntent(result.intent, result.planId);
            set({
              conversationPreview: response || undefined,
              inputMode: 'idle',
              processing: false,
            });
            core.learner.observeActivity('user-input', { text, response });
            return response;
          } catch {
            set({ processing: false });
            return 'Maaf, terjadi kesalahan.';
          }
        },
      };
    },
    {
      name: 'arunaos-assistant',
      partialize: (state) => ({
        collapsed: state.collapsed,
        position: state.position,
      }),
    },
  ),
);
