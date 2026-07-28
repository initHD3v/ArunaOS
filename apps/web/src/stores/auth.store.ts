import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function sha256(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

const STORAGE_KEY = 'arunaos-auth';

function migrateOldCredential(password: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Promise.resolve(false);
    const parsed = JSON.parse(raw)?.state;
    if (!parsed || !('passwordHash' in parsed)) return Promise.resolve(false);
    return sha256(password).then((h) => h === parsed.passwordHash);
  } catch {
    return Promise.resolve(false);
  }
}

function cleanupOldCredential(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.state && 'passwordHash' in parsed.state) {
      delete parsed.state.passwordHash;
      delete parsed.state.username;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    /* cleanup best-effort */
  }
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
        const { credential, isAuthEnabled } = get();

        if (!credential) {
          const migrated = await migrateOldCredential(password);
          if (migrated) {
            const salt = generateSalt();
            const hash = await deriveKey(password, salt);
            set({
              credential: { salt: bytesToHex(salt), hash },
              isLocked: false,
              hasSession: true,
            });
            cleanupOldCredential();
            return true;
          }
          return !isAuthEnabled;
        }

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
      name: STORAGE_KEY,
      partialize: (state) => ({
        credential: state.credential,
        isAuthEnabled: state.isAuthEnabled,
        isLocked: state.isLocked,
        hasSession: state.hasSession,
      }),
    },
  ),
);
