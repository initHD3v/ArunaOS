'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventBus } from '@/providers/service-provider';
import { useAIContextStore } from '@/stores/ai-context.store';
import { useLocationStore } from '@/stores/location.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { createWindowConfig } from '@/lib/window-utils';
import { MODULE_APP_ID_MAP } from '@/services/module-window';
import { LiquidOrb } from './components/liquid-orb';
import { collectSystemContext, ensureWeatherFresh, formatSystemContext } from './system-context';

interface AICommandBarProps {
  open: boolean;
  onClose: () => void;
}

interface ActiveProviderInfo {
  type: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const KEYLESS_PROVIDERS = new Set(['ollama', 'lmstudio', 'native', 'deepseek']);

function isUsableProvider(cfg: ActiveProviderInfo): boolean {
  if (cfg.apiKey) return true;
  // Keyless providers work without an apiKey as long as a baseUrl points at
  // the server (native runs fully client-side and needs neither).
  return KEYLESS_PROVIDERS.has(cfg.type) && (!!cfg.baseUrl || cfg.type === 'native');
}

/**
 * Resolve the currently active provider config, honoring the provider the
 * user explicitly selected in Settings / AI chat (localStorage key
 * `ai-active-provider`) so the command bar always follows the latest choice.
 */
function readActiveProvider(): ActiveProviderInfo | null {
  try {
    const raw = localStorage.getItem('ai-provider-configs');
    if (!raw) return null;
    const configs = JSON.parse(raw) as ActiveProviderInfo[];
    if (!Array.isArray(configs)) return null;

    const activeType = localStorage.getItem('ai-active-provider');
    let match = activeType ? configs.find((c) => c.type === activeType) : undefined;
    if (!match || !isUsableProvider(match)) {
      match = configs.find(isUsableProvider);
    }
    if (!match) return null;
    return {
      type: match.type,
      apiKey: match.apiKey,
      baseUrl: match.baseUrl ?? '',
      model: match.model ?? '',
    };
  } catch {
    return null;
  }
}

type BarMode = 'input' | 'loading' | 'result' | 'error';

/**
 * The answer bubble renders plain text — strip lightweight Markdown markers
 * (**bold**, *italic*, __underline__, `code`) that models emit by default.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');
}

export function AICommandBar({ open, onClose }: AICommandBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<BarMode>('input');
  const [result, setResult] = useState('');
  const [providerInfo, setProviderInfo] = useState<ActiveProviderInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<string>('command-bar');
  const eventBus = useEventBus();
  const quickAskPrompt = useAIContextStore((s) => s.quickAsk.prompt);

  const thinking = mode === 'loading';

  // Keep provider/model in sync with Settings & AI chat changes.
  useEffect(() => {
    const sync = () => setProviderInfo(readActiveProvider());
    sync();
    window.addEventListener('ai-provider-config-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('ai-provider-config-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // Re-read on every open so the badge is fresh even without a change event
  // (e.g. another tab updated localStorage).
  useEffect(() => {
    if (open) setProviderInfo(readActiveProvider());
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery(quickAskPrompt);
      setMode('input');
      setResult('');
      // Warm the weather snapshot so weather questions have live data.
      ensureWeatherFresh();
      // Fresh session per invocation so stale history (e.g. previous
      // command-style prompts) can't bias the model's interpretation.
      sessionRef.current = `command-bar-${Date.now()}`;
      return () => {
        abortRef.current?.abort();
      };
    }
  }, [open]);

  useEffect(() => {
    if (open && mode === 'input') {
      const id = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [open, mode]);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || thinking) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Inject live ArunaOS state so weather/system answers come from real
      // data (weather module, aStat-equivalent stats) instead of guesses.
      const ctx = collectSystemContext();
      const message =
        `${trimmed}\n\n` +
        '[Real-time ArunaOS system context — use this data instead of guessing ' +
        'for weather, location, and system status questions. To open an app, ' +
        'use the open_app tool. Formatting rules: plain text only — never use ' +
        'Markdown emphasis like ** or __ or #. For system status requests, list ' +
        'only system metrics (platform, CPU, RAM, memory, uptime, network, open ' +
        'apps) each on its own line starting with "- " — do NOT include weather ' +
        'or location — then end with one short resume sentence summarizing the ' +
        'overall state. Only mention weather/location when explicitly asked ' +
        'about them.]\n' +
        formatSystemContext(ctx);

      setMode('loading');
      setQuery('');

      const openAppWindow = (content: string) => {
        try {
          const result = JSON.parse(content) as {
            success?: boolean;
            data?: { appId?: string };
          };
          const fullAppId = result.data?.appId;
          if (result.success && fullAppId) {
            const shortId = MODULE_APP_ID_MAP[fullAppId] ?? fullAppId.replace(/^arunaos\./, '');
            const { width, height, x, y } = createWindowConfig(800, 560);
            useWindowStore.getState().openWindow({
              id: `window-${shortId}-${Date.now()}`,
              title: shortId.charAt(0).toUpperCase() + shortId.slice(1),
              icon: shortId,
              appId: shortId,
              position: { x, y },
              size: { width, height },
              zIndex: 1,
              state: 'active',
            });
          }
        } catch {
          // bukan payload open_app yang valid — abaikan
        }
      };

      try {
        // SSE stream (same endpoint as the AI chat module) so tool-result
        // chunks reach the client — open_app must open the window here.
        const params = new URLSearchParams({ message });
        if (sessionRef.current) params.set('sessionId', sessionRef.current);
        if (providerInfo) params.set('providerConfig', JSON.stringify(providerInfo));

        const webSearchEnabled = localStorage.getItem('ai-web-search') !== 'false';
        if (!webSearchEnabled) params.set('webSearch', 'false');

        const loc = useLocationStore.getState();
        if (loc.enabled && loc.latitude != null && loc.longitude != null) {
          params.set('lat', String(loc.latitude));
          params.set('lon', String(loc.longitude));
          if (loc.city) params.set('city', loc.city);
        }

        const res = await fetch(`/api/ai/chat?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';
        let streamError: string | null = null;
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data:')) continue;
            const payload = trimmedLine.slice(5).trim();
            if (payload === '[DONE]') {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(payload) as {
                type: string;
                content?: string;
                toolName?: string;
                status?: string;
                sessionId?: string;
              };
              if (parsed.type === 'session' && parsed.sessionId) {
                sessionRef.current = parsed.sessionId;
              }
              if (parsed.type === 'text' && parsed.content) {
                fullReply += parsed.content;
              }
              if (parsed.type === 'tool-result') {
                if (parsed.toolName === 'open_app' && parsed.content) {
                  openAppWindow(parsed.content);
                }
              }
              if (parsed.type === 'error' && parsed.content) {
                streamError = parsed.content;
              }
            } catch {
              // malformed chunk — abaikan
            }
          }
        }

        if (controller.signal.aborted) return;

        if (streamError && !fullReply) {
          setResult(streamError);
          setMode('error');
        } else if (fullReply) {
          setResult(fullReply);
          setMode('result');
          eventBus.emit('notification:send', {
            type: 'info',
            title: 'AI Command',
            message: `Executed: ${trimmed}`,
          });
        } else {
          setResult('No response from AI provider');
          setMode('error');
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const errMsg = err instanceof Error ? err.message : 'Command failed';
        setResult(errMsg);
        setMode('error');
      }
    },
    [query, thinking, eventBus, providerInfo],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleSubmit, onClose],
  );

  const inputPill = (placeholder: string) => (
    <motion.form
      key="input-pill"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        'flex w-[420px] max-w-[85vw] items-center gap-3 rounded-full border px-5 py-3.5',
        'border-white/15 bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl',
        'focus-within:border-white/30 focus-within:bg-white/[0.09]',
        'transition-colors duration-300',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full bg-transparent text-sm outline-none',
          'text-white/90 placeholder:text-white/35',
        )}
      />
      <motion.button
        type="submit"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        disabled={!query.trim()}
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
          query.trim() ? 'bg-white text-black' : 'bg-white/10 text-white/30',
        )}
      >
        <ArrowUp size={14} strokeWidth={2.5} />
      </motion.button>
      <kbd
        className={cn(
          'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]',
          'border-white/15 text-white/30',
        )}
      >
        Esc
      </kbd>
    </motion.form>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="flex flex-col items-center gap-7"
            onClick={(e) => e.stopPropagation()}
          >
            <LiquidOrb size={128} style="siriMono" thinking={thinking} />

            {/* Status / answer area below the orb */}
            <div className="flex flex-col items-center gap-5">
              <AnimatePresence mode="popLayout">
                {mode === 'input' && (
                  <div key="input-wrap" className="flex flex-col items-center gap-4">
                    {inputPill("Ask AI anything… e.g. 'open settings'")}
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-[11px] tracking-wide text-white/30"
                    >
                      {providerInfo
                        ? `${providerInfo.type}${providerInfo.model ? ` · ${providerInfo.model}` : ''}`
                        : 'fallback lokal'}
                    </motion.span>
                  </div>
                )}

                {mode === 'loading' && (
                  <motion.p
                    key="thinking"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    transition={{ duration: 0.35 }}
                    className="text-[11px] font-light uppercase tracking-[0.35em]"
                  >
                    <motion.span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          'linear-gradient(110deg, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.2) 70%)',
                        backgroundSize: '220% 100%',
                      }}
                      animate={{ backgroundPosition: ['0% 0%', '220% 0%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                    >
                      Thinking
                    </motion.span>
                  </motion.p>
                )}

                {(mode === 'result' || mode === 'error') && (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className={cn(
                      'max-w-lg rounded-2xl border px-5 py-4 backdrop-blur-xl',
                      mode === 'result'
                        ? 'border-white/12 bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
                        : 'border-red-400/25 bg-red-500/[0.08]',
                    )}
                  >
                    <p
                      className={cn(
                        'whitespace-pre-wrap text-sm leading-relaxed',
                        mode === 'result' ? 'text-white/85' : 'text-red-300/90',
                      )}
                    >
                      {stripMarkdown(result)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Follow-up input reappears below the answer */}
              <AnimatePresence>
                {(mode === 'result' || mode === 'error') && inputPill('Ask a follow-up…')}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
