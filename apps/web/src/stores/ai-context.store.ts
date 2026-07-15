'use client';

import { create } from 'zustand';

export interface AIQuickAsk {
  open: boolean;
  prompt: string;
}

interface AIContextState {
  quickAsk: AIQuickAsk;
  askAI: (prompt?: string) => void;
  closeQuickAsk: () => void;
}

export const useAIContextStore = create<AIContextState>((set) => ({
  quickAsk: { open: false, prompt: '' },
  askAI: (prompt = '') => set({ quickAsk: { open: true, prompt } }),
  closeQuickAsk: () => set({ quickAsk: { open: false, prompt: '' } }),
}));
