import { create } from 'zustand';

interface OverlayStore {
  visible: boolean;
  content: React.ReactNode | null;
  showOverlay: (content: React.ReactNode) => void;
  hideOverlay: () => void;
}

export const useOverlayStore = create<OverlayStore>((set) => ({
  visible: false,
  content: null,

  showOverlay: (content) => set({ visible: true, content }),

  hideOverlay: () => set({ visible: false, content: null }),
}));
