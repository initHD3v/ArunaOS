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
  X,
  Wifi,
} from 'lucide-react';
import { TestConnectionModal, type TestStep } from './test-connection-modal';

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
};

const PROVIDER_ORDER: (keyof typeof PROVIDER_META)[] = [
  'openai',
  'anthropic',
  'openrouter',
  'ollama',
  'lmstudio',
];

const PROVIDER_HELP: Record<string, string> = {
  openai: 'Paste your OpenAI API key. Get one from the OpenAI dashboard.',
  anthropic: 'Enter your Anthropic API key to use Claude models.',
  openrouter: 'Use OpenRouter to access many models through a single API.',
  ollama: 'Run models locally with Ollama. No API key needed.',
  lmstudio: 'Run local models via LM Studio. No API key needed.',
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
        const cfg = parsed.find((c) => c.apiKey) ?? parsed[0];
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
  const configs = PROVIDER_ORDER.map((type) => {
    const m = PROVIDER_META[type]!;
    return type === data.provider
      ? { type, apiKey: data.apiKey, baseUrl: data.baseUrl, model: data.model }
      : { type, apiKey: '', baseUrl: m.defaultBaseUrl, model: m.defaultModel };
  });
  localStorage.setItem('ai-provider-configs', JSON.stringify(configs));
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testLatency, setTestLatency] = useState('');

  useEffect(() => {
    const cfg = loadSingleConfig();
    setProvider(cfg.provider);
    setApiKey(cfg.apiKey);
    setBaseUrl(cfg.baseUrl);
    setModel(cfg.model);
    setShowKey(cfg.provider === 'ollama' || cfg.provider === 'lmstudio');
  }, []);

  const meta = PROVIDER_META[provider];
  const hasKey = apiKey.length > 0;

  const handleSave = () => {
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
          if (!model || !data.models.includes(model)) {
            setModel(data.models[0]);
          }
          updateStep(4, {
            status: 'done',
            detail: `Found ${data.models.length} model${data.models.length > 1 ? 's' : ''}: ${data.models.slice(0, 5).join(', ')}${data.models.length > 5 ? '...' : ''}`,
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
                <div className="fixed inset-0 z-10" onClick={() => setProviderOpen(false)} />
                <div className="border-border/20 bg-card absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border shadow-lg">
                  {PROVIDER_ORDER.map((type) => {
                    const m = PROVIDER_META[type];
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setProvider(type);
                          setProviderOpen(false);
                          setBaseUrl(m?.defaultBaseUrl ?? '');
                          setModel(m?.defaultModel ?? '');
                          setShowKey(type === 'ollama' || type === 'lmstudio');
                          setAvailableModels([]);
                          setTestResult('idle');
                        }}
                        className={cn(
                          'hover:bg-muted flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs transition-colors',
                          type === provider ? 'bg-muted' : '',
                        )}
                      >
                        <span className="bg-foreground/20 h-1.5 w-1.5 shrink-0 rounded-full" />
                        <span className="flex-1 font-medium">{m?.label ?? type}</span>
                      </button>
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

        {/* API Key */}
        <div>
          <label className="text-foreground/50 mb-1.5 block text-[10px] font-semibold uppercase tracking-wider">
            API Key
          </label>
          <div className="relative">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                provider === 'ollama' || provider === 'lmstudio'
                  ? 'Leave empty if not required'
                  : 'Paste your API key...'
              }
              style={!showKey ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
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
          {meta && provider !== 'ollama' && provider !== 'lmstudio' && (
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
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border-border/20 bg-muted text-foreground focus:border-primary/50 w-full appearance-none rounded-lg border px-2.5 py-2 pr-7 text-xs outline-none transition-colors"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="text-foreground/40 pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2" />
            </div>
          </div>
        )}

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
      </div>

      {/* Save */}
      <div className="border-border/20 border-t p-4">
        <button
          onClick={handleSave}
          disabled={
            testResult === 'idle' && !hasKey && provider !== 'ollama' && provider !== 'lmstudio'
          }
          className={cn(
            'flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
            saved
              ? 'bg-green-500/15 text-green-600'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40',
          )}
        >
          {saved ? (
            <>
              <CheckCircle className="h-3 w-3" /> Saved
            </>
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
    </div>
  );
}
