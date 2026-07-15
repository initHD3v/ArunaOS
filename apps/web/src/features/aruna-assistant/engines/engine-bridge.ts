import type { ArunaEngine, EngineContext, SystemNotification } from '@arunaos/engine';
import type { ArunaCore } from './aruna-core';
import { useArunaAssistantStore } from '../stores/aruna-assistant-store';
import { useWeatherStore } from '@/features/weather/weather.store';
import { useLocationStore } from '@/stores/location.store';
import { useNotificationStore } from '@/services/notification/notification-store';
import { useAIContextStore } from '@/stores/ai-context.store';

let _bridgeInitialized = false;

let _cachedInsights: Array<{ type: string; description: string; confidence: number }> = [];
let _lastTemp: number | null = null;
let _lastCondition: string | null = null;

/* Cache for engine's memory greeting (async, refreshed periodically) */
let _cachedGreeting: string | null = null;

/* Notification service reference (set externally by service-provider) */
let _notificationService: { notify: (type: string, message: string) => void } | null = null;
export function setNotificationService(svc: { notify: (type: string, message: string) => void }) {
  _notificationService = svc;
}
export function getNotificationService() {
  return _notificationService;
}

/* Debounce timer for suggestion refresh */
let _suggestionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedRefreshSuggestions() {
  if (_suggestionDebounceTimer) clearTimeout(_suggestionDebounceTimer);
  _suggestionDebounceTimer = setTimeout(() => {
    _suggestionDebounceTimer = null;
    const store = useArunaAssistantStore.getState();
    if (store?.initialized) store.refreshSuggestions();
  }, 300);
}

/* ── helpers ── */

function toEngineTimeOfDay(tod: string): 'pagi' | 'siang' | 'sore' | 'malam' {
  switch (tod) {
    case 'morning':
      return 'pagi';
    case 'afternoon':
      return 'siang';
    case 'evening':
      return 'sore';
    case 'night':
      return 'malam';
    default: {
      const h = new Date().getHours();
      if (h >= 4 && h < 11) return 'pagi';
      if (h >= 11 && h < 15) return 'siang';
      if (h >= 15 && h < 19) return 'sore';
      return 'malam';
    }
  }
}

export function bridgeArunaEngine(engine: ArunaEngine, core: ArunaCore): () => void {
  if (_bridgeInitialized) return () => {};
  _bridgeInitialized = true;

  const cleanups: Array<() => void> = [];

  /* ── 1. Context Bridge: feed weather/location to engine ContextAggregator ── */

  const ctxAgg = engine.getContextAggregator();

  const feedWeatherToEngine = () => {
    try {
      const w = useWeatherStore.getState();
      const ls = useLocationStore.getState();
      if (w && w.hourly.length > 0) {
        ctxAgg.setWeather(w.temp, w.condition, ls?.city ?? 'Unknown');

        /* Detect significant weather change for context-aware reaction */
        if (_lastTemp !== null && _lastCondition !== null) {
          const tempDiff = Math.abs(w.temp - _lastTemp);
          const conditionChange = w.condition !== _lastCondition;
          if (tempDiff > 5 || conditionChange) {
            const store = useArunaAssistantStore.getState();
            if (store?.initialized && !store.collapsed) {
              store.refreshSuggestions();
            }
          }
        }
        _lastTemp = w.temp;
        _lastCondition = w.condition;
      }
    } catch {
      /* stores not available */
    }
  };

  feedWeatherToEngine();
  const weatherInterval = setInterval(feedWeatherToEngine, 5 * 60 * 1000);
  cleanups.push(() => clearInterval(weatherInterval));

  /* ── 2. Memory Bridge + Scheduler + Habit Insights via bridgeEngine API ── */

  const ms = engine.getMemoryStore();
  const habitLearner = engine.getHabitLearner();
  const scheduler = engine.getScheduler();

  core.bridgeEngine({
    rememberHook: (content, category) => {
      if (category === 'short-term' || category === 'episodic') {
        ms.saveConversation({
          id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: new Date().toISOString().slice(0, 10),
          timestamp: Date.now(),
          messageCount: 1,
          summary: content.slice(0, 200),
        }).catch(() => {});
      }
    },

    suggestionsHook: (suggestions) => {
      const cached = _cachedInsights;
      if (cached.length > 0) {
        for (const ins of cached) {
          if (ins.confidence > 0.4 && suggestions.length < 6) {
            suggestions.push({
              id: `habit-${ins.type}-${Date.now()}`,
              icon: 'sparkles',
              title:
                ins.type === 'productive_hour'
                  ? 'Jam Produktif'
                  : ins.type === 'app_pattern'
                    ? 'Pola Aplikasi'
                    : 'Saran',
              description: ins.description,
              estimatedTime: '~1m',
              action: () => {},
            });
          }
        }
      }
      return suggestions;
    },

    briefHook: (brief) => {
      if (brief) {
        /* 1. Use cached memory greeting if available (most personalized via engine) */
        if (_cachedGreeting) {
          brief.greeting = _cachedGreeting;
        } else {
          /* 2. Fallback: synchronously generate template greeting from frontend context */
          const ctx = core.getCurrentContext();
          if (ctx) {
            const engineCtx: EngineContext = {
              timeOfDay: toEngineTimeOfDay(ctx.time.timeOfDay),
              date: new Date(),
              weather: ctx.weather ?? undefined,
            };
            const { greeting } = engine.getTemplateEngine().generateGreeting(engineCtx);
            brief.greeting = greeting;
          }
        }

        /* 3. Refresh cache async for next brief */
        engine
          .getMemoryGreeting()
          .then(({ greeting, memoryNote }) => {
            _cachedGreeting = greeting;
            if (memoryNote) {
              core.remember(`Memory: ${memoryNote}`, 'semantic', { source: 'engine-habit' });
            }
          })
          .catch(() => {});
      }
      return brief;
    },
  });

  /* ── 3. Bridge frontend activity observations to engine ── */

  const originalObserve = core.learner.observeActivity.bind(core.learner);
  core.learner.observeActivity = (type, data) => {
    originalObserve(type, data);

    /* Replicate relevant observations to engine subsystems */
    if (type === 'module-open' && data.moduleId) {
      const moduleId = data.moduleId;
      const today = new Date().toISOString().slice(0, 10);
      ms.getAppUsage(moduleId, today)
        .then((existing) => {
          if (existing) {
            existing.openCount++;
            existing.lastOpened = Date.now();
            ms.recordAppUsage(existing);
          } else {
            ms.recordAppUsage({
              appId: moduleId,
              date: today,
              openCount: 1,
              totalDurationMs: 0,
              lastOpened: Date.now(),
            });
          }
        })
        .catch(() => {});
      scheduler.emit('app-opened', { appId: moduleId });
    }

    if (type === 'workspace-change' && data.workspaceId) {
      scheduler.emit('focus-change', { workspace: data.workspaceId });
    }

    if (type === 'user-input') {
      if (data.text) {
        core.remember(`User said: "${data.text.slice(0, 100)}"`, 'short-term', {
          source: 'user-input',
        });
      }
      engine
        .getWindowObserver()
        .flush()
        .catch(() => {});
    }
  };

  /* ── 5. Refresh habit insight cache periodically ── */

  const refreshInsights = async () => {
    try {
      _cachedInsights = await habitLearner.getInsights();
    } catch {
      /* ignore */
    }
  };

  refreshInsights();
  const insightInterval = setInterval(refreshInsights, 15 * 60 * 1000);
  cleanups.push(() => clearInterval(insightInterval));

  /* ── 5b. Refresh memory greeting cache periodically ── */

  const refreshMemoryGreeting = async () => {
    try {
      const { greeting } = await engine.getMemoryGreeting();
      _cachedGreeting = greeting;
    } catch {
      /* ignore */
    }
  };

  refreshMemoryGreeting();
  const greetingCacheInterval = setInterval(refreshMemoryGreeting, 30 * 60 * 1000);
  cleanups.push(() => clearInterval(greetingCacheInterval));

  /* ── 6. Scheduler-driven proactivity ── */

  /* Morning briefing */
  scheduler.registerTask({
    id: 'assistant-morning-brief',
    schedule: 'daily-morning',
    action: async () => {
      const store = useArunaAssistantStore.getState();
      if (store?.initialized) {
        store.refreshBrief();
        store.refreshSuggestions();
        /* Only auto-expand if collapsed and has recent activity */
        const hasRecentActivity = _cachedInsights.length > 0;
        if (store.collapsed && hasRecentActivity) {
          store.setCollapsed(false);
        }
      }
    },
    lastRun: 0,
  });

  /* Midday check-in */
  scheduler.registerTask({
    id: 'assistant-midday-check',
    schedule: 'daily-midday',
    action: async () => {
      const store = useArunaAssistantStore.getState();
      if (store?.initialized) {
        store.refreshSuggestions();
        store.refreshReflection();
      }
    },
    lastRun: 0,
  });

  /* Evening reflection */
  scheduler.registerTask({
    id: 'assistant-evening-reflection',
    schedule: 'daily-evening',
    action: async () => {
      const store = useArunaAssistantStore.getState();
      if (store?.initialized) {
        store.refreshReflection();
        store.refreshSuggestions();
        store.refreshBrief();
      }
    },
    lastRun: 0,
  });

  /* Periodic suggestion refresh */
  scheduler.registerTask({
    id: 'assistant-suggestion-refresh',
    schedule: 'every-30min',
    action: async () => {
      const store = useArunaAssistantStore.getState();
      if (store?.initialized) {
        store.refreshSuggestions();
      }
    },
    lastRun: 0,
  });

  /* ── 7. Notification Hub bridge ── */

  const nh = engine.getNotificationHub();
  const unsubNotification = nh.onNotification((notif: SystemNotification) => {
    /* Forward engine notifications to frontend notification store */
    const type =
      notif.priority === 'urgent' ? 'error' : notif.priority === 'high' ? 'warning' : 'info';
    useNotificationStore.getState().add({
      id: notif.id,
      type,
      message: `${notif.title}: ${notif.body}`,
      duration: 5000,
      toast: notif.priority === 'urgent' || notif.priority === 'high',
      createdAt: Date.now(),
    });
  });

  /* Wire AI context store askAI → NotificationHub for proactive follow-up */
  const origAskAI = useAIContextStore.getState().askAI;
  useAIContextStore.setState({
    askAI: (prompt) => {
      origAskAI(prompt);
      if (prompt) {
        nh.push({
          title: 'AI Query',
          body: prompt.slice(0, 100),
          source: 'assistant',
          priority: 'low',
        });
      }
    },
  });

  /* ── 8. Context-aware event reactions (debounced) ── */

  const onFocusChange = async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized && !store.collapsed) {
      debouncedRefreshSuggestions();
    }
  };
  scheduler.on('focus-change', onFocusChange);

  const onAppOpened = async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized && !store.collapsed) {
      debouncedRefreshSuggestions();
    }
  };
  scheduler.on('app-opened', onAppOpened);

  const onTaskCompleted = async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized) {
      debouncedRefreshSuggestions();
      store.refreshBrief();
    }
  };
  scheduler.on('task-completed', onTaskCompleted);

  /* ── 9. Proactive notifications via scheduler ── */

  scheduler.registerTask({
    id: 'proactive-morning-notification',
    schedule: 'daily-morning',
    action: async () => {
      const store = useArunaAssistantStore.getState();
      if (!store?.initialized) return;
      const brief = store.brief;
      if (brief) {
        nh.push({
          title: 'Selamat Pagi',
          body: brief.message || 'Semoga hari ini produktif!',
          source: 'assistant',
          priority: 'low',
        });
      }
    },
    lastRun: 0,
  });

  scheduler.registerTask({
    id: 'proactive-idle-notification',
    schedule: 'every-30min',
    action: async () => {
      const store = useArunaAssistantStore.getState();
      if (!store?.initialized) return;
      const suggestions = store.suggestions;
      if (suggestions.length > 0 && _cachedInsights.length > 0) {
        const top = suggestions[0];
        if (top && top.title !== 'Daily Brief') {
          nh.push({
            title: top.title,
            body: top.description || 'Ada yang bisa saya bantu?',
            source: 'assistant',
            priority: 'normal',
          });
        }
      }
    },
    lastRun: 0,
  });

  /* ── Return cleanup ── */

  return () => {
    _bridgeInitialized = false;
    core.clearEngineBridge();
    scheduler.off('focus-change', onFocusChange);
    scheduler.off('app-opened', onAppOpened);
    scheduler.off('task-completed', onTaskCompleted);
    unsubNotification();
    if (_suggestionDebounceTimer) clearTimeout(_suggestionDebounceTimer);
    for (const cleanup of cleanups) cleanup();
  };
}
