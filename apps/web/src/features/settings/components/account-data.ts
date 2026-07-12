const STORAGE_KEY = 'arunaos-account';

export interface AccountData {
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatar: string;
}

export function defaultAccount(): AccountData {
  return {
    username: 'user',
    displayName: 'User',
    email: '',
    bio: '',
    avatar: '🧑',
  };
}

export function loadAccount(): AccountData {
  if (typeof window === 'undefined') return defaultAccount();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultAccount(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultAccount();
}

export function saveAccount(data: AccountData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
