import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneratedModule {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  entry?: string;
  files?: string[];
  code?: string;
  createdAt: number;
}

interface GeneratedModulesState {
  modules: GeneratedModule[];
  add: (mod: GeneratedModule) => boolean;
  remove: (id: string) => void;
}

/**
 * Persisted store for modules created by the AI (`generate_module` tool).
 * Registered into the ModuleRegistry at boot so they appear in
 * Applications / Module Installer across reloads.
 */
export const useGeneratedModulesStore = create<GeneratedModulesState>()(
  persist(
    (set, get) => ({
      modules: [],
      add: (mod) => {
        if (get().modules.some((m) => m.id === mod.id)) return false;
        set({ modules: [...get().modules, mod] });
        return true;
      },
      remove: (id) => set({ modules: get().modules.filter((m) => m.id !== id) }),
    }),
    { name: 'arunaos-generated-modules' },
  ),
);
