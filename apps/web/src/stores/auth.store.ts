import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.slice(),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  const hex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

interface StoredCredential {
  salt: string;
  hash: string;
}

interface AuthState {
  credential: StoredCredential | null;
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
      credential: null,
      isAuthEnabled: false,
      isLocked: false,
      hasSession: false,

      setPassword: async (password) => {
        const salt = generateSalt();
        const hash = await deriveKey(password, salt);
        set({ credential: { salt: bytesToHex(salt), hash } });
      },

      enableAuth: () => set({ isAuthEnabled: true, hasSession: false }),

      disableAuth: () =>
        set({ isAuthEnabled: false, credential: null, isLocked: false, hasSession: false }),

      login: async (password) => {
        const { credential } = get();
        if (!credential) return true;
        const salt = hexToBytes(credential.salt);
        const hash = await deriveKey(password, salt);
        const ok = hash === credential.hash;
        if (ok) set({ isLocked: false, hasSession: true });
        return ok;
      },

      lock: () => set({ isLocked: true, hasSession: false }),

      closeSession: () => set({ hasSession: false }),
    }),
    {
      name: 'arunaos-auth',
      partialize: (state) => ({
        credential: state.credential,
        isAuthEnabled: state.isAuthEnabled,
        isLocked: state.isLocked,
      }),
    },
  ),
);
