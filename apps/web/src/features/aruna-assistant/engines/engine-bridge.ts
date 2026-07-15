import type { ArunaEngine } from '@arunaos/engine';
import type { ArunaCore } from './aruna-core';
import { useArunaAssistantStore } from '../stores/aruna-assistant-store';
import { useWeatherStore } from '@/features/weather/weather.store';
import { useLocationStore } from '@/stores/location.store';

let _bridgeInitialized = false;

let _cachedInsights: Array<{ type: string; description: string; confidence: number }> = [];

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

  /* ── 3. Refresh habit insight cache periodically ── */

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

  /* ── 4. Scheduler triggers for assistant refresh ── */

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

  scheduler.on('focus-change', async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized && !store.collapsed) {
      store.refreshSuggestions();
    }
  });

  scheduler.on('task-completed', async () => {
    const store = useArunaAssistantStore.getState();
    if (store?.initialized) {
      store.refreshSuggestions();
      store.refreshBrief();
    }
  });

  /* ── Return cleanup ── */

  return () => {
    _bridgeInitialized = false;
    core.clearEngineBridge();
    for (const cleanup of cleanups) cleanup();
  };
}
