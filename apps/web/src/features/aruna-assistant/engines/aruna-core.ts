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
      this.contextListeners.forEach((fn) => fn(ctx));

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

    for (const engine of this.engines.values()) {
      await engine.init();
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
    this.state.reset();
    for (const engine of this.engines.values()) {
      engine.destroy();
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

  /* ── Mode ──────────────────────────────────────────── */

  setMode(mode: OperatingMode) {
    this._mode = mode;
  }

  /* ── Daily Brief ───────────────────────────────────── */

  generateBrief(): DailyBrief | null {
    const ctx = this.context.current;
    if (!ctx) return null;
    const brief = this.personality.generateDailyBrief(ctx);

    this.memory.remember(`Daily brief: ${brief.greeting} — ${brief.message}`, 'episodic', {
      date: new Date().toISOString().slice(0, 10),
    });

    this.briefListeners.forEach((fn) => fn(brief));
    return brief;
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

  /* ── Memory ────────────────────────────────────────── */

  remember(content: string, category: MemoryCategory, metadata?: Record<string, string>): Memory {
    return this.memory.remember(content, category, metadata);
  }

  recall(query: MemoryQuery): Memory[] {
    return this.memory.recall(query);
  }

  /* ── Suggestions ───────────────────────────────────── */

  generateSuggestions(): Suggestion[] {
    const ctx = this.context.current;
    const recentMemory = this.memory.recallByCategory('short-term', 3);
    const hasFocusWork = recentMemory.some(
      (m) => m.content.toLowerCase().includes('focus') || m.content.toLowerCase().includes('build'),
    );

    const suggestions: Suggestion[] = [];

    suggestions.push({
      id: 'daily-brief',
      icon: 'sparkles',
      title: 'Daily Brief',
      description: ctx ? `${ctx.time.timeOfDay} overview` : 'Start your day',
      estimatedTime: '~1m',
      action: () => this.generateBrief(),
    });

    if (hasFocusWork) {
      suggestions.push({
        id: 'continue-work',
        icon: 'sparkles',
        title: 'Continue Work',
        description: 'You were working on this recently',
        estimatedTime: '~2h',
        action: () => this._openModule?.('arunaos.files'),
      });
    }

    suggestions.push({
      id: 'check-weather',
      icon: 'sun',
      title: 'Check Weather',
      description: ctx?.weather
        ? `${ctx.weather.temp}° ${ctx.weather.condition}`
        : "Today's forecast",
      estimatedTime: '~1m',
      action: () => this._openModule?.('arunaos.weather'),
    });

    if (ctx?.time.timeOfDay === 'evening' || ctx?.time.timeOfDay === 'night') {
      suggestions.push({
        id: 'daily-reflection',
        icon: 'sparkles',
        title: 'Daily Reflection',
        description: 'Review what you accomplished today',
        estimatedTime: '~5m',
        action: () => this.generateDailyReflection(),
      });
    }

    // Add reflection-based suggestions
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
          this._openModule?.(
            topModule.id.startsWith('arunaos.') ? topModule.id : `arunaos.${topModule.id}`,
          ),
      });
    }

    return suggestions;
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
