import { TemplateEngine, type EngineContext } from '../engine/template-engine';
import { ContextAggregator } from '../context/context-aggregator';
import { HabitLearner, type HabitInsight } from '../memory/habit-learner';
import type { MemoryStore } from '../memory/memory-store';

export interface AgentObservation {
  context: EngineContext;
  insights: HabitInsight[];
  events: string[];
}

export interface AgentAction {
  type: 'greeting' | 'suggestion' | 'proactive_tip';
  payload: string;
  priority: number;
}

export class Observer {
  private aggregator: ContextAggregator;
  private learner: HabitLearner;

  constructor(aggregator: ContextAggregator, store: MemoryStore) {
    this.aggregator = aggregator;
    this.learner = new HabitLearner(store);
  }

  async observe(): Promise<AgentObservation> {
    const context = await this.aggregator.buildEngineContext();
    const insights = await this.learner.getInsights();
    return {
      context,
      insights,
      events: [],
    };
  }
}

export class Reasoner {
  private template: TemplateEngine;
  private proactiveMode: 'passive' | 'balanced' | 'active';

  constructor(mode: 'passive' | 'balanced' | 'active') {
    this.template = new TemplateEngine();
    this.proactiveMode = mode;
  }

  async reason(observation: AgentObservation): Promise<AgentAction[]> {
    const actions: AgentAction[] = [];

    if (this.proactiveMode === 'passive') return actions;

    const { context, insights } = observation;

    // Priority 1: task-related suggestions (if many tasks pending)
    if (context.tasks) {
      const remaining = context.tasks.total - context.tasks.done;
      if (remaining > 3) {
        actions.push({
          type: 'suggestion',
          payload:
            this.template.generateSuggestion(context) ?? `Kamu punya ${remaining} tugas tersisa.`,
          priority: 3,
        });
      }
    }

    // Priority 2: habit-based proactive tips (only in active/balanced mode)
    if (insights.length > 0) {
      for (const insight of insights.slice(0, 2)) {
        if (insight.confidence > 0.5) {
          actions.push({
            type: 'proactive_tip',
            payload: insight.description,
            priority: 2,
          });
        }
      }
    }

    // Priority 3: greeting (only for balanced or active)
    const tod = this.template.getTimeOfDay(context.date);
    const isMorning = tod === 'pagi';
    if (isMorning) {
      const greeting = this.template.generateGreeting(context);
      actions.push({
        type: 'greeting',
        payload: greeting.greeting,
        priority: 1,
      });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }
}

export class Actor {
  private listeners: Array<(action: AgentAction) => void> = [];

  onAction(listener: (action: AgentAction) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async execute(action: AgentAction): Promise<void> {
    for (const listener of this.listeners) {
      listener(action);
    }
  }
}

export class AgentPipeline {
  private observer: Observer;
  private reasoner: Reasoner;
  private actor: Actor;
  constructor(
    aggregator: ContextAggregator,
    store: MemoryStore,
    mode: 'passive' | 'balanced' | 'active',
  ) {
    this.observer = new Observer(aggregator, store);
    this.reasoner = new Reasoner(mode);
    this.actor = new Actor();
  }

  getActor(): Actor {
    return this.actor;
  }

  async runOnce(): Promise<AgentAction[]> {
    const observation = await this.observer.observe();
    const actions = await this.reasoner.reason(observation);
    for (const action of actions) {
      await this.actor.execute(action);
    }
    return actions;
  }

  async start(): Promise<void> {
    const observation = await this.observer.observe();
    const actions = await this.reasoner.reason(observation);
    for (const action of actions) {
      await this.actor.execute(action);
    }
  }

  stop(): void {
    // no-op for now
  }
}
