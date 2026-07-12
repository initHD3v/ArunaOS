'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessages } from './components/chat-messages';
import { ChatInput } from './components/chat-input';
import { ModelSelector } from './components/model-selector';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'error';
  content: string;
  id: string;
}

const CHAT_STORAGE_KEY = 'ai-chat-messages';

function getProviderConfig(
  provider: string,
): { type: string; apiKey: string; baseUrl: string; model: string } | null {
  try {
    const raw = localStorage.getItem('ai-provider-configs');
    if (!raw) return null;
    const configs = JSON.parse(raw) as Array<{
      type: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    }>;
    const match = configs.find((c) => c.type === provider);
    if (!match || !match.apiKey) return null;
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

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState('openai');
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore messages from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        role: 'user',
        content,
        id: `user-${Date.now()}`,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const providerCfg = getProviderConfig(provider);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const params = new URLSearchParams({
          message: content,
          ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
          provider,
          ...(providerCfg ? { providerConfig: JSON.stringify(providerCfg) } : {}),
        });

        const response = await fetch(`/api/ai/chat?${params}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No stream reader');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullReply = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);

            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'session' && parsed.sessionId) {
                sessionIdRef.current = parsed.sessionId;
                continue;
              }

              if (parsed.type === 'error') {
                setMessages((prev) => [
                  ...prev,
                  { role: 'error', content: parsed.content, id: `error-${Date.now()}` },
                ]);
                continue;
              }

              if (parsed.type === 'text' && parsed.content) {
                fullReply += parsed.content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.id.startsWith('stream-')) {
                    return [...prev.slice(0, -1), { ...last, content: fullReply }];
                  }
                  return [...prev, { role: 'assistant', content: fullReply, id: 'stream-pending' }];
                });
              }

              if (parsed.type === 'tool-result') {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'tool',
                    content: parsed.content,
                    id: `tool-${Date.now()}`,
                  },
                ]);
              }
            } catch {
              // skip malformed
            }
          }
        }

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === 'stream-pending') {
            return [
              ...prev.slice(0, -1),
              { role: 'assistant', content: fullReply, id: `assistant-${Date.now()}` },
            ];
          }
          return prev;
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;

        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              sessionId: sessionIdRef.current,
              provider,
              ...(providerCfg ? { providerConfig: providerCfg } : {}),
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error ?? `HTTP ${res.status}`);
          }

          const data = await res.json();
          if (data.sessionId) sessionIdRef.current = data.sessionId;

          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.reply, id: `assistant-${Date.now()}` },
          ]);
        } catch (fallbackErr: unknown) {
          const errorMessage =
            fallbackErr instanceof Error ? fallbackErr.message : 'Failed to get AI response';
          setMessages((prev) => [
            ...prev,
            { role: 'error', content: errorMessage, id: `error-${Date.now()}` },
          ]);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [provider],
  );

  return (
    <div className="bg-background flex h-full flex-col">
      <div
        className={cn('flex items-center justify-between border-b px-4 py-2', 'border-border/20')}
      >
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-medium">AI Assistant</span>
          <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-[10px]">
            {provider}
          </span>
        </div>
        <ModelSelector onSelect={setProvider} currentProvider={provider} />
      </div>
      <ChatMessages messages={messages} isLoading={isLoading} />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
