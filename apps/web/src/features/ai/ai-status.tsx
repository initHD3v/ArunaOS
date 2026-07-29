'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import type { ModuleWindowService } from '@/services/module-window';

type AIHealth = 'full' | 'limited' | 'none';

function getHealthProviderConfig(): string | null {
  try {
    const activeType = localStorage.getItem('ai-active-provider');
    const raw = localStorage.getItem('ai-provider-configs');
    if (!raw) return null;
    const configs = JSON.parse(raw) as Array<{
      type: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    }>;
    let cfg = activeType ? configs.find((c) => c.type === activeType) : null;
    if (!cfg) cfg = configs.find((c) => c.apiKey) ?? configs.find((c) => c.baseUrl) ?? configs[0];
    if (!cfg) return null;
    return JSON.stringify({ type: cfg.type, apiKey: cfg.apiKey ?? '', baseUrl: cfg.baseUrl ?? '' });
  } catch {
    return null;
  }
}

export function AIStatus() {
  const [health, setHealth] = useState<AIHealth | null>(null);
  const moduleWindow = useService<ModuleWindowService>('moduleWindow');

  const checkHealth = useCallback(() => {
    const params = new URLSearchParams();
    const pc = getHealthProviderConfig();
    if (pc) params.set('providerConfig', pc);
    if (!navigator.onLine) params.set('online', 'false');

    fetch(`/api/ai/health?${params}`)
      .then((r) => r.json())
      .then((data) => setHealth(data.status as AIHealth))
      .catch(() => setHealth('none'));
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    const onOnline = () => checkHealth();
    const onOffline = () => checkHealth();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [checkHealth]);

  const handleClick = () => {
    moduleWindow.openModule('arunaos.ai').catch(() => {});
  };

  if (health === null) return null;

  const statusConfig = {
    full: { dot: 'bg-green-500', label: 'AI', title: 'AI Assistant — Connected' },
    limited: {
      dot: 'bg-yellow-500',
      label: 'AI Limited',
      title: 'AI — No internet, limited responses',
    },
    none: { dot: 'bg-red-500', label: 'AI Offline', title: 'AI not configured' },
  } as const;

  const config = statusConfig[health];

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
        health === 'full'
          ? 'text-primary hover:bg-primary/10'
          : 'text-foreground/40 hover:bg-muted',
      )}
      title={config.title}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {health === 'limited' && <WifiOff size={10} className="text-yellow-500" />}
      {health === 'none' && <AlertCircle size={10} className="text-red-500" />}
      {health === 'full' && <Sparkles size={10} />}
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  );
}
