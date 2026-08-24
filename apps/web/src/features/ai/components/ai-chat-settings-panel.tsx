'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
  ChevronDown,
  Loader2,
  Download,
  X,
  Wifi,
  Globe,
  Trash2,
} from 'lucide-react';
import { TestConnectionModal, type TestStep } from './test-connection-modal';
import { ModelDownloadModal } from './model-download-modal';

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
    defaultModel: 'z-ai/glm-5.2:free',
    getApiKeyUrl: 'https://openrouter.ai/keys',
  },
  ollama: {
    label: 'Ollama (Local)',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    getApiKeyUrl: 'https://ollama.com/download',
  },
  lmstudio: {
    label: 'LM Studio (Local)',
    defaultBaseUrl: 'http://127.0.0.1:1234',
    defaultModel: '',
    getApiKeyUrl: '',
  },
  native: {
    label: 'Native (Browser)',
    defaultBaseUrl: '',
    defaultModel: 'Qwen2.5-0.5B',
    getApiKeyUrl: '',
  },
  deepseek: {
    label: 'DeepSeek V4 Flash (Free)',
    defaultBaseUrl: 'https://q5dh1rfszfym23hj.us-east-2.aws.endpoints.huggingface.cloud/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V4-Flash-0731',
    getApiKeyUrl: '',
  },
};

const KEYLESS_PROVIDERS = new Set(['ollama', 'lmstudio', 'native', 'deepseek']);

const HIDDEN_PROVIDERS_KEY = 'ai-hidden-providers';

function loadHiddenProviders(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_PROVIDERS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((t): t is string => typeof t === 'string' && t in PROVIDER_META);
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveHiddenProviders(types: string[]) {
  localStorage.setItem(HIDDEN_PROVIDERS_KEY, JSON.stringify(types));
}

const PROVIDER_ORDER: (keyof typeof PROVIDER_META)[] = [
  'openai',
  'anthropic',
  'openrouter',
  'deepseek',
  'ollama',
  'lmstudio',
  'native',
];

const PROVIDER_HELP: Record<string, string> = {
  openai: 'Paste your OpenAI API key. Get one from the OpenAI dashboard.',
  anthropic: 'Enter your Anthropic API key to use Claude models.',
  openrouter:
    'Use OpenRouter to access many models through a single API. Models ending in :free can be used at no cost.',
  ollama: 'Run models locally with Ollama. No API key needed.',
  lmstudio: 'Run local models via LM Studio. No API key needed.',
  native: 'Run AI directly in your browser. No server or API key needed.',
  deepseek:
    'Free public DeepSeek V4 Flash endpoint. No API key or account required — works out of the box.',
};

function loadSingleConfig() {
  const meta = PROVIDER_META['openai']!;
  try {
    const raw = localStorage.getItem('ai-provider-configs');
    if (raw) {
      const parsed = JSON.parse(raw) as Array<{
        type: string;
        apiKey?: string;
        baseUrl?: string;
        model?: string;
      }>;
      if (Array.isArray(parsed)) {
        // Try active provider first
        const activeType = localStorage.getItem('ai-active-provider');
        let cfg = activeType ? parsed.find((c) => c.type === activeType) : null;
        // Fallback to first with apiKey, then first with baseUrl, then first
        if (!cfg) cfg = parsed.find((c) => c.apiKey) ?? parsed.find((c) => c.baseUrl) ?? parsed[0];
        if (cfg) {
          const m = PROVIDER_META[cfg.type];
          return {
            provider: cfg.type,
            apiKey: cfg.apiKey ?? '',
            baseUrl: cfg.baseUrl ?? m?.defaultBaseUrl ?? '',
            model: cfg.model ?? m?.defaultModel ?? '',
          };
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { provider: 'openai', apiKey: '', baseUrl: meta.defaultBaseUrl, model: meta.defaultModel };
}

function saveSingleConfig(data: {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}) {
  // Permanently deleted providers are never re-added by saving.
  const deleted = loadHiddenProviders();
  const configs = PROVIDER_ORDER.filter((type) => !deleted.includes(type)).map((type) => {
    const m = PROVIDER_META[type]!;
    return type === data.provider
      ? { type, apiKey: data.apiKey, baseUrl: data.baseUrl, model: data.model }
      : { type, apiKey: '', baseUrl: m.defaultBaseUrl, model: m.defaultModel };
  });
  localStorage.setItem('ai-provider-configs', JSON.stringify(configs));
  localStorage.setItem('ai-active-provider', data.provider);
  window.dispatchEvent(new Event('ai-provider-config-changed'));
}

interface AIChatSettingsPanelProps {
  onClose: () => void;
}

export function AIChatSettingsPanel({ onClose }: AIChatSettingsPanelProps) {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [invalidKey, setInvalidKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testLatency, setTestLatency] = useState('');
  const [modelDownloadOpen, setModelDownloadOpen] = useState(false);
  const [modelDownloading, setModelDownloading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [freeOnly, setFreeOnly] = useState(true);
  const [modelQuery, setModelQuery] = useState('');
  const [hiddenProviders, setHiddenProviders] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const cfg = loadSingleConfig();
    setProvider(cfg.provider);
    setApiKey(cfg.apiKey);
    setBaseUrl(cfg.baseUrl);
    setModel(cfg.model);
    setShowKey(KEYLESS_PROVIDERS.has(cfg.provider));
    setWebSearchEnabled(localStorage.getItem('ai-web-search') !== 'false');
    setFreeOnly(localStorage.getItem('ai-openrouter-free-only') !== 'false');
    setHiddenProviders(loadHiddenProviders());
  }, []);

  const meta = PROVIDER_META[provider];
  const hasKey = apiKey.length > 0;
  const visibleProviders = PROVIDER_ORDER.filter((t) => !hiddenProviders.includes(t));

  const selectProvider = (type: string) => {
    const m = PROVIDER_META[type];
    // Load the saved config of the selected provider (if any) so stale form
    // values from the previously-selected provider can never leak into a
    // different provider's entry when saving (this previously wrote LM Studio
    // URLs into OpenRouter's apiKey field).
    let saved: { apiKey?: string; baseUrl?: string; model?: string } | null = null;
    try {
      const raw = localStorage.getItem('ai-provider-configs');
      const parsed = raw
        ? (JSON.parse(raw) as Array<{
            type: string;
            apiKey?: string;
            baseUrl?: string;
            model?: string;
          }>)
        : [];
      if (Array.isArray(parsed)) {
        saved = parsed.find((c) => c.type === type) ?? null;
      }
    } catch {
      /* ignore */
    }
    setProvider(type);
    setProviderOpen(false);
    setConfirmDelete(null);
    setApiKey(saved?.apiKey ?? '');
    setInvalidKey(false);
    setBaseUrl(saved?.baseUrl ?? m?.defaultBaseUrl ?? '');
    setModel(saved?.model ?? m?.defaultModel ?? '');
    setShowKey(KEYLESS_PROVIDERS.has(type));
    setAvailableModels([]);
    setModelQuery('');
    setTestResult('idle');
  };

  const handleDeleteProvider = async (type: string) => {
    const nextHidden = [...hiddenProviders, type];
    setHiddenProviders(nextHidden);
    saveHiddenProviders(nextHidden);
    setConfirmDelete(null);

    // Remove the provider entry entirely from local configs
    try {
      const raw = localStorage.getItem('ai-provider-configs');
      const parsed = raw ? (JSON.parse(raw) as Array<{ type: string }>) : [];
      if (Array.isArray(parsed)) {
        localStorage.setItem(
          'ai-provider-configs',
          JSON.stringify(parsed.filter((c) => c.type !== type)),
        );
        window.dispatchEvent(new Event('ai-provider-config-changed'));
      }
    } catch {
      /* ignore */
    }

    // Repoint active provider if it referenced the deleted one
    const next = visibleProviders.find((t) => t !== type);
    if (localStorage.getItem('ai-active-provider') === type) {
      localStorage.setItem('ai-active-provider', next ?? '');
      window.dispatchEvent(new Event('ai-provider-config-changed'));
    }

    // If the deleted provider was selected in the form, switch to the first remaining one
    if (provider === type && next) selectProvider(next);

    // Best-effort: remove the provider from the server-side session copy too
    try {
      const sid = localStorage.getItem('ai-session-id');
      if (sid) {
        const res = await fetch(`/api/ai/settings?sessionId=${encodeURIComponent(sid)}`);
        const data = (await res.json()) as { providers?: Array<{ type: string }> };
        if (Array.isArray(data.providers)) {
          await fetch('/api/ai/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sid,
              providers: data.providers.filter((c) => c.type !== type),
            }),
          });
        }
      }
    } catch {
      /* ignore */
    }
  };

  const toggleFreeOnly = () => {
    setFreeOnly((prev) => {
      const next = !prev;
      localStorage.setItem('ai-openrouter-free-only', next ? 'true' : 'false');
      return next;
    });
  };

  const displayModels = (() => {
    let list = availableModels;
    if (provider === 'openrouter' && freeOnly) {
      list = list.filter((m) => m.endsWith(':free'));
    }
    const q = modelQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => m.toLowerCase().includes(q));
    }
    if (provider === 'openrouter') {
      return [...list].sort((a, b) => {
        const fa = a.endsWith(':free') ? 0 : 1;
        const fb = b.endsWith(':free') ? 0 : 1;
        return fa - fb || a.localeCompare(b);
      });
    }
    return list;
  })();

  const handleSave = () => {
    // Guard: a URL is never a valid API key. This blocks the exact corruption
    // seen when a baseUrl (e.g. LM Studio's http://127.0.0.1:1234) ends up in
    // the key field — OpenRouter then answers 401 "Missing Authentication header".
    if (!KEYLESS_PROVIDERS.has(provider) && /^https?:\/\//i.test(apiKey.trim())) {
      setInvalidKey(true);
      return;
    }
    saveSingleConfig({ provider, apiKey, baseUrl, model });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const updateStep = (index: number, updates: Partial<TestStep>) => {
    setTestSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const testConnection = useCallback(async () => {
    setAvailableModels([]);
    setTestResult('testing');
    setTestLatency('');

    const epLabel =
      provider === 'ollama'
        ? `${baseUrl.replace(/\/$/, '')}/api/tags → ${baseUrl.replace(/\/$/, '')}/v1/models`
        : provider === 'lmstudio'
          ? `${baseUrl.replace(/\/$/, '')}/v1/models`
          : `${baseUrl.replace(/\/$/, '')}/models`;

    const steps: TestStep[] = [
      { label: 'Preparing endpoint', status: 'running', detail: `Target: ${epLabel}` },
      { label: 'Connecting to server', status: 'pending' },
      { label: 'Sending request', status: 'pending' },
      { label: 'Parsing response', status: 'pending' },
      { label: 'Fetching available models', status: 'pending' },
    ];
    setTestSteps(steps);
    setTestModalOpen(true);

    // Step 1 done
    updateStep(0, { status: 'done', detail: `Endpoint: ${epLabel}` });
    await new Promise((r) => setTimeout(r, 200));

    // Step 2-3: make the API call
    updateStep(1, { status: 'running', detail: 'Waiting for server response...' });
    updateStep(2, { status: 'running' });

    try {
      const start = performance.now();
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey }),
      });
      const latency = ((performance.now() - start) / 1000).toFixed(2);
      setTestLatency(`${latency}s`);

      updateStep(1, { status: 'done', detail: `Connected (${latency}s)` });
      updateStep(2, { status: 'done', detail: `HTTP ${res.status} ${res.statusText}` });

      const data = await res.json();

      // Step 4: Parse response
      if (data.ok) {
        updateStep(3, { status: 'done', detail: 'Response parsed successfully' });

        // Step 5: Models
        if (data.models?.length > 0) {
          setAvailableModels(data.models);
          const preferred =
            provider === 'openrouter'
              ? (data.models.find((m: string) => m.endsWith(':free')) ?? data.models[0])
              : data.models[0];
          if (!model || !data.models.includes(model)) {
            setModel(preferred);
          }
          const freeCount =
            provider === 'openrouter'
              ? `${data.models.filter((m: string) => m.endsWith(':free')).length} free of `
              : '';
          updateStep(4, {
            status: 'done',
            detail: `Found ${freeCount}${data.models.length} model${data.models.length > 1 ? 's' : ''}: ${data.models.slice(0, 5).join(', ')}${data.models.length > 5 ? '...' : ''}`,
          });
        } else {
          updateStep(4, { status: 'done', detail: 'No models returned by server' });
        }

        setTestResult('success');
      } else {
        updateStep(3, {
          status: 'error',
          detail: `Status ${data.statusCode}: ${data.error ?? 'Unknown error'}`,
        });
        setTestSteps((prev) => [
          ...prev.slice(0, 3),
          ...prev.slice(3).map((s) => ({ ...s, status: 'pending' as const })),
        ]);
        setTestResult('error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      updateStep(1, { status: 'error', detail: `Failed to reach server` });
      updateStep(2, { status: 'error', detail: msg });
      setTestResult('error');
    }
  }, [provider, baseUrl, apiKey, model]);

  const downloadModel = useCallback(async () => {
    if (modelDownloading) return;
    setModelDownloading(true);
    setModelDownloadOpen(true);
    try {
      const { NativeModelProvider } = await import('@arunaos/ai/providers/native');
      const modelProvider = new NativeModelProvider();
      await modelProvider.load();
    } catch {
      // error handled via progress event
    } finally {
      setModelDownloading(false);
    }
  }, [modelDownloading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      testConnection();
    }
  };

  return (
    <div className="border-border/20 flex h-full w-72 shrink-0 flex-col border-l">
      {/* Header */}
      <div className="border-border/20 flex items-center justify-between border-b px-4 py-2.5">
        <div>
          <h4 className="text-xs font-medium">Settings</h4>
          <p className="text-foreground/40 mt-0.5 text-[10px]">
            {hasKey ? `${meta?.label ?? provider} configured` : 'Configure AI provider'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-foreground/50 hover:text-foreground rounded-md p-1 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Provider */}
        <div>
          <label className="text-foreground/50 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">
            Provider
          </label>
          <div className="relative">
            <button
              onClick={() => setProviderOpen(!providerOpen)}
              className="border-border/20 bg-muted text-foreground focus:border-primary/50 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs outline-none transition-colors"
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  hasKey ? 'bg-green-500' : 'bg-foreground/20',
                )}
              />
              <span className="flex-1 font-medium">{meta?.label ?? provider}</span>
              <ChevronDown
                className={cn(
                  'text-foreground/40 h-3 w-3 transition-transform',
                  providerOpen && 'rotate-180',
                )}
              />
            </button>
            {providerOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setProviderOpen(false);
                    setConfirmDelete(null);
                  }}
                />
                <div className="border-border/20 bg-card absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border shadow-lg">
                  {visibleProviders.map((type) => {
                    const m = PROVIDER_META[type];
                    const isConfirming = confirmDelete === type;
                    return (
                      <div
                        key={type}
                        className={cn('flex items-center', type === provider ? 'bg-muted' : '')}
                      >
                        {isConfirming ? (
                          <>
                            <span className="text-foreground/60 flex-1 px-2.5 py-2 text-[10px] leading-snug">
                              Hapus permanen <span className="font-medium">{m?.label ?? type}</span>
                              ? API key tersimpan juga akan dihapus dan tidak bisa dipulihkan.
                            </span>
                            <button
                              onClick={() => void handleDeleteProvider(type)}
                              className="text-danger hover:text-danger/80 shrink-0 px-2 py-2 text-[10px] font-medium"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-foreground/50 hover:text-foreground shrink-0 py-2 pr-2 text-[10px]"
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                selectProvider(type);
                              }}
                              className="hover:bg-muted flex flex-1 items-center gap-2 px-2.5 py-2 text-left text-xs transition-colors"
                            >
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  type === provider && hasKey ? 'bg-green-500' : 'bg-foreground/20',
                                )}
                              />
                              <span className="flex-1 font-medium">{m?.label ?? type}</span>
                            </button>
                            <button
                              onClick={() => setConfirmDelete(type)}
                              disabled={visibleProviders.length <= 1}
                              className="text-foreground/30 hover:text-danger disabled:hover:text-foreground/30 mr-1.5 shrink-0 rounded p-1 transition-colors disabled:opacity-20"
                              title={`Hapus ${m?.label ?? type}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <p className="text-foreground/40 mt-1 text-[10px] leading-relaxed">
            {PROVIDER_HELP[provider]}
          </p>
        </div>

        {provider === 'native' ? (
          <>
            {/* Native model info */}
            <div>
              <label className="text-foreground/50 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">
                Model
              </label>
              <div className="bg-muted/50 flex items-center gap-2.5 rounded-lg px-3 py-3">
                <svg
                  className="text-foreground/40 h-5 w-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M9 9h6v6H9z" />
                  <path d="M15 9l3-3" />
                </svg>
                <div className="flex-1">
                  <p className="text-foreground/70 text-xs font-medium">
                    Qwen2.5-0.5B-Instruct (ONNX)
                  </p>
                  <p className="text-foreground/40 mt-0.5 text-[10px] leading-relaxed">
                    Runs entirely in your browser. No server needed.
                    {typeof navigator !== 'undefined' &&
                      'deviceMemory' in navigator &&
                      (navigator as Navigator & { deviceMemory: number }).deviceMemory < 4 && (
                        <span className="mt-0.5 block text-amber-500/80">
                          Low memory — will use SmolLM2-360M.
                        </span>
                      )}
                  </p>
                </div>
              </div>
            </div>

            {/* Download button */}
            <div>
              <button
                onClick={downloadModel}
                disabled={modelDownloading}
                className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                {modelDownloading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" /> Download Model
                  </>
                )}
              </button>
              <p className="text-foreground/30 mt-1.5 text-center text-[10px]">
                ~300MB download. Cached after first load.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* API Key */}
            <div>
              <label className="text-foreground/50 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">
                API Key
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setInvalidKey(false);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    KEYLESS_PROVIDERS.has(provider)
                      ? 'Leave empty if not required'
                      : 'Paste your API key...'
                  }
                  style={
                    !showKey ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined
                  }
                  className="border-border/20 bg-muted text-foreground placeholder:text-foreground/30 focus:border-primary/50 w-full rounded-lg border px-2.5 py-2 pr-8 text-xs outline-none transition-colors"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-foreground/40 hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                  title={showKey ? 'Hide' : 'Show'}
                >
                  {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              {meta && !KEYLESS_PROVIDERS.has(provider) && (
                <a
                  href={meta.getApiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary/70 hover:text-primary mt-1 inline-flex items-center gap-1 text-[10px] transition-colors"
                >
                  <ExternalLink className="h-2.5 w-2.5" /> Get API key
                </a>
              )}
            </div>

            {/* Model — hanya muncul jika test sukses dan ada models */}
            {availableModels.length > 0 && (
              <div>
                <label className="text-foreground/50 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">
                  Model
                </label>
                {provider === 'openrouter' && (
                  <div className="mb-1.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground/40 text-[10px]">Hanya model gratis</span>
                      <button
                        onClick={toggleFreeOnly}
                        className={cn(
                          'relative h-4 w-7 shrink-0 rounded-full transition-colors',
                          freeOnly ? 'bg-primary' : 'bg-muted',
                        )}
                        title={
                          freeOnly ? 'Menampilkan semua model' : 'Menampilkan model gratis saja'
                        }
                      >
                        <span
                          className={cn(
                            'bg-background absolute left-0.5 top-0.5 h-3 w-3 rounded-full shadow-sm transition-transform',
                            freeOnly && 'translate-x-3',
                          )}
                        />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={modelQuery}
                      onChange={(e) => setModelQuery(e.target.value)}
                      placeholder="Cari model..."
                      className="border-border/20 bg-muted text-foreground placeholder:text-foreground/30 focus:border-primary/50 w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-colors"
                    />
                  </div>
                )}
                {displayModels.length > 0 ? (
                  <div className="relative">
                    <select
                      value={displayModels.includes(model) ? model : displayModels[0]}
                      onChange={(e) => setModel(e.target.value)}
                      className="border-border/20 bg-muted text-foreground focus:border-primary/50 w-full appearance-none rounded-lg border px-2.5 py-2 pr-7 text-xs outline-none transition-colors"
                    >
                      {displayModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="text-foreground/40 pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" />
                  </div>
                ) : (
                  <p className="text-foreground/30 text-[10px]">
                    Tidak ada model yang cocok dengan filter.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {provider !== 'native' && (
          <>
            {/* Test Connection Button */}
            <div>
              <button
                onClick={testConnection}
                disabled={testResult === 'testing'}
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                  testResult === 'success'
                    ? 'border-green-500/30 bg-green-500/5 text-green-600'
                    : testResult === 'error'
                      ? 'border-red-500/30 bg-red-500/5 text-red-600'
                      : 'border-border/20 bg-muted text-foreground hover:bg-muted/80',
                )}
              >
                {testResult === 'testing' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Testing...
                  </>
                ) : testResult === 'success' ? (
                  <>
                    <CheckCircle className="h-3 w-3" /> Connected
                  </>
                ) : testResult === 'error' ? (
                  <>
                    <X className="h-3 w-3" /> Failed — Click to retry
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3" /> Test Connection
                  </>
                )}
              </button>
            </div>

            {/* Advanced */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-foreground/40 hover:text-foreground inline-flex items-center gap-1 text-[10px] transition-colors"
              >
                <ChevronDown
                  className={cn('h-2.5 w-2.5 transition-transform', showAdvanced && 'rotate-180')}
                />
                Advanced
              </button>
              {showAdvanced && (
                <div className="mt-2">
                  <label className="text-foreground/50 mb-1 block text-[10px] font-medium">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="border-border/20 bg-muted text-foreground focus:border-primary/50 w-full rounded-lg border px-2.5 py-2 text-xs outline-none transition-colors"
                  />
                  <p className="text-foreground/30 mt-0.5 text-[10px]">
                    Default:{' '}
                    <code className="bg-muted rounded px-1 py-0.5">{meta?.defaultBaseUrl}</code>
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Web Search Toggle */}
        <div className="border-border/20 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="text-foreground/50 h-4 w-4" />
              <div>
                <p className="text-xs font-medium">Pencarian Web</p>
                <p className="text-foreground/40 mt-0.5 text-[10px]">
                  Cari informasi dari Wikipedia & DuckDuckGo
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !webSearchEnabled;
                setWebSearchEnabled(next);
                localStorage.setItem('ai-web-search', next ? 'true' : 'false');
              }}
              className={cn(
                'relative h-5 w-9 rounded-full transition-colors',
                webSearchEnabled ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'bg-background absolute left-0.5 top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform',
                  webSearchEnabled && 'translate-x-4',
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="border-border/20 border-t p-4">
        {invalidKey && (
          <p className="text-destructive mb-2 text-[10px] leading-snug">
            API key tidak valid — nilai tersebut berupa URL. Paste API key (mis. sk-or-v1-...) dari
            dashboard provider, bukan Base URL.
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={testResult === 'idle' && !hasKey && !KEYLESS_PROVIDERS.has(provider)}
          className={cn(
            'flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
            saved
              ? 'bg-green-500/15 text-green-600'
              : invalidKey
                ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40',
          )}
        >
          {saved ? (
            <>
              <CheckCircle className="h-3 w-3" /> Saved
            </>
          ) : invalidKey ? (
            'API Key Invalid'
          ) : (
            'Save Settings'
          )}
        </button>
      </div>

      <TestConnectionModal
        open={testModalOpen}
        steps={testSteps}
        result={testResult === 'idle' ? 'testing' : testResult}
        latency={testLatency}
        onClose={() => setTestModalOpen(false)}
      />

      <ModelDownloadModal open={modelDownloadOpen} onClose={() => setModelDownloadOpen(false)} />
    </div>
  );
}
