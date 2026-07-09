import { create } from "zustand";
import type { WorkspaceData } from "@/types";

interface WorkspaceStore {
  workspaces: Record<string, WorkspaceData>;
  activeWorkspaceId: string;
  activeWindowId: string | null;

  setActiveWindow: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: {
    main: { id: "main", name: "Main", activeWindowId: null },
  },
  activeWorkspaceId: "main",
  activeWindowId: null,

  setActiveWindow: (id) =>
    set({ activeWindowId: id }),
}));