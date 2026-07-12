import { TemplateEngine, type GreetingResult } from './engine/template-engine';
import { ContextAggregator } from './context/context-aggregator';
import { InMemoryStore, type MemoryStore } from './memory/memory-store';
import { HabitLearner } from './memory/habit-learner';
import { MemoryGraphOptimizer } from './memory/memory-graph-optimizer';
import { Scheduler } from './engine/scheduler';
import { AgentPipeline, type AgentAction } from './engine/agent-pipeline';
import { FeedbackLoop } from './engine/feedback-loop';
import { FileSystemContext } from './integration/file-system-context';
import { WindowObserver } from './integration/window-observer';
import { NotificationHub, type SystemNotification } from './integration/notification-hub';
import { ModuleAIApi, type ModuleCapability } from './integration/module-ai-api';

export type EngineStatus = 'booting' | 'ready' | 'active' | 'sleeping';

export type ProactiveMode = 'passive' | 'balanced' | 'active';

export interface ArunaEngineConfig {
  memoryStore?: MemoryStore;
  proactiveMode?: ProactiveMode;
}

export class ArunaEngine {
  private templateEngine: TemplateEngine;
  private contextAggregator: ContextAggregator;
  private memoryStore: MemoryStore;
  private status: EngineStatus = 'booting';
  private proactiveMode: ProactiveMode;
  private listeners: Array<(status: EngineStatus) => void> = [];

  private habitLearner!: HabitLearner;
  private memoryGraphOptimizer!: MemoryGraphOptimizer;
  private scheduler!: Scheduler;
  private agentPipeline!: AgentPipeline;
  private feedbackLoop!: FeedbackLoop;
  private fileSystemContext!: FileSystemContext;
  private windowObserver!: WindowObserver;
  private notificationHub!: NotificationHub;
  private moduleAIApi!: ModuleAIApi;

  private actionListeners: Array<(action: AgentAction) => void> = [];

  constructor(config: ArunaEngineConfig = {}) {
    this.templateEngine = new TemplateEngine();
    this.memoryStore = config.memoryStore ?? new InMemoryStore();
    this.contextAggregator = new ContextAggregator(this.memoryStore);
    this.proactiveMode = config.proactiveMode ?? 'balanced';
  }

  async boot(): Promise<void> {
    this.status = 'booting';
    this.notify();

    // Initialize engine subsystems
    this.habitLearner = new HabitLearner(this.memoryStore);
    this.memoryGraphOptimizer = new MemoryGraphOptimizer(this.memoryStore);
    this.scheduler = new Scheduler();
    this.agentPipeline = new AgentPipeline(
      this.contextAggregator,
      this.memoryStore,
      this.proactiveMode,
    );
    this.feedbackLoop = new FeedbackLoop(this);
    this.fileSystemContext = new FileSystemContext();
    this.windowObserver = new WindowObserver(this.memoryStore);
    this.notificationHub = new NotificationHub();
    this.moduleAIApi = new ModuleAIApi();

    // Wire agent actions to external listeners
    this.agentPipeline.getActor().onAction((action) => {
      for (const listener of this.actionListeners) {
        listener(action);
      }
    });

    // Initialize user profile if needed
    const user = await this.memoryStore.getUser();
    if (!user) {
      await this.memoryStore.saveUser({
        id: 'default',
        name: 'User',
        createdAt: Date.now(),
        preferences: {
          language: 'id',
          proactiveMode: this.proactiveMode,
          theme: 'system',
        },
      });
    }

    this.status = 'ready';
    this.notify();
  }

  async activate(): Promise<void> {
    this.status = 'active';
    this.notify();

    // Track session
    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.memoryStore.getTodaySession();
    if (!existing) {
      await this.memoryStore.saveSession({
        id: `session-${today}`,
        date: today,
        startTime: Date.now(),
        greetingShown: false,
        tasksCompleted: 0,
        mood: null,
      });
    }

    // Start feedback loop
    this.feedbackLoop.start();

    // Start scheduler
    this.scheduler.registerTask({
      id: 'morning-briefing',
      schedule: 'daily-morning',
      action: async () => {
        await this.agentPipeline.runOnce();
      },
      lastRun: 0,
    });

    this.scheduler.registerTask({
      id: 'habit-flush',
      schedule: 'every-30min',
      action: async () => {
        await this.windowObserver.flush();
      },
      lastRun: 0,
    });

    this.scheduler.start();

    // Run initial agent pipeline
    await this.agentPipeline.start();
  }

  async sleep(): Promise<void> {
    this.status = 'sleeping';
    this.notify();
    this.scheduler.stop();
    this.agentPipeline.stop();
    await this.windowObserver.flush();
  }

  async wake(): Promise<void> {
    this.status = 'active';
    this.notify();
    this.scheduler.start();
    await this.agentPipeline.start();
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  onStatusChange(listener: (status: EngineStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  onAction(listener: (action: AgentAction) => void): () => void {
    this.actionListeners.push(listener);
    return () => {
      this.actionListeners = this.actionListeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.status);
    }
  }

  getContextAggregator(): ContextAggregator {
    return this.contextAggregator;
  }

  getTemplateEngine(): TemplateEngine {
    return this.templateEngine;
  }

  getMemoryStore(): MemoryStore {
    return this.memoryStore;
  }

  getHabitLearner(): HabitLearner {
    return this.habitLearner;
  }

  getMemoryGraphOptimizer(): MemoryGraphOptimizer {
    return this.memoryGraphOptimizer;
  }

  getFeedbackLoop(): FeedbackLoop {
    return this.feedbackLoop;
  }

  getScheduler(): Scheduler {
    return this.scheduler;
  }

  getAgentPipeline(): AgentPipeline {
    return this.agentPipeline;
  }

  getFileSystemContext(): FileSystemContext {
    return this.fileSystemContext;
  }

  getWindowObserver(): WindowObserver {
    return this.windowObserver;
  }

  getNotificationHub(): NotificationHub {
    return this.notificationHub;
  }

  getModuleAIApi(): ModuleAIApi {
    return this.moduleAIApi;
  }

  async generateGreeting(): Promise<GreetingResult> {
    const ctx = await this.contextAggregator.buildEngineContext();
    return this.templateEngine.generateGreeting(ctx);
  }

  async generateSuggestion(): Promise<string | null> {
    const ctx = await this.contextAggregator.buildEngineContext();
    return this.templateEngine.generateSuggestion(ctx);
  }

  async generateMoodSuggestion(): Promise<string> {
    const ctx = await this.contextAggregator.buildEngineContext();
    return this.templateEngine.generateMoodSuggestion(ctx);
  }

  async getInsights() {
    return this.habitLearner.getInsights();
  }

  async saveMood(mood: string): Promise<void> {
    const session = await this.memoryStore.getTodaySession();
    if (session) {
      session.mood = mood;
      await this.memoryStore.saveSession(session);
    }
  }

  async getMemoryGreeting(): Promise<{ greeting: string; memoryNote?: string }> {
    const ctx = await this.contextAggregator.buildEngineContext();
    const greeting = this.templateEngine.generateGreeting(ctx);
    const insights = await this.habitLearner.getInsights();
    const sessions = await this.memoryStore.getRecentSessions(2);

    let memoryNote: string | undefined;
    if (sessions.length > 1 && sessions[1]) {
      const yesterday = sessions[1];
      if (yesterday.tasksCompleted > 0) {
        memoryNote = `Kemarin kamu menyelesaikan ${yesterday.tasksCompleted} tugas.`;
      }
    } else if (sessions.length === 1 && (sessions[0]?.tasksCompleted ?? 0) > 0) {
      const todaySession = sessions[0]!;
      memoryNote = `Sejauh ini kamu sudah menyelesaikan ${todaySession.tasksCompleted} tugas hari ini.`;
    }

    if (insights.length > 0 && !memoryNote && insights[0]) {
      memoryNote = insights[0].description;
    }

    return { greeting: greeting.greeting, memoryNote };
  }

  pushNotification(
    title: string,
    body: string,
    source: string,
    priority?: 'low' | 'normal' | 'high' | 'urgent',
  ): SystemNotification {
    return this.notificationHub.push({ title, body, source, priority: priority ?? 'normal' });
  }

  registerCapability(capability: ModuleCapability): void {
    this.moduleAIApi.registerCapability(capability);
  }
}
