import { ContextEngine } from './context-engine';
import { MemoryEngine } from './memory-engine';
import { PersonalityEngine } from './personality-engine';
import { IntentEngine } from './intent-engine';
import { ToolCallingEngine } from './tool-calling-engine';
import { AssistantStateMachine } from './state-machine';
import { PlanningEngine } from './planner';
import { RuntimeController } from './runtime-controller';
import { LearningEngine } from './learner';
import { ReflectionEngine } from './reflector';
import { AIProviderRegistryImpl } from './ai-provider';
import type {
  AIProviderRegistry,
  ArunaEngine,
  DailyBrief,
  DailyReflection,
  Intent,
  Memory,
  MemoryCategory,
  MemoryQuery,
  OperatingMode,
  ProductivitySummary,
  Suggestion,
  SystemContext,
} from './types';

export class ArunaCore {
  private engines: Map<string, ArunaEngine> = new Map();
  private _mode: OperatingMode = 'observe';
  private briefListeners: Array<(brief: DailyBrief) => void> = [];
  private contextListeners: Array<(ctx: SystemContext) => void> = [];
  private _initialized = false;
  private _openModule: ((id: string) => Promise<void>) | null = null;

  private _safeOpenModule(id: string): void {
    this._openModule?.(id).catch((e) => console.warn('[ArunaCore] openModule failed:', id, e));
  }

  /* Engine bridge */
  private _engineBridge: {
    rememberHook?: (
      content: string,
      category: MemoryCategory,
      metadata?: Record<string, string>,
    ) => void;
    suggestionsHook?: (suggestions: Suggestion[]) => Suggestion[] | Promise<Suggestion[]>;
    briefHook?: (brief: DailyBrief | null) => DailyBrief | null;
  } | null = null;

  /* Expose engines as readonly */
  readonly context: ContextEngine;
  readonly memory: MemoryEngine;
  readonly personality: PersonalityEngine;
  readonly intent: IntentEngine;
  readonly tools: ToolCallingEngine;
  readonly state: AssistantStateMachine;
  readonly planner: PlanningEngine;
  readonly runtime: RuntimeController;
  readonly learner: LearningEngine;
  readonly reflector: ReflectionEngine;
  readonly providers: AIProviderRegistry;

  constructor() {
    this.context = new ContextEngine();
    this.memory = new MemoryEngine();
    this.personality = new PersonalityEngine();
    this.intent = new IntentEngine();
    this.tools = new ToolCallingEngine();
    this.state = new AssistantStateMachine();
    this.planner = new PlanningEngine();
    this.runtime = new RuntimeController();
    this.learner = new LearningEngine();
    this.reflector = new ReflectionEngine();
    this.providers = new AIProviderRegistryImpl();

    this.engines.set('context', this.context);
    this.engines.set('memory', this.memory);
    this.engines.set('personality', this.personality);
    this.engines.set('intent', this.intent);
    this.engines.set('tools', this.tools);
    this.engines.set('state', this.state);
    this.engines.set('planner', this.planner);
    this.engines.set('runtime', this.runtime);
    this.engines.set('learner', this.learner);
    this.engines.set('reflector', this.reflector);
  }

  get initialized(): boolean {
    return this._initialized;
  }

  get mode(): OperatingMode {
    return this._mode;
  }

  /* ── Lifecycle ─────────────────────────────────────── */

  async init(container?: { get: (name: string) => unknown }) {
    if (this._initialized) return;

    // Register context listener BEFORE engine init so it catches initial snapshot
    this.context.onContextChange((ctx) => {
      for (const fn of this.contextListeners) {
        try {
          fn(ctx);
        } catch {
          /* isolate listener failure */
        }
      }

      this.memory.remember(
        `System context: ${ctx.time.timeOfDay}, weather: ${ctx.weather?.condition ?? 'unknown'}`,
        'short-term',
        { hour: String(ctx.time.hour) },
      );

      this.learner.observeActivity('context-change', {
        timeOfDay: ctx.time.timeOfDay,
        hour: String(ctx.time.hour),
      });
    });

    const initErrors: Array<{ name: string; error: unknown }> = [];
    for (const [name, engine] of this.engines) {
      try {
        await engine.init();
      } catch (e) {
        initErrors.push({ name, error: e });
      }
    }
    if (initErrors.length > 0) {
      console.warn('[ArunaCore] Some engines failed to init:', initErrors);
    }
    if (container) {
      this.tools.connect(container);
      this.runtime.bridge.connect(container);
      try {
        const mw = container.get('moduleWindow') as { openModule: (id: string) => Promise<void> };
        if (mw?.openModule) this._openModule = mw.openModule.bind(mw);
      } catch {
        /* ignore */
      }
    }

    await this.state.transition('observing', 'System initialized');

    this._initialized = true;
  }

  destroy() {
    try {
      this.state.reset();
    } catch {
      /* ignore */
    }
    for (const [name, engine] of this.engines) {
      try {
        engine.destroy();
      } catch (e) {
        console.warn('[ArunaCore] Engine destroy failed:', name, e);
      }
    }
    this.contextListeners = [];
    this.briefListeners = [];
    this._openModule = null;
    this._initialized = false;
  }

  /* ── Context ───────────────────────────────────────── */

  onContextChange(fn: (ctx: SystemContext) => void) {
    this.contextListeners.push(fn);
    return () => {
      this.contextListeners = this.contextListeners.filter((l) => l !== fn);
    };
  }

  getCurrentContext(): SystemContext | null {
    return this.context.current;
  }

  /* ── Engine Bridge ─────────────────────────────────── */

  bridgeEngine(hooks: {
    rememberHook?: (
      content: string,
      category: MemoryCategory,
      metadata?: Record<string, string>,
    ) => void;
    suggestionsHook?: (suggestions: Suggestion[]) => Suggestion[] | Promise<Suggestion[]>;
    briefHook?: (brief: DailyBrief | null) => DailyBrief | null;
  }): void {
    this._engineBridge = hooks;
  }

  clearEngineBridge(): void {
    this._engineBridge = null;
  }

  /* ── Mode ──────────────────────────────────────────── */

  setMode(mode: OperatingMode) {
    this._mode = mode;
  }

  /* ── Daily Brief ───────────────────────────────────── */

  generateBrief(): DailyBrief | null {
    const ctx = this.context.current;
    if (!ctx) return null;
    const brief = this.personality.generateDailyBrief(ctx);

    this.remember(`Daily brief: ${brief.greeting} — ${brief.message}`, 'episodic', {
      date: new Date().toISOString().slice(0, 10),
    });

    const hooked = this._engineBridge?.briefHook?.(brief) ?? brief;
    for (const fn of this.briefListeners) {
      try {
        fn(hooked);
      } catch {
        /* isolate listener failure */
      }
    }
    return hooked;
  }

  onBrief(fn: (brief: DailyBrief) => void) {
    this.briefListeners.push(fn);
    return () => {
      this.briefListeners = this.briefListeners.filter((l) => l !== fn);
    };
  }

  /* ── Daily Reflection ──────────────────────────────── */

  generateDailyReflection(): DailyReflection | null {
    const ctx = this.context.current;
    if (!ctx) return null;
    return this.reflector.generateDailyReflection(ctx, this.memory);
  }

  getProductivitySummary(): ProductivitySummary | null {
    const ctx = this.context.current;
    if (!ctx) return null;
    return this.reflector.getProductivitySummary(ctx, this.memory);
  }

  /* ── Intent & Planning ─────────────────────────────── */

  processInput(text: string): { intent: Intent; planId?: string } {
    const intent = this.intent.recognize(text);

    this.memory.remember(
      `User: "${text}" → intent: ${intent.type} (${Math.round(intent.confidence * 100)}%)`,
      'short-term',
      { type: intent.type },
    );

    this.learner.observeActivity('input', { text, intent: intent.type });

    // Create plan for recognized intents
    if (intent.type !== 'unknown' && intent.confidence > 0.5) {
      const plan = this.planner.createPlan(intent);
      return { intent, planId: plan.id };
    }

    return { intent };
  }

  async executeIntent(intent: Intent, planId?: string): Promise<string> {
    if (planId) {
      await this.state.transition('planning', `Planning for ${intent.type}`);
      const executed = await this.planner.executeNextStep(planId);
      if (executed) {
        await this.state.transition('executing', `Executing ${intent.type}`);
        const response = await this.tools.executeIntent(intent.type, intent.entities);
        await this.state.transition('observing', 'Execution complete');
        return response;
      }
    }
    return this.tools.executeIntent(intent.type, intent.entities);
  }

  /* ── Suggestions ───────────────────────────────────── */

  remember(content: string, category: MemoryCategory, metadata?: Record<string, string>): Memory {
    const mem = this.memory.remember(content, category, metadata);
    this._engineBridge?.rememberHook?.(content, category, metadata);
    return mem;
  }

  recall(query: MemoryQuery): Memory[] {
    return this.memory.recall(query);
  }

  generateSuggestions(): Suggestion[] {
    const ctx = this.context.current;
    const recentMemory = this.memory.recallByCategory('short-term', 3);
    const hasFocusWork = recentMemory.some(
      (m) => m.content.toLowerCase().includes('focus') || m.content.toLowerCase().includes('build'),
    );

    const suggestions: Suggestion[] = [];

    const timeOfDay = ctx?.time.timeOfDay ?? 'morning';
    const hour = ctx?.time.hour ?? 8;
    const dayOfWeek = ctx?.time.dayOfWeek ?? 1;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weather = ctx?.weather;
    const condition = weather?.condition?.toLowerCase() ?? '';
    const RAIN_KW = ['rain', 'drizzle', 'thunder', 'sleet'];
    const isRainy = RAIN_KW.some((kw) => condition.includes(kw));
    const isCold = (weather?.temp ?? 25) < 20;

    suggestions.push({
      id: 'daily-brief',
      icon: 'sparkles',
      title: 'Daily Brief',
      description: ctx ? `${timeOfDay} overview — ${ctx.time.date}` : 'Start your day',
      estimatedTime: '~1m',
      action: () => {
        this.generateBrief();
      },
    });

    if (hasFocusWork) {
      suggestions.push({
        id: 'continue-work',
        icon: 'sparkles',
        title: 'Continue Work',
        description: 'You were working on this recently',
        estimatedTime: '~2h',
        action: () => this._safeOpenModule('arunaos.files'),
      });
    }

    suggestions.push({
      id: 'check-weather',
      icon: 'sun',
      title: 'Check Weather',
      description: weather
        ? `${weather.temp}° ${weather.condition}${isRainy ? ' — bawa payung!' : isCold ? ' — cuaca dingin' : ''}`
        : "Today's forecast",
      estimatedTime: '~1m',
      action: () => this._safeOpenModule('arunaos.weather'),
    });

    if (timeOfDay === 'morning' && hour >= 4 && hour < 9) {
      suggestions.push({
        id: 'morning-routine',
        icon: 'sun',
        title: isWeekend ? 'Weekend Pagi' : 'Morning Routine',
        description: isWeekend
          ? 'Santai saja, akhir pekan!'
          : isRainy
            ? 'Mulai hari dengan segelas kopi hangat'
            : 'Semangat pagi! Saatnya produktif',
        estimatedTime: '~15m',
        action: () => {},
      });
    }

    if (timeOfDay === 'afternoon' && hour >= 12 && hour < 14) {
      suggestions.push({
        id: 'lunch-break',
        icon: 'sun',
        title: 'Istirahat Siang',
        description: isRainy
          ? 'Cocok makan sambil dengerin musik'
          : 'Sempatkan jalan-jalan sebentar',
        estimatedTime: '~30m',
        action: () => {},
      });
    }

    if (timeOfDay === 'afternoon' && hour >= 14 && hour < 17) {
      suggestions.push({
        id: 'afternoon-focus',
        icon: 'sparkles',
        title: 'Sesi Fokus Sore',
        description: 'Selesaikan tugas utama sebelum hari berganti',
        estimatedTime: '~1h',
        action: () => this._safeOpenModule('arunaos.files'),
      });
    }

    if (timeOfDay === 'evening' || timeOfDay === 'night') {
      suggestions.push({
        id: 'daily-reflection',
        icon: 'sparkles',
        title: 'Daily Reflection',
        description: 'Review what you accomplished today',
        estimatedTime: '~5m',
        action: () => this.generateDailyReflection(),
      });

      if (hour >= 20 || hour < 4) {
        suggestions.push({
          id: 'wind-down',
          icon: 'calendar',
          title: 'Waktunya Istirahat',
          description: 'Matikan layar, siapkan diri untuk tidur',
          estimatedTime: '~10m',
          action: () => {},
        });
      }
    }

    if (isWeekend && timeOfDay === 'morning') {
      suggestions.push({
        id: 'weekend-plan',
        icon: 'calendar',
        title: 'Weekend Plan',
        description: 'Rencanakan kegiatan akhir pekanmu',
        estimatedTime: '~5m',
        action: () => {},
      });
    }

    if (isRainy) {
      suggestions.push({
        id: 'rainy-activity',
        icon: 'mail',
        title: 'Aktivitas Indoor',
        description: 'Hujan di luar — cocok untuk baca atau nulis',
        estimatedTime: '~30m',
        action: () => {},
      });
    }

    if (weather && !isRainy && !isCold && (timeOfDay === 'morning' || timeOfDay === 'afternoon')) {
      suggestions.push({
        id: 'outdoor-suggestion',
        icon: 'sun',
        title: 'Cuaca Cerah',
        description: `${weather.temp}° — cocok untuk aktivitas luar ruangan`,
        estimatedTime: '~15m',
        action: () => {},
      });
    }

    const prefs = this.learner.getPreferences();
    const topModule = prefs.favoriteModules[0];
    if (topModule) {
      suggestions.push({
        id: 'frequent-module',
        icon: 'sparkles',
        title: `Open ${topModule.name}`,
        description: `Your most used module (${topModule.usageCount}x)`,
        estimatedTime: '~1m',
        action: () =>
          this._safeOpenModule(
            topModule.id.startsWith('arunaos.') ? topModule.id : `arunaos.${topModule.id}`,
          ),
      });
    }

    const sliced = suggestions.slice(0, 6);
    const hooked = this._engineBridge?.suggestionsHook?.(sliced);
    if (hooked instanceof Promise) {
      hooked.catch((e) => console.warn('[ArunaCore] suggestionsHook promise failed:', e));
      return sliced;
    }
    return hooked ?? sliced;
  }
}

/* Singleton instance */
let _instance: ArunaCore | null = null;

export function getArunaCore(): ArunaCore {
  if (!_instance) {
    _instance = new ArunaCore();
  }
  return _instance;
}

export function resetArunaCore(): void {
  if (_instance) {
    _instance.destroy();
    _instance = null;
  }
}
