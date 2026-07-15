import type { ArunaEngine } from '@arunaos/engine';
import type { ArunaCore } from './aruna-core';
import { useArunaAssistantStore } from '../stores/aruna-assistant-store';
import { useWeatherStore } from '@/features/weather/weather.store';
import { useLocationStore } from '@/stores/location.store';

let _bridgeInitialized = false;

let _cachedInsights: Array<{ type: string; description: string; confidence: number }> = [];
let _lastTemp: number | null = null;
let _lastCondition: string | null = null;

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
        engine
          .getMemoryGreeting()
          .then(({ memoryNote }) => {
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

  /* Context-aware event reactions */
  const onFocusChange = async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized && !store.collapsed) {
      store.refreshSuggestions();
    }
  };
  scheduler.on('focus-change', onFocusChange);

  const onAppOpened = async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized && !store.collapsed) {
      store.refreshSuggestions();
    }
  };
  scheduler.on('app-opened', onAppOpened);

  const onTaskCompleted = async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized) {
      store.refreshSuggestions();
      store.refreshBrief();
    }
  };
  scheduler.on('task-completed', onTaskCompleted);

  /* ── Return cleanup ── */

  return () => {
    _bridgeInitialized = false;
    core.clearEngineBridge();
    scheduler.off('focus-change', onFocusChange);
    scheduler.off('app-opened', onAppOpened);
    scheduler.off('task-completed', onTaskCompleted);
    for (const cleanup of cleanups) cleanup();
  };
}
