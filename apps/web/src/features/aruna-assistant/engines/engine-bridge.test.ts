import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ArunaEngine } from '@arunaos/engine';
import type { ArunaCore } from './aruna-core';
import type { Suggestion, DailyBrief, SystemContext } from './types';

/* Mocks for Zustand stores used by engine-bridge */
const mockWeatherState = vi.fn();
vi.mock('@/features/weather/weather.store', () => ({
  useWeatherStore: { getState: () => mockWeatherState() },
}));

const mockLocationState = vi.fn();
vi.mock('@/stores/location.store', () => ({
  useLocationStore: { getState: () => mockLocationState() },
}));

const mockAssistantState = vi.fn();
vi.mock('../stores/aruna-assistant-store', () => ({
  useArunaAssistantStore: { getState: () => mockAssistantState() },
}));

const mockNotifAdd = vi.fn();
/* Mock Zustand stores used by engine-bridge notification features */
vi.mock('@/services/notification/notification-store', () => ({
  useNotificationStore: {
    getState: () => ({
      add: mockNotifAdd,
    }),
  },
}));

const mockAskAI = vi.fn();
const mockSetState = vi.fn();
vi.mock('@/stores/ai-context.store', () => ({
  useAIContextStore: {
    getState: () => ({
      askAI: mockAskAI,
    }),
    setState: mockSetState,
  },
}));

/* Helper to create a mock SystemContext */
function mockSystemContext(overrides?: Partial<SystemContext>): SystemContext {
  return {
    time: { hour: 10, minute: 0, dayOfWeek: 1, date: '2026-07-13', timeOfDay: 'morning' },
    weather: null,
    workspace: { activeModules: [], focusedWindow: null },
    notifications: { total: 0, important: 0 },
    system: { battery: null, network: 'wifi', uptime: 3600 },
    ...overrides,
  };
}

/* Helper to safely call mock getters */
function callMock<T = unknown>(obj: Record<string, unknown>, key: string): T {
  const fn = obj[key] as () => T;
  return fn();
}

describe('engine-bridge', () => {
  let mockEngine: Record<string, unknown>;
  let mockCore: Partial<ArunaCore> & Record<string, unknown>;
  let capturedHooks: Record<string, unknown>;

  beforeEach(async () => {
    /* Reset module-level state by re-importing via dynamic import with cache cleared */
    vi.resetModules();

    /* Build mock engine */
    const mockCtxAgg = {
      setWeather: vi.fn(),
    };
    const mockMs = {
      saveConversation: vi.fn().mockResolvedValue(undefined),
      getAppUsage: vi.fn().mockResolvedValue(null),
      recordAppUsage: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    const mockHabitLearner = {
      getInsights: vi.fn().mockResolvedValue([]),
    };
    const mockScheduler = {
      registerTask: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };
    const mockTemplateEngine = {
      generateGreeting: vi
        .fn()
        .mockReturnValue({ greeting: 'Selamat pagi! Hari ini cerah.', mood: 'Energetic' }),
    };
    const mockWindowObserver = {
      flush: vi.fn().mockResolvedValue(undefined),
    };

    const mockNotificationHub = {
      onNotification: vi.fn().mockReturnValue(vi.fn()),
      push: vi.fn(),
    };

    mockEngine = {
      getContextAggregator: vi.fn().mockReturnValue(mockCtxAgg),
      getMemoryStore: vi.fn().mockReturnValue(mockMs),
      getHabitLearner: vi.fn().mockReturnValue(mockHabitLearner),
      getScheduler: vi.fn().mockReturnValue(mockScheduler),
      getTemplateEngine: vi.fn().mockReturnValue(mockTemplateEngine),
      getMemoryGreeting: vi.fn().mockResolvedValue({
        greeting: 'Selamat pagi! Ini dari memori.',
        memoryNote: 'Kemarin kamu menyelesaikan 3 tugas.',
      }),
      getWindowObserver: vi.fn().mockReturnValue(mockWindowObserver),
      getNotificationHub: vi.fn().mockReturnValue(mockNotificationHub),
    };

    /* Build mock core */
    capturedHooks = {};
    const mockLearner = {
      observeActivity: vi.fn(),
    };

    mockCore = {
      bridgeEngine: vi.fn().mockImplementation((hooks) => {
        capturedHooks = hooks as Record<string, unknown>;
      }),
      clearEngineBridge: vi.fn(),
      getCurrentContext: vi.fn().mockReturnValue(mockSystemContext()),
      remember: vi.fn(),
      learner: mockLearner,
      state: { current: 'idle', onStateChange: vi.fn() },
    } as unknown as Partial<ArunaCore> & Record<string, unknown>;

    /* Mock store getters */
    mockWeatherState.mockReturnValue({
      hourly: [{ temp: 28, condition: 'Cerah' }],
      temp: 28,
      condition: 'Cerah',
    });
    mockLocationState.mockReturnValue({ city: 'Jakarta' });
    mockAssistantState.mockReturnValue({
      initialized: true,
      collapsed: false,
      refreshSuggestions: vi.fn(),
      refreshBrief: vi.fn(),
      refreshReflection: vi.fn(),
      setCollapsed: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('imports without error', async () => {
    const mod = await import('./engine-bridge');
    expect(mod.bridgeArunaEngine).toBeDefined();
    expect(typeof mod.bridgeArunaEngine).toBe('function');
  });

  it('registers hooks via core.bridgeEngine', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    const cleanup = bridgeArunaEngine(
      mockEngine as unknown as ArunaEngine,
      mockCore as unknown as ArunaCore,
    );

    expect(mockCore.bridgeEngine).toHaveBeenCalledOnce();
    expect(capturedHooks.rememberHook).toBeDefined();
    expect(capturedHooks.suggestionsHook).toBeDefined();
    expect(capturedHooks.briefHook).toBeDefined();
    expect(typeof cleanup).toBe('function');
  });

  it('returns noop on second call', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);
    const second = bridgeArunaEngine(
      mockEngine as unknown as ArunaEngine,
      mockCore as unknown as ArunaCore,
    );

    /* Should be a noop that does nothing when called */
    second();
    expect(mockCore.bridgeEngine).toHaveBeenCalledTimes(1);
  });

  it('feeds weather to engine context aggregator', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const ctxAgg = callMock<{ setWeather: ReturnType<typeof vi.fn> }>(
      mockEngine,
      'getContextAggregator',
    );
    expect(ctxAgg.setWeather).toHaveBeenCalledWith(28, 'Cerah', 'Jakarta');
  });

  it('rememberHook saves conversations', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const hook = capturedHooks.rememberHook as (content: string, category: string) => void;
    expect(hook).toBeDefined();

    hook('Test conversation', 'short-term');
    const ms = callMock(mockEngine, 'getMemoryStore') as {
      saveConversation: ReturnType<typeof vi.fn>;
    };
    expect(ms.saveConversation).toHaveBeenCalledOnce();
    expect(ms.saveConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Test conversation',
      }),
    );
  });

  it('rememberHook skips non-short-term categories', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const hook = capturedHooks.rememberHook as (content: string, category: string) => void;
    hook('Long term memory', 'long-term');
    const ms2 = callMock(mockEngine, 'getMemoryStore') as {
      saveConversation: ReturnType<typeof vi.fn>;
    };
    expect(ms2.saveConversation).not.toHaveBeenCalled();
  });

  it('suggestionsHook injects habit insights above threshold', async () => {
    /* Pre-populate _cachedInsights via the habits refresh */
    /* We need to wait for the initial refreshInsights call which happens in bridgeArunaEngine */
    /* For this test, we check that the hook works properly with the mock cache */

    /* The insight cache is module-level, so we test the hook's logic directly */
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const hook = capturedHooks.suggestionsHook as (suggestions: Suggestion[]) => Suggestion[];
    expect(hook).toBeDefined();

    /* Even with empty cached insights, it should return the input unchanged */
    const input: Suggestion[] = [
      {
        id: 'test',
        icon: 'sparkles',
        title: 'Test',
        description: 'desc',
        estimatedTime: '~1m',
        action: () => {},
      },
    ];
    const result = hook(input);
    expect(result).toBe(input);
    expect(result).toHaveLength(1);
  });

  it('briefHook enhances greeting with template engine', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const hook = capturedHooks.briefHook as (brief: DailyBrief) => DailyBrief;
    expect(hook).toBeDefined();

    const brief: DailyBrief = {
      greeting: 'Good Morning, User',
      timeOfDay: 'morning',
      weather: 'Cuaca hari ini 28° Cerah di Jakarta',
      calendarSummary: '',
      emailSummary: '',
      pendingTasks: 0,
      focusRecommendation: 'Fokus pada prioritas utama',
      message: 'Pagi yang baik',
    };

    const result = hook(brief);
    /* Result should have the cached greeting from getMemoryGreeting */
    expect(result).toBe(brief);
  });

  it('subscribe to scheduler events', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const scheduler = callMock(mockEngine, 'getScheduler') as {
      registerTask: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
    };
    expect(scheduler.registerTask).toHaveBeenCalled();
    expect(scheduler.on).toHaveBeenCalledWith('focus-change', expect.any(Function));
    expect(scheduler.on).toHaveBeenCalledWith('app-opened', expect.any(Function));
    expect(scheduler.on).toHaveBeenCalledWith('task-completed', expect.any(Function));
  });

  it('cleanup clears bridge and unsubscribes events', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    const cleanup = bridgeArunaEngine(
      mockEngine as unknown as ArunaEngine,
      mockCore as unknown as ArunaCore,
    );

    cleanup();

    expect(mockCore.clearEngineBridge).toHaveBeenCalled();
  });

  it('bridges frontend activity observations to engine', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    /* Trigger observeActivity through the patched method */
    const observeActivityFn = (
      (mockCore as Record<string, unknown>).learner as Record<string, unknown>
    ).observeActivity as (type: string, data: Record<string, unknown>) => void;

    /* module-open event */
    observeActivityFn('module-open', { moduleId: 'arunaos.files' });
    const ms = callMock(mockEngine, 'getMemoryStore') as { getAppUsage: ReturnType<typeof vi.fn> };
    expect(ms.getAppUsage).toHaveBeenCalledWith('arunaos.files', expect.any(String));

    const scheduler2 = callMock(mockEngine, 'getScheduler') as { emit: ReturnType<typeof vi.fn> };
    expect(scheduler2.emit).toHaveBeenCalledWith('app-opened', { appId: 'arunaos.files' });
  });

  it('forwards engine notifications to frontend notification store', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    /* Get the callback registered with onNotification */
    const nh = callMock(mockEngine, 'getNotificationHub') as {
      onNotification: ReturnType<typeof vi.fn>;
      push: ReturnType<typeof vi.fn>;
    };
    expect(nh.onNotification).toHaveBeenCalledOnce();

    /* The callback was registered; simulate an engine notification */
    const registeredCallback = nh.onNotification.mock.calls[0]?.[0] as (n: {
      id: string;
      title: string;
      body: string;
      priority: string;
      source: string;
      timestamp: number;
      read: boolean;
    }) => void;
    expect(registeredCallback).toBeInstanceOf(Function);

    registeredCallback({
      id: 'test-1',
      title: 'Test',
      body: 'Body test',
      priority: 'high',
      source: 'assistant',
      timestamp: Date.now(),
      read: false,
    });

    expect(mockNotifAdd).toHaveBeenCalledOnce();
    expect(mockNotifAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-1',
        type: 'warning',
        message: 'Test: Body test',
        toast: true,
      }),
    );
  });

  it('registers proactive scheduler tasks', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const scheduler = callMock(mockEngine, 'getScheduler') as {
      registerTask: ReturnType<typeof vi.fn>;
    };

    /* Should have registered at least: morning brief, midday check, evening reflection,
       suggestion refresh, proactive morning notification, proactive idle notification */
    const registeredIds = scheduler.registerTask.mock.calls.map(
      (c: unknown[]) => (c[0] as { id: string }).id,
    );
    expect(registeredIds).toContain('proactive-morning-notification');
    expect(registeredIds).toContain('proactive-idle-notification');
    expect(registeredIds).toContain('assistant-morning-brief');
    expect(registeredIds).toContain('assistant-midday-check');
    expect(registeredIds).toContain('assistant-evening-reflection');
    expect(registeredIds).toContain('assistant-suggestion-refresh');
  });

  it('asks AI prompt is wrapped to push notification hub entry', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    /* Check that setState was called with wrapped askAI */
    expect(mockSetState).toHaveBeenCalledOnce();
    const newState = mockSetState.mock.calls[0]?.[0] as { askAI: (p: string) => void };
    expect(newState.askAI).toBeDefined();

    /* Simulate askAI call with prompt */
    newState.askAI('What is the weather?');

    /* Original askAI should have been called */
    expect(mockAskAI).toHaveBeenCalledWith('What is the weather?');

    /* NotificationHub should have been pushed */
    const nh2 = callMock(mockEngine, 'getNotificationHub') as { push: ReturnType<typeof vi.fn> };
    expect(nh2.push).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AI Query',
        body: 'What is the weather?',
        source: 'assistant',
      }),
    );
  });

  it('restores original askAI on cleanup', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    const cleanup = bridgeArunaEngine(
      mockEngine as unknown as ArunaEngine,
      mockCore as unknown as ArunaCore,
    );

    cleanup();

    /* setState should be called again to restore original askAI */
    const restoreCalls = mockSetState.mock.calls.filter(
      (c: unknown[]) => (c[0] as Record<string, unknown>)?.askAI === mockAskAI,
    );
    expect(restoreCalls.length).toBe(1);
  });

  it('briefHook sets greeting from cached value', async () => {
    const { bridgeArunaEngine } = await import('./engine-bridge');

    bridgeArunaEngine(mockEngine as unknown as ArunaEngine, mockCore as unknown as ArunaCore);

    const hook = capturedHooks.briefHook as (brief: DailyBrief) => DailyBrief;
    expect(hook).toBeDefined();

    /* First call — no cache yet, falls back to synchronous template greeting */
    const brief: DailyBrief = {
      greeting: 'Good Morning, User',
      timeOfDay: 'morning',
      weather: 'Cuaca hari ini 28° Cerah di Jakarta',
      calendarSummary: '',
      emailSummary: '',
      pendingTasks: 0,
      focusRecommendation: 'Fokus pada prioritas utama',
      message: 'Pagi yang baik',
    };

    const firstResult = hook(brief);
    /* Should fall back to synchronous template engine greeting when cache is empty */
    expect(firstResult).toBe(brief);
    expect(firstResult.greeting).not.toBe('Good Morning, User');
    expect(firstResult.greeting).toMatch(/^Selamat pagi/);

    /* After the async getMemoryGreeting resolves, subsequent calls should use cached value */
    await vi.waitFor(() => {
      const secondBrief: DailyBrief = {
        greeting: 'Good Morning, User',
        timeOfDay: 'morning',
        weather: 'Cuaca hari ini 28° Cerah di Jakarta',
        calendarSummary: '',
        emailSummary: '',
        pendingTasks: 0,
        focusRecommendation: 'Fokus pada prioritas utama',
        message: 'Pagi yang baik',
      };
      const secondResult = hook(secondBrief);
      expect(secondResult.greeting).toBe('Selamat pagi! Ini dari memori.');
    });
  });
});
