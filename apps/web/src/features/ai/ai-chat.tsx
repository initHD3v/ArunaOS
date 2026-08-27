'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChatMessages } from './components/chat-messages';
import { ChatInput } from './components/chat-input';
import { AIChatSettingsPanel } from './components/ai-chat-settings-panel';
import { ModelDownloadProgress } from './components/model-download-progress';
import { useLocationStore } from '@/stores/location.store';
import { useAIHealth } from './use-ai-health';
import { StreamSanitizer, sanitizeAIText } from './sanitize-stream';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { createWindowConfig } from '@/lib/window-utils';
import { MODULE_APP_ID_MAP } from '@/services/module-window';
import { useGeneratedModulesStore } from '@/stores/generated-modules.store';
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
  ClipboardCopy,
  Check,
  FolderSearch,
  Blocks,
  CloudSun,
  HelpCircle,
} from 'lucide-react';

const SUGGESTED_PROMPTS: Array<{ icon: typeof FolderSearch; title: string; prompt: string }> = [
  {
    icon: FolderSearch,
    title: 'Jelajahi file',
    prompt: 'Tunjukkan isi folder Documents dan jelaskan isinya',
  },
  {
    icon: Blocks,
    title: 'Buat modul',
    prompt: 'Buatkan modul timer sederhana untuk ArunaOS',
  },
  {
    icon: CloudSun,
    title: 'Cuaca hari ini',
    prompt: 'Bagaimana cuaca hari ini di lokasi saya?',
  },
  {
    icon: HelpCircle,
    title: 'Kemampuan AI',
    prompt: 'Apa saja yang bisa kamu lakukan di ArunaOS?',
  },
];

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'error' | 'status';
  content: string;
  id: string;
  createdAt?: number;
  toolName?: string;
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
const ACTIVE_PROVIDER_KEY = 'ai-active-provider';

function repairMessageIds(messages: ChatMessage[]): { messages: ChatMessage[]; changed: boolean } {
  const seen = new Set<string>();
  let changed = false;
  const repaired = messages.map((msg) => {
    if (seen.has(msg.id)) {
      changed = true;
      return { ...msg, id: `${msg.id}-${crypto.randomUUID().slice(0, 8)}` };
    }
    seen.add(msg.id);
    return msg;
  });
  return { messages: repaired, changed };
}

function loadSessions(): ChatSessionData[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatSessionData[];
      if (Array.isArray(parsed)) {
        let changed = false;
        const repaired = parsed.map((s) => {
          const result = repairMessageIds(s.messages);
          if (result.changed) changed = true;
          return { ...s, messages: result.messages };
        });
        if (changed) saveSessions(repaired);
        return repaired;
      }
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

function isLocalProvider(type: string): boolean {
  return type === 'ollama' || type === 'lmstudio' || type === 'native';
}

function isKeylessProvider(type: string): boolean {
  return isLocalProvider(type) || type === 'deepseek';
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
    if (!match) return null;
    // Keyless providers (ollama/lmstudio/native/deepseek) don't need apiKey
    if (!isKeylessProvider(provider) && !match.apiKey) return null;
    return {
      type: match.type,
      apiKey: match.apiKey ?? '',
      baseUrl: match.baseUrl ?? '',
      model: match.model ?? '',
    };
  } catch {
    return null;
  }
}

function loadActiveProvider(): string | null {
  try {
    // First try explicit active provider key
    const active = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (active) return active;
    // Fallback: find first provider with apiKey or non-empty baseUrl
    const raw = localStorage.getItem(PROVIDER_CONFIG_KEY);
    if (!raw) return null;
    const configs = JSON.parse(raw) as Array<{
      type: string;
      apiKey?: string;
      baseUrl?: string;
    }>;
    const remote = configs.find((c) => c.apiKey && c.apiKey.length > 0);
    if (remote) return remote.type;
    const local = configs.find(
      (c) => isKeylessProvider(c.type) && c.baseUrl && c.baseUrl.length > 0,
    );
    if (local) return local.type;
    return null;
  } catch {
    return null;
  }
}

export function AIChat() {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialized = useRef(false);
  const streamMsgIdRef = useRef<string | null>(null);

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

  // Load active provider on mount + listen for config changes
  useEffect(() => {
    const configured = loadActiveProvider();
    setProvider(configured);

    const handler = () => {
      const updated = loadActiveProvider();
      setProvider(updated);
    };
    window.addEventListener('ai-provider-config-changed', handler);
    return () => window.removeEventListener('ai-provider-config-changed', handler);
  }, []);

  // P4: shared health poller (single fetch loop for the whole app)
  const aiHealth = useAIHealth();

  // Persist sessions on changes
  // P1: debounced — persisting the entire history synchronously on every
  // state change (and previously, every streamed token) stalls the UI.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSessions(sessions), 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sessions]);

  // Flush pending chat history when leaving the page
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  useEffect(() => {
    const flush = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      saveSessions(sessionsRef.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

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

  const createNewSession = useCallback((): string => {
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
    return id;
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

  const [copyAllCopied, setCopyAllCopied] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const startRename = useCallback((s: ChatSessionData) => {
    setRenamingId(s.id);
    setRenameDraft(s.title);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId) {
      const title = renameDraft.trim();
      if (title && title !== 'New Chat') {
        updateSession(renamingId, (s) => ({ ...s, title }));
      }
    }
    setRenamingId(null);
  }, [renamingId, renameDraft, updateSession]);

  const groupedSessions = useMemo(() => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const groups: Array<{ label: string; items: ChatSessionData[] }> = [
      { label: 'Hari ini', items: [] },
      { label: '7 hari terakhir', items: [] },
      { label: 'Lebih lama', items: [] },
    ];
    const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const s of sorted) {
      const age = now - s.updatedAt;
      if (age < dayMs) groups[0]!.items.push(s);
      else if (age < 7 * dayMs) groups[1]!.items.push(s);
      else groups[2]!.items.push(s);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [sessions]);

  const copyAllChat = useCallback(() => {
    if (!activeSession || activeSession.messages.length === 0) return;
    const text = activeSession.messages
      .map((m) => {
        const label =
          m.role === 'user'
            ? 'User'
            : m.role === 'assistant'
              ? 'Assistant'
              : m.role === 'error'
                ? 'Error'
                : 'Tool';
        return `[${label}]\n${m.content}`;
      })
      .join('\n\n');
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopyAllCopied(true);
        setTimeout(() => setCopyAllCopied(false), 1500);
      })
      .catch(() => {});
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
    async (content: string, opts?: { sessionId?: string }) => {
      const targetId = opts?.sessionId ?? activeSessionId;
      if (!targetId) return;
      // Guard pengiriman ganda — Enter terpicu dua kali / spam klik tidak
      // boleh memulai stream kedua yang saling menimpa.
      if (abortRef.current) return;

      let msgIdCounter = 0;
      streamMsgIdRef.current = null;

      const userMsg: ChatMessage = {
        role: 'user',
        content,
        id: `user-${Date.now()}`,
        createdAt: Date.now(),
      };

      updateSession(targetId, (s) => ({
        ...s,
        messages: [...s.messages, userMsg],
        updatedAt: Date.now(),
      }));
      ensureTitle(targetId, content);
      setIsLoading(true);

      const providerCfg = provider ? getProviderConfig(provider) : null;

      const abortController = new AbortController();
      abortRef.current = abortController;

      if (provider === 'native') {
        const currentMessages = sessionsRef.current.find((s) => s.id === targetId)?.messages ?? [];
        const allMessages = [...currentMessages, userMsg]
          .filter((m) => m.role !== 'error')
          .map((m) => ({ role: m.role as 'user' | 'assistant' | 'tool', content: m.content }));

        try {
          setModelLoading(true);
          const { NativeModelProvider } = await import('@arunaos/ai/providers/native');
          const model = new NativeModelProvider(providerCfg ?? undefined);

          const result = await model.complete({
            messages: allMessages,
            systemPrompt:
              'You are the ArunaOS AI — running locally in the browser. Be concise and helpful.',
          });
          setModelLoading(false);

          const replyMsg: ChatMessage = {
            role: 'assistant',
            content: sanitizeAIText(result.message.content),
            id: `assistant-${Date.now()}`,
            createdAt: Date.now(),
          };
          updateSession(targetId, (s) => ({
            ...s,
            messages: [...s.messages, replyMsg],
            updatedAt: Date.now(),
          }));
        } catch (nativeErr: unknown) {
          setModelLoading(false);
          const msg = nativeErr instanceof Error ? nativeErr.message : 'Native model error';
          const errMsg: ChatMessage = {
            role: 'error',
            content: msg,
            id: `error-${Date.now()}`,
            createdAt: Date.now(),
          };
          updateSession(targetId, (s) => ({
            ...s,
            messages: [...s.messages, errMsg],
            updatedAt: Date.now(),
          }));
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams({ message: content });
        if (sessionIdRef.current) params.set('sessionId', sessionIdRef.current);
        // Only send `provider` together with its full config — a bare provider
        // type without credentials caused 401 "Missing Authentication header"
        // on the server (it built the provider with no API key).
        if (provider && providerCfg) params.set('provider', provider);
        if (providerCfg) params.set('providerConfig', JSON.stringify(providerCfg));

        const webSearchEnabled = localStorage.getItem('ai-web-search') !== 'false';
        if (!webSearchEnabled) params.set('webSearch', 'false');

        // Attach precise user location if available
        const loc = useLocationStore.getState();
        if (loc.enabled && loc.latitude != null && loc.longitude != null) {
          params.set('lat', String(loc.latitude));
          params.set('lon', String(loc.longitude));
          if (loc.city) params.set('city', loc.city);
        }

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
        // Strip leaked model artifacts (<think>…, <tool_call>…) that can be
        // split across SSE chunk boundaries.
        const sanitizer = new StreamSanitizer();
        // P1: commit streamed tokens to React state at most every ~80ms —
        // a full session-array rebuild per SSE token caused jank and
        // synchronous localStorage writes on the hot path.
        let lastCommit = 0;
        const commitStream = (force = false) => {
          const now = performance.now();
          if (!force && now - lastCommit < 80) return;
          lastCommit = now;
          updateSession(targetId, (s) => {
            const msgs = [...s.messages];
            const pendingId = streamMsgIdRef.current;
            if (pendingId) {
              const idx = msgs.findIndex((m) => m.id === pendingId);
              const existing = msgs[idx];
              if (existing) {
                msgs[idx] = { ...existing, content: fullReply };
              } else {
                msgs.push({ role: 'assistant', content: fullReply, id: pendingId });
              }
            } else {
              const newId = `stream-${Date.now()}-${++msgIdCounter}`;
              streamMsgIdRef.current = newId;
              msgs.push({
                role: 'assistant',
                content: fullReply,
                id: newId,
                createdAt: Date.now(),
              });
            }
            return { ...s, messages: msgs, updatedAt: Date.now() };
          });
        };

        while (true) {
          // Watchdog: jika tidak ada data dalam 90 detik (mis. upstream
          // OpenRouter hang), finalize jawaban parsial alih-alih menggantung
          // selamanya dan mengunci input.
          const readTimeout = new Promise<{ done: true; value?: undefined; timedOut: true }>(
            (res) => setTimeout(() => res({ done: true, timedOut: true }), 90000),
          );
          const { done, value, timedOut } = (await Promise.race([reader.read(), readTimeout])) as {
            done: boolean;
            value?: Uint8Array;
            timedOut?: true;
          };
          if (done) {
            if (timedOut) {
              console.warn('[sse] read timeout — finalizing partial reply');
            }
            break;
          }

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
                  createdAt: Date.now(),
                };
                updateSession(targetId, (s) => ({
                  ...s,
                  messages: [...s.messages, errMsg],
                  updatedAt: Date.now(),
                }));
                continue;
              }

              if (parsed.type === 'text' && parsed.content) {
                fullReply += sanitizer.push(parsed.content);
                commitStream();
              }

              if (parsed.type === 'status') {
                const statusId = `status-${Date.now()}-${++msgIdCounter}`;
                const statusContent =
                  parsed.status === 'thinking'
                    ? 'Thinking...'
                    : parsed.status === 'searching'
                      ? 'Searching web...'
                      : '';

                if (statusContent) {
                  updateSession(targetId, (s) => ({
                    ...s,
                    messages: [
                      ...s.messages,
                      {
                        role: 'status' as ChatMessage['role'],
                        content: statusContent,
                        id: statusId,
                      },
                    ],
                  }));
                }

                if (parsed.status === 'done' || parsed.status === 'fail') {
                  setTimeout(() => {
                    updateSession(targetId, (s) => {
                      const filtered = s.messages.filter((m) => m.id !== statusId);
                      return { ...s, messages: filtered };
                    });
                  }, 1500);
                }
              }

              if (parsed.type === 'tool-result') {
                const toolMsg: ChatMessage = {
                  role: 'tool',
                  content: parsed.content,
                  id: `tool-${Date.now()}-${++msgIdCounter}`,
                  createdAt: Date.now(),
                  toolName: parsed.toolName as string | undefined,
                };
                updateSession(targetId, (s) => ({
                  ...s,
                  messages: [...s.messages, toolMsg],
                  updatedAt: Date.now(),
                }));

                // open_app dieksekusi di server (hanya cek registry) —
                // window yang sebenarnya harus dibuka di sisi klien.
                if (parsed.toolName === 'open_app') {
                  try {
                    const result = JSON.parse(parsed.content) as {
                      success?: boolean;
                      data?: { appId?: string };
                    };
                    const fullAppId = result.data?.appId;
                    if (result.success && fullAppId) {
                      const shortId =
                        MODULE_APP_ID_MAP[fullAppId] ?? fullAppId.replace(/^arunaos\./, '');
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
                }

                // generate_module — persist modul hasil AI + daftarkan ke
                // registry agar muncul di Applications / Module Installer.
                if (parsed.toolName === 'generate_module') {
                  try {
                    const result = JSON.parse(parsed.content) as {
                      success?: boolean;
                      data?: {
                        id?: string;
                        manifest?: {
                          name?: string;
                          version?: string;
                          description?: string;
                          icon?: string;
                          entry?: string;
                        };
                        code?: string;
                        files?: string[];
                      };
                    };
                    const genId = result.success ? result.data?.id : undefined;
                    if (genId && result.data?.manifest) {
                      const d = result.data;
                      const m = result.data.manifest;
                      useGeneratedModulesStore.getState().add({
                        id: genId,
                        name: m.name || genId,
                        version: m.version || '0.1.0',
                        description: m.description || '',
                        icon: m.icon,
                        entry: m.entry,
                        files: d.files,
                        code: d.code,
                        createdAt: Date.now(),
                      });
                      // Seed sandbox bundle cache so the module can run
                      // immediately via ExternalModuleSandbox.
                      try {
                        const w = window as unknown as {
                          __arunaos_container?: { get: <T>(n: string) => T };
                        };
                        const container = w.__arunaos_container;
                        if (container && d.code) {
                          container
                            .get<{ seedCache: (id: string, code: string) => void }>(
                              'externalModuleLoader',
                            )
                            .seedCache(genId, d.code);
                        }
                      } catch {
                        /* loader belum siap — boot seeding akan mengisi */
                      }
                      window.dispatchEvent(new CustomEvent('arunaos:module-generated'));
                    }
                  } catch {
                    // payload tidak valid — abaikan
                  }
                }
              }
            } catch {
              // skip malformed
            }
          }
        }

        fullReply += sanitizer.flush();
        const isEmptyReply = !fullReply.trim();

        updateSession(targetId, (s) => {
          const msgs = [...s.messages].filter((m) => m.role !== 'status');
          const pendingId = streamMsgIdRef.current;
          if (pendingId) {
            const idx = msgs.findIndex((m) => m.id === pendingId);
            if (idx >= 0) {
              if (isEmptyReply) {
                // Model returned nothing usable — drop the placeholder and
                // surface an error instead of an empty bubble.
                msgs.splice(idx, 1);
              }
            }
          }
          if (isEmptyReply) {
            msgs.push({
              role: 'error',
              content:
                'Model mengembalikan respons kosong. Coba kirim ulang pesan Anda atau ganti model di pengaturan.',
              id: `error-${Date.now()}`,
              createdAt: Date.now(),
            });
          } else if (pendingId) {
            const idx = msgs.findIndex((m) => m.id === pendingId);
            if (idx >= 0) {
              msgs[idx] = {
                role: 'assistant',
                content: fullReply,
                id: `assistant-${Date.now()}`,
                createdAt: Date.now(),
              };
            }
          }
          streamMsgIdRef.current = null;
          return { ...s, messages: msgs, updatedAt: Date.now() };
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;

        try {
          const body: Record<string, unknown> = { message: content };
          if (sessionIdRef.current) body.sessionId = sessionIdRef.current;
          if (provider && providerCfg) body.provider = provider;
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
            content: sanitizeAIText(typeof data.reply === 'string' ? data.reply : ''),
            id: `assistant-${Date.now()}`,
            createdAt: Date.now(),
          };
          updateSession(targetId, (s) => ({
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
            createdAt: Date.now(),
          };
          updateSession(targetId, (s) => ({
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
            className="text-foreground/50 hover:text-foreground hover:bg-muted disabled:text-foreground/40 rounded-md p-1.5 transition-colors disabled:cursor-not-allowed"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            onClick={exportChat}
            disabled={!activeSession || messages.length === 0}
            className="text-foreground/50 hover:text-foreground hover:bg-muted disabled:text-foreground/40 rounded-md p-1.5 transition-colors disabled:cursor-not-allowed"
            title="Export chat"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={copyAllChat}
            disabled={!activeSession || messages.length === 0}
            className="text-foreground/50 hover:text-foreground hover:bg-muted disabled:text-foreground/40 rounded-md p-1.5 transition-colors disabled:cursor-not-allowed"
            title="Copy entire conversation"
          >
            {copyAllCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <ClipboardCopy className="h-4 w-4" />
            )}
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

      {/* Model download progress */}
      {modelLoading && <ModelDownloadProgress />}

      {/* Health status strip */}
      {aiHealth !== 'full' && (
        <div
          className={cn(
            'flex items-center gap-2 border-b px-4 py-1.5',
            aiHealth === 'none'
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-amber-500/20 bg-amber-500/5',
          )}
        >
          <WifiOff
            className={cn(
              'h-3 w-3 shrink-0',
              aiHealth === 'none' ? 'text-red-500' : 'text-amber-500',
            )}
          />
          <p
            className={cn(
              'text-[11px]',
              aiHealth === 'none' ? 'text-red-600/80' : 'text-amber-600/80',
            )}
          >
            {aiHealth === 'none' ? (
              <>
                AI offline — konfigurasikan provider di{' '}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="underline underline-offset-2"
                >
                  Settings
                </button>{' '}
                untuk kemampuan penuh.
              </>
            ) : (
              'Tidak ada koneksi internet — web search dinonaktifkan, memakai alat lokal.'
            )}
          </p>
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
              <span className="text-foreground/50 text-[10px]">{sessions.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 && (
                <div className="px-2 py-8 text-center">
                  <MessageSquare className="text-foreground/40 mx-auto mb-2 h-5 w-5" />
                  <p className="text-foreground/50 text-xs">No chat history</p>
                  <p className="text-foreground/40 mt-1 text-[10px]">Start a new conversation</p>
                </div>
              )}
              {groupedSessions.map((group) => (
                <div key={group.label} className="mb-1.5">
                  <p className="text-foreground/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((s) =>
                      renamingId === s.id ? (
                        <input
                          key={s.id}
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="border-primary/40 bg-background w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                        />
                      ) : deletingId === s.id ? (
                        <div
                          key={s.id}
                          className="border-danger/20 bg-danger/5 flex items-center gap-1 rounded-md border px-2 py-1.5"
                        >
                          <span className="text-danger flex-1 truncate text-[11px]">
                            Hapus chat?
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(null);
                              deleteSession(e, s.id);
                            }}
                            className="text-danger hover:bg-danger/10 rounded px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            Ya
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-foreground/50 hover:bg-muted hover:text-foreground rounded px-1.5 py-0.5 text-[10px]"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          key={s.id}
                          onClick={() => switchSession(s.id)}
                          onDoubleClick={() => startRename(s)}
                          title={s.title}
                          className={cn(
                            'hover:bg-muted group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors',
                            s.id === activeSessionId
                              ? 'bg-muted text-foreground'
                              : 'text-foreground/60',
                          )}
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 truncate">{s.title}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(s.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setDeletingId(s.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              'text-foreground/40 hover:text-danger shrink-0 cursor-pointer p-0.5 transition-opacity',
                              deletingId !== null
                                ? 'opacity-0'
                                : 'opacity-0 group-hover:opacity-100',
                            )}
                            title="Delete session"
                          >
                            <Trash2 className="h-3 w-3" />
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeSession ? (
            <>
              <ChatMessages
                messages={messages}
                isLoading={isLoading}
                onRetry={(m) => void sendMessage(m)}
              />
              <ChatInput
                onSend={(m) => void sendMessage(m)}
                onStop={stopStreaming}
                disabled={isLoading}
                aiHealth={aiHealth}
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6">
              <div className="w-full max-w-md text-center">
                <div
                  className={cn(
                    'from-primary/60 to-primary/25 mx-auto mb-5 flex h-16 w-16 items-center',
                    'shadow-primary/20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-lg',
                  )}
                >
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-foreground mb-1.5 text-lg font-semibold">AI Assistant</h3>
                <p className="text-foreground/40 mb-1 text-xs leading-relaxed">
                  Tanya apa saja, jalankan perintah, atau buat modul baru
                </p>
                <p className="text-foreground/50 mb-7 text-[11px]">
                  {provider ? (
                    <>
                      Terhubung ke{' '}
                      <span className="text-foreground/50 font-medium">{provider}</span>
                      {aiHealth === 'limited' && ' — mode offline'}
                    </>
                  ) : (
                    'Mode fallback aktif — konfigurasikan provider untuk jawaban AI penuh'
                  )}
                </p>

                <div className="mb-6 grid grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((sp) => (
                    <button
                      key={sp.title}
                      onClick={() => {
                        const id = createNewSession();
                        void sendMessage(sp.prompt, { sessionId: id });
                      }}
                      className={cn(
                        'border-border/30 bg-card hover:border-primary/40 hover:shadow-sm',
                        'group rounded-xl border p-3 text-left transition-all',
                      )}
                    >
                      <div className="bg-primary/10 text-primary mb-2 inline-flex h-6 w-6 items-center justify-center rounded-lg">
                        <sp.icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-foreground group-hover:text-primary text-xs font-medium transition-colors">
                        {sp.title}
                      </p>
                      <p className="text-foreground/35 mt-0.5 line-clamp-2 text-[10px] leading-snug">
                        {sp.prompt}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => createNewSession()}
                  className={cn(
                    'border-border/30 text-foreground/70 hover:border-primary/40 hover:text-foreground',
                    'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-colors',
                  )}
                >
                  <Plus className="h-3.5 w-3.5" /> Chat Kosong
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
