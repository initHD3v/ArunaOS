'use client';

import { useEffect, useState } from 'react';

export type AIHealth = 'full' | 'limited' | 'none';

// P4: single shared health poller — previously ai-chat.tsx and ai-status.tsx
// each ran their own 30s fetch loop against /api/ai/health.

interface HealthCache {
  status: AIHealth;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000;

let cache: HealthCache | null = null;
let inFlight: Promise<AIHealth> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;
const subscribers = new Set<(status: AIHealth) => void>();

function getProviderConfigParam(): string | null {
  try {
    const activeType = localStorage.getItem('ai-active-provider');
    const raw = localStorage.getItem('ai-provider-configs');
    if (!raw) return null;
    const configs = JSON.parse(raw) as Array<{
      type: string;
      apiKey?: string;
      baseUrl?: string;
    }>;
    let cfg = activeType ? configs.find((c) => c.type === activeType) : null;
    if (!cfg) cfg = configs.find((c) => c.apiKey) ?? configs.find((c) => c.baseUrl) ?? configs[0];
    if (!cfg) return null;
    return JSON.stringify({ type: cfg.type, apiKey: cfg.apiKey ?? '', baseUrl: cfg.baseUrl ?? '' });
  } catch {
    return null;
  }
}

async function fetchHealth(): Promise<AIHealth> {
  const params = new URLSearchParams();
  const pc = getProviderConfigParam();
  if (pc) params.set('providerConfig', pc);
  if (typeof navigator !== 'undefined' && !navigator.onLine) params.set('online', 'false');

  try {
    const res = await fetch(`/api/ai/health?${params}`);
    const data = await res.json();
    return (data.status as AIHealth) ?? 'none';
  } catch {
    return 'none';
  }
}

function requestCheck(force: boolean): void {
  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) return;
  if (inFlight) return;

  inFlight = fetchHealth()
    .then((status) => {
      cache = { status, fetchedAt: Date.now() };
      for (const fn of subscribers) fn(status);
      return status;
    })
    .finally(() => {
      inFlight = null;
    });
}

function ensureLoop(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => requestCheck(true), CACHE_TTL_MS);
}

function stopLoopIfIdle(): void {
  if (subscriberCount === 0 && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Shared AI health state. Multiple consumers share one fetch loop.
 * Re-checks are triggered on provider config changes and online/offline
 * events; results are cached for 30s across all consumers.
 */
export function useAIHealth(): AIHealth {
  const [health, setHealth] = useState<AIHealth>(cache?.status ?? 'none');

  useEffect(() => {
    subscriberCount++;
    subscribers.add(setHealth);
    ensureLoop();

    const immediate = () => requestCheck(true);
    // Initial check (cached within TTL)
    requestCheck(false);

    const configChanged = () => immediate();
    window.addEventListener('online', immediate);
    window.addEventListener('offline', immediate);
    window.addEventListener('ai-provider-config-changed', configChanged);

    return () => {
      subscriberCount--;
      subscribers.delete(setHealth);
      window.removeEventListener('online', immediate);
      window.removeEventListener('offline', immediate);
      window.removeEventListener('ai-provider-config-changed', configChanged);
      stopLoopIfIdle();
    };
  }, []);

  return health;
}
