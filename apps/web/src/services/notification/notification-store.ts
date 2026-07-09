'use client';

import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
  toast: boolean;
  createdAt: number;
  action?: { label: string; handler: () => void };
}

interface NotificationStore {
  queue: Notification[];
  add: (n: Notification) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  queue: [],

  add: (n) =>
    set((state) => {
      if (n.toast) {
        const filtered = state.queue.filter((x) => x.toast);
        const nonToast = state.queue.filter((x) => !x.toast);
        const toasts = [n, ...filtered].slice(0, 5);
        return { queue: [...nonToast, ...toasts] };
      }
      return { queue: [...state.queue, n] };
    }),

  dismiss: (id) =>
    set((state) => ({
      queue: state.queue.filter((n) => n.id !== id),
    })),

  dismissAll: () => set({ queue: [] }),
}));
