export { ArunaEngine } from './system-ai-service';
export type { EngineStatus, ProactiveMode, ArunaEngineConfig } from './system-ai-service';

export { TemplateEngine } from './engine/template-engine';
export type { TimeOfDay, EngineContext, GreetingResult } from './engine/template-engine';

export { ContextAggregator } from './context/context-aggregator';
export type { SystemState } from './context/context-aggregator';

export { InMemoryStore } from './memory/memory-store';
export type { MemoryStore } from './memory/memory-store';
export type {
  UserProfile,
  SessionRecord,
  AppUsageRecord,
  ConversationRecord,
  TaskRecord,
} from './memory/entities';

export { HabitLearner } from './memory/habit-learner';
export type { HabitPattern, HabitInsight } from './memory/habit-learner';

export { MemoryGraphOptimizer } from './memory/memory-graph-optimizer';
export type { GraphQuery, GraphQueryResult } from './memory/memory-graph-optimizer';

export { Scheduler } from './engine/scheduler';
export type { CronSchedule, ScheduledTask, SystemEvent, EventHandler } from './engine/scheduler';

export { AgentPipeline, Observer, Reasoner, Actor } from './engine/agent-pipeline';
export type { AgentObservation, AgentAction } from './engine/agent-pipeline';

export { FeedbackLoop } from './engine/feedback-loop';
export type { FeedbackEntry } from './engine/feedback-loop';

export { getSystemContext } from './context/system-context';
export type { SystemContext } from './context/system-context';

export { FileSystemContext } from './integration/file-system-context';
export type { FileAccess } from './integration/file-system-context';

export { WindowObserver } from './integration/window-observer';
export type { WindowFocusRecord } from './integration/window-observer';

export { NotificationHub } from './integration/notification-hub';
export type { SystemNotification, NotificationPriority } from './integration/notification-hub';

export { ModuleAIApi } from './integration/module-ai-api';
export type { ModuleCapability } from './integration/module-ai-api';
