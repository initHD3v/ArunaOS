'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderStatus {
  type: string;
  model: string;
  available: boolean;
}

interface ProviderConfig {
  type: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  expanded: boolean;
}

const PROVIDER_META: Record<
  string,
  { label: string; defaultBaseUrl: string; defaultModel: string; getApiKeyUrl: string }
> = {
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    getApiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    getApiKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  openrouter: {
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o',
    getApiKeyUrl: 'https://openrouter.ai/keys',
  },
  ollama: {
    label: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    getApiKeyUrl: 'https://ollama.com/download',
  },
};

const PROVIDER_ORDER = ['openai', 'anthropic', 'openrouter', 'ollama'];

export function AISettingsPanel() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [configs, setConfigs] = useState<ProviderConfig[]>(() =>
    PROVIDER_ORDER.map((type) => ({
      type,
      apiKey: '',
      baseUrl: PROVIDER_META[type]!.defaultBaseUrl,
      model: PROVIDER_META[type]!.defaultModel,
      expanded: true,
    })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProviders(data.providers ?? []);

      // Update config models from detected providers
      if (data.providers) {
        setConfigs((prev) =>
          prev.map((cfg) => {
            const detected = data.providers.find((p: ProviderStatus) => p.type === cfg.type);
            if (detected) {
              return { ...cfg, model: cfg.model || detected.model || cfg.model };
            }
            return cfg;
          }),
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI status');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved config from localStorage first, then server session
  useEffect(() => {
    // 1. Restore from localStorage (survives refresh)
    const savedRaw = localStorage.getItem('ai-provider-configs');
    if (savedRaw) {
      try {
        const savedProviders = JSON.parse(savedRaw) as Array<{
          type: string;
          apiKey?: string;
          baseUrl?: string;
          model?: string;
        }>;
        if (savedProviders.length > 0) {
          setConfigs((prev) =>
            prev.map((cfg) => {
              const saved = savedProviders.find((p) => p.type === cfg.type);
              if (saved) {
                return {
                  ...cfg,
                  apiKey: saved.apiKey ?? '',
                  baseUrl: saved.baseUrl ?? PROVIDER_META[cfg.type]?.defaultBaseUrl ?? cfg.baseUrl,
                  model: saved.model ?? cfg.model,
                };
              }
              return cfg;
            }),
          );
        }
      } catch {
        /* ignore corrupt data */
      }
    }

    // 2. Try server session as fallback
    const sid = localStorage.getItem('ai-session-id');
    if (sid) {
      setSessionId(sid);
      fetch(`/api/ai/settings?sessionId=${sid}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.providers?.length) {
            setConfigs((prev) =>
              prev.map((cfg) => {
                const saved = data.providers.find((p: { type: string }) => p.type === cfg.type);
                if (saved) {
                  return {
                    ...cfg,
                    apiKey: saved.apiKey ?? '',
                    baseUrl:
                      saved.baseUrl ?? PROVIDER_META[cfg.type]?.defaultBaseUrl ?? cfg.baseUrl,
                    model: saved.model ?? cfg.model,
                  };
                }
                return cfg;
              }),
            );
          }
        })
        .catch(() => {});
    }
    fetchStatus();
  }, [fetchStatus]);

  const toggleKeyVisibility = (type: string) => {
    setShowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const updateConfig = (type: string, field: keyof ProviderConfig, value: string) => {
    setConfigs((prev) => prev.map((cfg) => (cfg.type === type ? { ...cfg, [field]: value } : cfg)));
    setSaveStatus('idle');
  };

  const toggleExpanded = (type: string) => {
    setConfigs((prev) =>
      prev.map((cfg) => (cfg.type === type ? { ...cfg, expanded: !cfg.expanded } : cfg)),
    );
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const providersPayload = configs.map((cfg) => ({
        type: cfg.type,
        apiKey: cfg.apiKey || undefined,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
      }));

      // Persist full config to localStorage (survives refresh)
      localStorage.setItem('ai-provider-configs', JSON.stringify(providersPayload));

      // Also persist to server session
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: providersPayload, sessionId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setSessionId(data.sessionId);
      localStorage.setItem('ai-session-id', data.sessionId);
      setSaveStatus('saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasAnyAvailable = providers.some((p) => p.available);
  const hasAnyConfig = configs.some((c) => c.apiKey);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-foreground mb-1 text-sm font-semibold">AI Configuration</h3>
        <p className="text-foreground/40 text-xs">
          Configure AI providers. Saved settings override environment variables. Settings are stored
          in your browser session and will persist until cleared.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
            hasAnyAvailable
              ? 'bg-success/15 text-success'
              : hasAnyConfig
                ? 'bg-warning/15 text-warning'
                : 'bg-muted text-foreground/40',
          )}
        >
          {hasAnyAvailable ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {hasAnyAvailable
            ? 'AI is available'
            : hasAnyConfig
              ? 'Custom config saved — restart required'
              : 'No AI providers configured'}
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
            'bg-muted text-foreground/60 hover:bg-muted/80',
            'disabled:opacity-40',
          )}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-xs',
            saveStatus === 'error' ? 'bg-danger/10 text-danger' : 'bg-danger/10 text-danger',
          )}
        >
          {error}
        </div>
      )}

      {saveStatus === 'saved' && (
        <div className="bg-success/10 text-success rounded-lg px-3 py-2 text-xs">
          AI configuration saved successfully.
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-foreground/30 text-[10px] font-medium uppercase tracking-wider">
          Provider Settings
        </h4>

        {loading && providers.length === 0 && (
          <div className="text-foreground/30 py-4 text-center text-xs">Loading...</div>
        )}

        {!loading && providers.length === 0 && !configs.some((c) => c.apiKey) && (
          <div className="border-border/20 rounded-lg border border-dashed px-4 py-6 text-center">
            <Sparkles size={20} className="text-foreground/20 mx-auto mb-2" />
            <p className="text-foreground/30 text-xs">
              No AI providers configured. Fill in the fields below and save.
            </p>
          </div>
        )}

        {configs.map((cfg) => {
          const detected = providers.find((p) => p.type === cfg.type);
          const meta = PROVIDER_META[cfg.type]!;
          return (
            <div
              key={cfg.type}
              className="border-border/20 bg-muted/50 overflow-hidden rounded-lg border"
            >
              <button
                onClick={() => toggleExpanded(cfg.type)}
                className="hover:bg-muted/30 flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <div
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    detected?.available
                      ? 'bg-success shadow-success/50 shadow-sm'
                      : cfg.apiKey
                        ? 'bg-warning'
                        : 'bg-foreground/30',
                  )}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-medium capitalize">
                      {meta?.label ?? cfg.type}
                    </span>
                    <span className="bg-muted text-foreground/50 rounded px-1.5 py-0.5 font-mono text-[10px]">
                      {cfg.model || (detected?.model ?? meta?.defaultModel ?? '—')}
                    </span>
                  </div>
                  {cfg.apiKey && (
                    <p className="text-foreground/30 mt-0.5 text-[10px]">Custom config applied</p>
                  )}
                </div>
                {cfg.expanded ? (
                  <ChevronDown size={14} className="text-foreground/30" />
                ) : (
                  <ChevronRight size={14} className="text-foreground/30" />
                )}
              </button>

              {cfg.expanded && (
                <div className="border-border/10 space-y-2.5 border-t px-3 py-3">
                  <div>
                    <label className="text-foreground/40 mb-1 block text-[10px] font-medium">
                      API Key{' '}
                      {detected?.available && (
                        <span className="text-foreground/20">(env var active)</span>
                      )}
                    </label>
                    <a
                      href={meta.getApiKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary mb-1.5 inline-flex items-center gap-1 text-[10px] hover:underline"
                    >
                      <ExternalLink size={10} />
                      Get {meta.label} API Key
                    </a>
                    <div className="relative">
                      <input
                        type={showKeys.has(cfg.type) ? 'text' : 'password'}
                        value={cfg.apiKey}
                        onChange={(e) => updateConfig(cfg.type, 'apiKey', e.target.value)}
                        placeholder={detected?.available ? 'Using env var' : 'sk-...'}
                        className={cn(
                          'w-full rounded-lg px-2.5 py-1.5 text-xs',
                          'bg-background text-foreground',
                          'border-border/20 focus:border-primary/30 border focus:outline-none',
                          'placeholder:text-foreground/20',
                        )}
                      />
                      <button
                        onClick={() => toggleKeyVisibility(cfg.type)}
                        className="text-foreground/30 hover:text-foreground/60 absolute right-2 top-1/2 -translate-y-1/2"
                        tabIndex={-1}
                      >
                        {showKeys.has(cfg.type) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-foreground/40 mb-1 block text-[10px] font-medium">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={cfg.baseUrl}
                      onChange={(e) => updateConfig(cfg.type, 'baseUrl', e.target.value)}
                      placeholder={meta?.defaultBaseUrl}
                      className={cn(
                        'w-full rounded-lg px-2.5 py-1.5 font-mono text-xs',
                        'bg-background text-foreground',
                        'border-border/20 focus:border-primary/30 border focus:outline-none',
                        'placeholder:text-foreground/20',
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-foreground/40 mb-1 block text-[10px] font-medium">
                      Model
                    </label>
                    <input
                      type="text"
                      value={cfg.model}
                      onChange={(e) => updateConfig(cfg.type, 'model', e.target.value)}
                      placeholder={meta?.defaultModel}
                      className={cn(
                        'w-full rounded-lg px-2.5 py-1.5 font-mono text-xs',
                        'bg-background text-foreground',
                        'border-border/20 focus:border-primary/30 border focus:outline-none',
                        'placeholder:text-foreground/20',
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          'bg-primary hover:bg-primary/90 text-white',
          'disabled:opacity-40',
        )}
      >
        <Save size={14} />
        {saving ? 'Saving...' : 'Save AI Configuration'}
      </button>

      <div className="border-border/20 bg-primary/5 rounded-lg border px-3 py-2.5">
        <p className="text-primary text-[10px]">
          Press{' '}
          <kbd className="border-border/20 text-primary rounded border px-1 font-mono">⌘⇧I</kbd> to
          open the AI Command Bar from anywhere.
        </p>
      </div>
    </div>
  );
}
