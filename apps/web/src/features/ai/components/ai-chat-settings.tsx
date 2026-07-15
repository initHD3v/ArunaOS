'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
  ChevronDown,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface ProviderMeta {
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  getApiKeyUrl: string;
}

const PROVIDER_META: Record<string, ProviderMeta> = {
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
};

const PROVIDER_ORDER: (keyof typeof PROVIDER_META)[] = [
  'openai',
  'anthropic',
  'openrouter',
  'ollama',
];

function loadSingleConfig(): { provider: string; apiKey: string; baseUrl: string; model: string } {
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
        const configured = parsed.find((c) => c.apiKey) ?? parsed[0];
        if (configured) {
          const m = PROVIDER_META[configured.type];
          return {
            provider: configured.type,
            apiKey: configured.apiKey ?? '',
            baseUrl: configured.baseUrl ?? m?.defaultBaseUrl ?? '',
            model: configured.model ?? m?.defaultModel ?? '',
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
    if (type === data.provider) {
      return { type, apiKey: data.apiKey, baseUrl: data.baseUrl, model: data.model };
    }
    return { type, apiKey: '', baseUrl: m.defaultBaseUrl, model: m.defaultModel };
  });
  localStorage.setItem('ai-provider-configs', JSON.stringify(configs));
  window.dispatchEvent(new Event('ai-provider-config-changed'));
}

interface AIChatSettingsProps {
  open: boolean;
  onClose: () => void;
}

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  statusCode?: number;
  statusText?: string;
  latency?: string;
  body?: string;
  error?: string;
}

const PROVIDER_HELP: Record<string, string> = {
  openai: 'Paste your OpenAI API key to enable AI chat. You can get one from the OpenAI dashboard.',
  anthropic:
    'Enter your Anthropic API key to use Claude models. Get your key from the Anthropic console.',
  openrouter:
    'Use OpenRouter to access many models through a single API. Get your key from OpenRouter.',
  ollama: 'Run models locally with Ollama. No API key needed — just make sure Ollama is running.',
};

function getTestEndpoint(
  provider: string,
  baseUrl: string,
): { url: string; headers: Record<string, string> } {
  const url = baseUrl.replace(/\/$/, '');
  switch (provider) {
    case 'openai':
      return { url: `${url}/models`, headers: { Authorization: `Bearer ${'{{API_KEY}}'}` } };
    case 'anthropic':
      return {
        url: `${url}/models`,
        headers: { 'x-api-key': '{{API_KEY}}', 'anthropic-version': '2023-06-01' },
      };
    case 'openrouter':
      return { url: `${url}/models`, headers: { Authorization: `Bearer ${'{{API_KEY}}'}` } };
    case 'ollama':
      return { url: `${url}/api/tags`, headers: {} };
    default:
      return { url: `${url}/models`, headers: { Authorization: `Bearer ${'{{API_KEY}}'}` } };
  }
}

export function AIChatSettings({ open, onClose }: AIChatSettingsProps) {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle' });

  useEffect(() => {
    if (open) {
      const cfg = loadSingleConfig();
      setProvider(cfg.provider);
      setApiKey(cfg.apiKey);
      setBaseUrl(cfg.baseUrl);
      setModel(cfg.model);
      setSaved(false);
      setShowAdvanced(false);
      setTestResult({ status: 'idle' });
      setShowKey(cfg.provider === 'ollama');
    }
  }, [open]);

  const meta = PROVIDER_META[provider];
  const hasKey = apiKey.length > 0;

  const handleSave = () => {
    saveSingleConfig({ provider, apiKey, baseUrl, model });
    setSaved(true);
    setTimeout(() => onClose(), 1000);
  };

  const testConnection = useCallback(async () => {
    setTestResult({ status: 'testing' });

    const ep = getTestEndpoint(provider, baseUrl);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(ep.headers)) {
      headers[k] = v.replace('{{API_KEY}}', apiKey);
    }

    const start = performance.now();
    try {
      const res = await fetch(ep.url, { headers });
      const latency = ((performance.now() - start) / 1000).toFixed(2);
      let body = '';
      try {
        const json = await res.json();
        body = JSON.stringify(json, null, 2).slice(0, 500);
      } catch {
        body = await res.text().catch(() => '(unable to read body)');
      }

      if (res.ok) {
        setTestResult({
          status: 'success',
          statusCode: res.status,
          statusText: res.statusText,
          latency: `${latency}s`,
          body,
        });
      } else {
        setTestResult({
          status: 'error',
          statusCode: res.status,
          statusText: res.statusText,
          latency: `${latency}s`,
          body,
          error: `${res.status} ${res.statusText}`,
        });
      }
    } catch (err: unknown) {
      const latency = ((performance.now() - start) / 1000).toFixed(2);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({
        status: 'error',
        latency: `${latency}s`,
        error: msg,
        body: msg,
      });
    }
  }, [provider, baseUrl, apiKey]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2">
        <div className="border-border/20 bg-card max-h-[80vh] overflow-y-auto rounded-xl border shadow-2xl">
          {/* Header */}
          <div className="border-border/20 flex items-center justify-between border-b px-5 py-3.5">
            <div>
              <h3 className="text-sm font-medium">AI Settings</h3>
              <p className="text-foreground/40 mt-0.5 text-xs">
                {hasKey ? `${meta?.label ?? provider} configured` : 'Choose your AI provider'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-foreground/50 hover:text-foreground ml-2 rounded-md p-1.5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4 p-5">
            {/* Provider */}
            <div>
              <label className="text-foreground/50 mb-1.5 block text-[11px] font-semibold uppercase tracking-wider">
                AI Provider
              </label>
              <div className="relative">
                <button
                  onClick={() => setProviderOpen(!providerOpen)}
                  className="border-border/20 bg-muted text-foreground focus:border-primary/50 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm outline-none transition-colors"
                >
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      hasKey ? 'bg-green-500' : 'bg-foreground/20',
                    )}
                  />
                  <span className="flex-1 font-medium">{meta?.label ?? provider}</span>
                  <ChevronDown
                    className={cn(
                      'text-foreground/40 h-4 w-4 transition-transform',
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
                              setShowKey(type === 'ollama');
                              setTestResult({ status: 'idle' });
                            }}
                            className={cn(
                              'hover:bg-muted flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                              type === provider ? 'bg-muted' : '',
                            )}
                          >
                            <span className="bg-foreground/20 h-2 w-2 shrink-0 rounded-full" />
                            <span className="flex-1 font-medium">{m?.label ?? type}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <p className="text-foreground/40 mt-1.5 text-xs leading-relaxed">
                {PROVIDER_HELP[provider]}
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="text-foreground/50 mb-1.5 block text-[11px] font-semibold uppercase tracking-wider">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  name="ai-api-key"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    provider === 'ollama'
                      ? 'Leave empty if not required'
                      : 'Paste your API key here...'
                  }
                  className="border-border/20 bg-muted text-foreground placeholder:text-foreground/30 focus:border-primary/50 w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition-colors"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-foreground/40 hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  title={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {meta && provider !== 'ollama' && (
                <a
                  href={meta.getApiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary/70 hover:text-primary mt-1.5 inline-flex items-center gap-1 text-[11px] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> Get your {meta.label} API key
                </a>
              )}
            </div>

            {/* Model */}
            <div>
              <label className="text-foreground/50 mb-1.5 block text-[11px] font-semibold uppercase tracking-wider">
                Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={meta ? `e.g. ${meta.defaultModel}` : 'Enter model name...'}
                className="border-border/20 bg-muted text-foreground placeholder:text-foreground/30 focus:border-primary/50 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              />
              <p className="text-foreground/30 mt-1 text-[11px]">
                The AI model used for chat responses.
              </p>
            </div>

            {/* Test Connection */}
            <div>
              <button
                onClick={testConnection}
                disabled={testResult.status === 'testing'}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                  testResult.status === 'success'
                    ? 'border-green-500/30 bg-green-500/5 text-green-600'
                    : testResult.status === 'error'
                      ? 'border-red-500/30 bg-red-500/5 text-red-600'
                      : 'border-border/20 bg-muted text-foreground hover:bg-muted/80',
                )}
              >
                {testResult.status === 'testing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Testing...
                  </>
                ) : testResult.status === 'success' ? (
                  <>
                    <Wifi className="h-4 w-4" /> Connected ({testResult.latency})
                  </>
                ) : testResult.status === 'error' ? (
                  <>
                    <WifiOff className="h-4 w-4" /> Connection Failed
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4" /> Test Connection
                  </>
                )}
              </button>

              {/* Detailed result */}
              {testResult.status !== 'idle' && testResult.status !== 'testing' && (
                <div
                  className={cn(
                    'mt-2 rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed',
                    testResult.status === 'success'
                      ? 'border-green-500/20 bg-green-500/5 text-green-700'
                      : 'border-red-500/20 bg-red-500/5 text-red-700',
                  )}
                >
                  {testResult.statusCode && (
                    <div className="flex gap-2">
                      <span className="text-foreground/40 shrink-0">Status:</span>
                      <span>
                        {testResult.statusCode} {testResult.statusText}
                      </span>
                    </div>
                  )}
                  {testResult.latency && (
                    <div className="flex gap-2">
                      <span className="text-foreground/40 shrink-0">Latency:</span>
                      <span>{testResult.latency}</span>
                    </div>
                  )}
                  {testResult.error && (
                    <div className="flex gap-2">
                      <span className="text-foreground/40 shrink-0">Error:</span>
                      <span className="break-all">{testResult.error}</span>
                    </div>
                  )}
                  {testResult.body && testResult.body.length > 0 && (
                    <details className="mt-1">
                      <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer">
                        Response body
                      </summary>
                      <pre className="text-foreground/60 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-all rounded bg-black/10 p-2 text-[10px]">
                        {testResult.body}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Advanced */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-foreground/40 hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
              >
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', showAdvanced && 'rotate-180')}
                />
                Advanced settings
              </button>
              {showAdvanced && (
                <div className="mt-3">
                  <label className="text-foreground/50 mb-1 block text-[11px] font-medium">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="border-border/20 bg-muted text-foreground focus:border-primary/50 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  />
                  <p className="text-foreground/30 mt-1 text-[11px]">
                    Default:{' '}
                    <code className="bg-muted rounded px-1 py-0.5">{meta?.defaultBaseUrl}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className={cn(
                'mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                saved
                  ? 'bg-green-500/15 text-green-600'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {saved ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
