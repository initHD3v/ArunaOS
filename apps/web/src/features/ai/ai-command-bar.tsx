'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventBus } from '@/providers/service-provider';
import { useAIContextStore } from '@/stores/ai-context.store';

interface AICommandBarProps {
  open: boolean;
  onClose: () => void;
}

export function AICommandBar({ open, onClose }: AICommandBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'input' | 'loading' | 'result' | 'error'>('input');
  const [result, setResult] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const eventBus = useEventBus();
  const quickAskPrompt = useAIContextStore((s) => s.quickAsk.prompt);

  useEffect(() => {
    if (open) {
      if (quickAskPrompt) setQuery(quickAskPrompt);
      setMode('input');
      setResult('');
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        clearTimeout(id);
        abortRef.current?.abort();
      };
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setMode('loading');

      try {
        const providerCfg = (() => {
          try {
            const raw = localStorage.getItem('ai-provider-configs');
            if (!raw) return null;
            const configs = JSON.parse(raw) as Array<{
              type: string;
              apiKey?: string;
              baseUrl?: string;
              model?: string;
            }>;
            const match = configs.find((c) => c.apiKey);
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
        })();

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message:
              `Execute the following command: "${trimmed}". ` +
              'Respond with a brief confirmation of what you did. ' +
              'If you need to open an app, specify the app ID.',
            sessionId: 'command-bar',
            ...(providerCfg ? { providerConfig: providerCfg } : {}),
          }),
        });

        if (controller.signal.aborted) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (controller.signal.aborted) return;
        setResult(data.reply);
        setMode('result');

        if (data.reply) {
          eventBus.emit('notification:send', {
            type: 'info',
            title: 'AI Command',
            message: `Executed: ${trimmed}`,
          });
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const errMsg = err instanceof Error ? err.message : 'Command failed';
        setResult(errMsg);
        setMode('error');
      }
    },
    [query, eventBus],
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="bg-background/80 fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl',
              'border-border/20 bg-card',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="border-border/20 flex items-center gap-2 border-b px-4 py-3">
                <Sparkles size={16} className="text-primary shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What do you want to do? (e.g., 'open settings', 'search for files')"
                  disabled={mode === 'loading'}
                  className={cn(
                    'w-full bg-transparent text-sm outline-none',
                    'text-foreground/80 placeholder:text-foreground/20',
                    'disabled:opacity-50',
                  )}
                />
                {mode === 'loading' && (
                  <div className="flex items-center gap-1">
                    <div className="bg-primary h-1.5 w-1.5 animate-bounce rounded-full" />
                    <div className="bg-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0.1s]" />
                    <div className="bg-primary h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0.2s]" />
                  </div>
                )}
                <kbd
                  className={cn(
                    'ml-auto shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]',
                    'border-border/20 text-foreground/30',
                  )}
                >
                  Esc
                </kbd>
              </div>
            </form>

            {mode === 'result' && (
              <div className="border-border/10 bg-primary/5 border-b px-4 py-3">
                <p className="text-primary text-xs leading-relaxed">{result}</p>
              </div>
            )}

            {mode === 'error' && (
              <div className="border-border/10 bg-danger/5 border-b px-4 py-3">
                <p className="text-danger text-xs leading-relaxed">{result}</p>
              </div>
            )}

            {mode === 'input' && (
              <div className="px-4 py-2">
                <p className="text-foreground/20 text-[10px]">
                  Try: &ldquo;open calculator&rdquo; &mdash; &ldquo;search for images&rdquo; &mdash;
                  &ldquo;create a note-taking app&rdquo;
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
