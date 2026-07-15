import { create } from 'zustand';
import { persist } from 'zustand/middleware';

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

interface AuthState {
  passwordHash: string;
  isAuthEnabled: boolean;
  isLocked: boolean;
  hasSession: boolean;

  setPassword: (password: string) => Promise<void>;
  enableAuth: () => void;
  disableAuth: () => void;
  login: (password: string) => Promise<boolean>;
  lock: () => void;
  closeSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      passwordHash: '',
      isAuthEnabled: false,
      isLocked: false,
      hasSession: false,

      setPassword: async (password) => {
        const h = await hashPassword(password);
        set({ passwordHash: h });
      },

      enableAuth: () => set({ isAuthEnabled: true, hasSession: false }),

      disableAuth: () =>
        set({ isAuthEnabled: false, passwordHash: '', isLocked: false, hasSession: false }),

      login: async (password) => {
        const { passwordHash } = get();
        if (!passwordHash) return true;
        const h = await hashPassword(password);
        const ok = h === passwordHash;
        if (ok) set({ isLocked: false, hasSession: true });
        return ok;
      },

      lock: () => set({ isLocked: true, hasSession: false }),

      closeSession: () => set({ hasSession: false }),
    }),
    {
      name: 'arunaos-auth',
      partialize: (state) => ({
        passwordHash: state.passwordHash,
        isAuthEnabled: state.isAuthEnabled,
        isLocked: state.isLocked,
      }),
    },
  ),
);
