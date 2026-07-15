'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessages } from './components/chat-messages';
import { ChatInput } from './components/chat-input';
import { AIChatSettingsPanel } from './components/ai-chat-settings-panel';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Trash2,
  Download,
  Settings2,
  MessageSquare,
  Sparkles,
  WifiOff,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'error';
  content: string;
  id: string;
}

interface ChatSessionData {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_KEY = 'ai-chat-sessions';
const ACTIVE_KEY = 'ai-chat-active-session';
const PROVIDER_CONFIG_KEY = 'ai-provider-configs';

function loadSessions(): ChatSessionData[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatSessionData[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveSessions(sessions: ChatSessionData[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function loadActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function saveActiveSessionId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getProviderConfig(
  provider: string,
): { type: string; apiKey: string; baseUrl: string; model: string } | null {
  try {
    const raw = localStorage.getItem(PROVIDER_CONFIG_KEY);
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

function getAnyConfiguredProvider(): string | null {
  try {
    const raw = localStorage.getItem(PROVIDER_CONFIG_KEY);
    if (!raw) return null;
    const configs = JSON.parse(raw) as Array<{ type: string; apiKey?: string }>;
    const first = configs.find((c) => c.apiKey && c.apiKey.length > 0);
    return first?.type ?? null;
  } catch {
    return null;
  }
}

export function AIChat() {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialized = useRef(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  // Load sessions on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loaded = loadSessions();
    setSessions(loaded);

    const activeId = loadActiveSessionId();
    const exists = loaded.some((s) => s.id === activeId);
    if (exists) {
      setActiveSessionId(activeId);
    } else if (loaded.length > 0) {
      setActiveSessionId(loaded[0]!.id);
    }
  }, []);

  // Listen for provider config changes from settings
  useEffect(() => {
    const handler = () => {
      const configured = getAnyConfiguredProvider();
      setProvider(configured);
    };
    window.addEventListener('ai-provider-config-changed', handler);
    return () => window.removeEventListener('ai-provider-config-changed', handler);
  }, []);

  // Persist sessions on changes
  useEffect(() => {
    if (initialized.current) {
      saveSessions(sessions);
    }
  }, [sessions]);

  // Persist active session ID
  useEffect(() => {
    if (initialized.current) {
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  const updateSession = useCallback(
    (sessionId: string, updater: (s: ChatSessionData) => ChatSessionData) => {
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updater(s) : s)));
    },
    [],
  );

  const createNewSession = useCallback(() => {
    const id = generateId();
    const now = Date.now();
    const newSession: ChatSessionData = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(id);
    sessionIdRef.current = null;
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    sessionIdRef.current = null;
  }, []);

  const deleteSession = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        if (activeSessionId === id) {
          const next = remaining[0]?.id ?? null;
          setActiveSessionId(next);
          sessionIdRef.current = null;
        }
        return remaining;
      });
    },
    [activeSessionId],
  );

  const clearChat = useCallback(() => {
    if (!activeSessionId) return;
    updateSession(activeSessionId, (s) => ({
      ...s,
      messages: [],
      updatedAt: Date.now(),
      title: 'New Chat',
    }));
    sessionIdRef.current = null;
  }, [activeSessionId, updateSession]);

  const exportChat = useCallback(() => {
    if (!activeSession || activeSession.messages.length === 0) return;
    const blob = new Blob([JSON.stringify(activeSession.messages, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${activeSession.id.slice(0, 12)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSession]);

  const ensureTitle = useCallback(
    (sessionId: string, firstMessage: string) => {
      updateSession(sessionId, (s) => {
        if (s.title === 'New Chat') {
          return {
            ...s,
            title: firstMessage.length > 40 ? firstMessage.slice(0, 40) + '...' : firstMessage,
            updatedAt: Date.now(),
          };
        }
        return { ...s, updatedAt: Date.now() };
      });
    },
    [updateSession],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeSessionId) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content,
        id: `user-${Date.now()}`,
      };

      updateSession(activeSessionId, (s) => ({
        ...s,
        messages: [...s.messages, userMsg],
        updatedAt: Date.now(),
      }));
      ensureTitle(activeSessionId, content);
      setIsLoading(true);

      const providerCfg = provider ? getProviderConfig(provider) : null;

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const params = new URLSearchParams({ message: content });
        if (sessionIdRef.current) params.set('sessionId', sessionIdRef.current);
        if (provider) params.set('provider', provider);
        if (providerCfg) params.set('providerConfig', JSON.stringify(providerCfg));

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
                const errMsg: ChatMessage = {
                  role: 'error',
                  content: parsed.content,
                  id: `error-${Date.now()}`,
                };
                updateSession(activeSessionId, (s) => ({
                  ...s,
                  messages: [...s.messages, errMsg],
                  updatedAt: Date.now(),
                }));
                continue;
              }

              if (parsed.type === 'text' && parsed.content) {
                fullReply += parsed.content;
                updateSession(activeSessionId, (s) => {
                  const msgs = [...s.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.id.startsWith('stream-')) {
                    msgs[msgs.length - 1] = { ...last, content: fullReply };
                  } else {
                    msgs.push({ role: 'assistant', content: fullReply, id: 'stream-pending' });
                  }
                  return { ...s, messages: msgs, updatedAt: Date.now() };
                });
              }

              if (parsed.type === 'tool-result') {
                const toolMsg: ChatMessage = {
                  role: 'tool',
                  content: parsed.content,
                  id: `tool-${Date.now()}`,
                };
                updateSession(activeSessionId, (s) => ({
                  ...s,
                  messages: [...s.messages, toolMsg],
                  updatedAt: Date.now(),
                }));
              }
            } catch {
              // skip malformed
            }
          }
        }

        updateSession(activeSessionId, (s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.id === 'stream-pending') {
            msgs[msgs.length - 1] = {
              role: 'assistant',
              content: fullReply,
              id: `assistant-${Date.now()}`,
            };
          }
          return { ...s, messages: msgs, updatedAt: Date.now() };
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;

        try {
          const body: Record<string, unknown> = { message: content };
          if (sessionIdRef.current) body.sessionId = sessionIdRef.current;
          if (provider) body.provider = provider;
          if (providerCfg) body.providerConfig = providerCfg;

          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error ?? `HTTP ${res.status}`);
          }

          const data = await res.json();
          if (data.sessionId) sessionIdRef.current = data.sessionId;

          const replyMsg: ChatMessage = {
            role: 'assistant',
            content: data.reply,
            id: `assistant-${Date.now()}`,
          };
          updateSession(activeSessionId, (s) => ({
            ...s,
            messages: [...s.messages, replyMsg],
            updatedAt: Date.now(),
          }));
        } catch (fallbackErr: unknown) {
          const errorMessage =
            fallbackErr instanceof Error ? fallbackErr.message : 'Failed to get AI response';
          const errMsg: ChatMessage = {
            role: 'error',
            content: errorMessage,
            id: `error-${Date.now()}`,
          };
          updateSession(activeSessionId, (s) => ({
            ...s,
            messages: [...s.messages, errMsg],
            updatedAt: Date.now(),
          }));
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [activeSessionId, provider, updateSession, ensureTitle],
  );

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Toolbar */}
      <div
        className={cn('flex items-center justify-between border-b px-3 py-2', 'border-border/20')}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-foreground/50 hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={createNewSession}
            className="text-foreground/50 hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>

          <div className="bg-border/20 mx-1.5 h-5 w-px" />

          <button
            onClick={clearChat}
            disabled={!activeSession || messages.length === 0}
            className="text-foreground/50 hover:text-foreground hover:bg-muted disabled:text-foreground/20 rounded-md p-1.5 transition-colors disabled:cursor-not-allowed"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            onClick={exportChat}
            disabled={!activeSession || messages.length === 0}
            className="text-foreground/50 hover:text-foreground hover:bg-muted disabled:text-foreground/20 rounded-md p-1.5 transition-colors disabled:cursor-not-allowed"
            title="Export chat"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {provider ? (
            (() => {
              const cfg = getProviderConfig(provider);
              const model = cfg?.model ? ` · ${cfg.model}` : '';
              return (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium',
                    cfg ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      cfg ? 'bg-green-500' : 'bg-amber-500',
                    )}
                  />
                  {provider}
                  {model}
                </span>
              );
            })()
          ) : (
            <span className="text-foreground/40 inline-flex items-center gap-1.5 rounded bg-zinc-500/5 px-1.5 py-0.5 text-[10px] font-medium">
              <span className="bg-foreground/30 h-1.5 w-1.5 rounded-full" />
              offline fallback
            </span>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-foreground/50 hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
            title="AI Settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* No-provider banner */}
      {!provider && (
        <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
          <div className="flex items-start gap-2.5">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-700">No AI provider configured</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-600/70">
                Chat is using offline fallback responses. Add an API key in{' '}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="text-amber-600 underline underline-offset-2 hover:text-amber-700"
                >
                  Settings
                </button>{' '}
                for full AI capabilities.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — History */}
        {sidebarOpen && (
          <div className="border-border/20 flex w-56 shrink-0 flex-col border-r">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-foreground/50 text-[11px] font-medium uppercase tracking-wider">
                History
              </span>
              <span className="text-foreground/30 text-[10px]">{sessions.length}</span>
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 && (
                <div className="px-2 py-8 text-center">
                  <MessageSquare className="text-foreground/20 mx-auto mb-2 h-5 w-5" />
                  <p className="text-foreground/30 text-xs">No chat history</p>
                  <p className="text-foreground/20 mt-1 text-[10px]">Start a new conversation</p>
                </div>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchSession(s.id)}
                  className={cn(
                    'hover:bg-muted group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors',
                    s.id === activeSessionId ? 'bg-muted text-foreground' : 'text-foreground/60',
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{s.title}</span>
                  <span
                    onClick={(e) => deleteSession(e, s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        deleteSession(e as unknown as React.MouseEvent, s.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="text-foreground/20 hover:text-danger shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                    title="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeSession ? (
            <>
              <ChatMessages messages={messages} isLoading={isLoading} />
              <ChatInput onSend={sendMessage} disabled={isLoading} />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4">
                  <div className="bg-muted mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                    {provider ? (
                      <Sparkles className="text-foreground/40 h-6 w-6" />
                    ) : (
                      <MessageSquare className="text-foreground/40 h-6 w-6" />
                    )}
                  </div>
                </div>
                <h3 className="text-foreground mb-1 text-base font-medium">AI Assistant</h3>
                <p className="text-foreground/40 mb-1 text-xs leading-relaxed">
                  Ask questions, run commands, generate modules
                </p>
                {!provider && (
                  <p className="text-foreground/30 mb-6 text-[11px]">
                    Currently using offline mode — configure a provider for AI-powered responses
                  </p>
                )}
                {provider && (
                  <p className="text-foreground/30 mb-6 text-[11px]">
                    Using <span className="text-foreground/50 font-medium">{provider}</span> — start
                    a chat to begin
                  </p>
                )}
                <button
                  onClick={createNewSession}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition-colors"
                >
                  <Plus className="h-4 w-4" /> New Chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar — Settings */}
        {settingsOpen && <AIChatSettingsPanel onClose={() => setSettingsOpen(false)} />}
      </div>
    </div>
  );
}
