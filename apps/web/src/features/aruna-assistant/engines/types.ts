/* ------------------------------------------------------------------ */
/*  Aruna Core Types                                                  */
/* ------------------------------------------------------------------ */

export type OperatingMode = 'observe' | 'assist' | 'act';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type MemoryCategory = 'short-term' | 'long-term' | 'semantic' | 'episodic';

/* ------------------------------------------------------------------ */
/*  Memory                                                             */
/* ------------------------------------------------------------------ */

export interface Memory {
  id: string;
  category: MemoryCategory;
  content: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

export interface MemoryQuery {
  category?: MemoryCategory;
  keywords?: string[];
  limit?: number;
  since?: number;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

export interface SystemContext {
  time: {
    hour: number;
    minute: number;
    dayOfWeek: number;
    date: string;
    timeOfDay: TimeOfDay;
  };
  weather: {
    temp: number;
    condition: string;
    icon: string;
    city: string;
  } | null;
  workspace: {
    activeModules: string[];
    focusedWindow: string | null;
  };
  notifications: {
    total: number;
    important: number;
  };
  system: {
    battery: number | null;
    network: string;
    uptime: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Intent                                                             */
/* ------------------------------------------------------------------ */

export type IntentType =
  | 'open-module'
  | 'search'
  | 'ask-info'
  | 'create-task'
  | 'set-reminder'
  | 'change-setting'
  | 'greeting'
  | 'unknown';

export interface Intent {
  type: IntentType;
  confidence: number;
  entities: Record<string, string>;
  raw: string;
}

/* ------------------------------------------------------------------ */
/*  Tool / Action                                                      */
/* ------------------------------------------------------------------ */

export interface ToolAction {
  id: string;
  name: string;
  description: string;
  execute: (params: Record<string, string>) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Personality                                                        */
/* ------------------------------------------------------------------ */

export interface PersonalityConfig {
  greeting: string;
  tone: 'calm' | 'warm' | 'professional';
  timeBasedMessages: Record<TimeOfDay, string[]>;
}

/* ------------------------------------------------------------------ */
/*  Suggestion                                                         */
/* ------------------------------------------------------------------ */

export interface Suggestion {
  id: string;
  icon: string;
  title: string;
  description: string;
  estimatedTime: string;
  action: () => void;
}

/* ------------------------------------------------------------------ */
/*  Daily Brief                                                        */
/* ------------------------------------------------------------------ */

export interface DailyBrief {
  greeting: string;
  timeOfDay: TimeOfDay;
  weather: string;
  calendarSummary: string;
  emailSummary: string;
  pendingTasks: number;
  focusRecommendation: string;
  message: string;
  userName?: string;
}

/* ------------------------------------------------------------------ */
/*  Engine Interface                                                   */
/* ------------------------------------------------------------------ */

export interface ArunaEngine {
  name: string;
  init: () => Promise<void>;
  destroy: () => void;
}

/* ------------------------------------------------------------------ */
/*  Planning / Action Plan                                             */
/* ------------------------------------------------------------------ */

export type PlanStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';

export interface ActionStep {
  id: string;
  action: string;
  params: Record<string, string>;
  dependencies: string[];
  status: PlanStatus;
  result?: string;
  error?: string;
}

export interface ActionPlan {
  id: string;
  intent: IntentType;
  goal: string;
  steps: ActionStep[];
  status: PlanStatus;
  createdAt: number;
  completedAt?: number;
}

export interface PlannerEngine extends ArunaEngine {
  createPlan(intent: Intent): ActionPlan;
  getPlan(id: string): ActionPlan | null;
  getAllPlans(): ActionPlan[];
  executeNextStep(planId: string): Promise<boolean>;
  getBlockedSteps(planId: string): ActionStep[];
}

/* ------------------------------------------------------------------ */
/*  Runtime Controller                                                  */
/* ------------------------------------------------------------------ */

export interface RuntimeBridge {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  connect(container: { get: (name: string) => unknown }): void;
  disconnect(): void;
}

export interface WindowController {
  openWindow(moduleId: string, params?: Record<string, unknown>): Promise<string | null>;
  closeWindow(windowId: string): Promise<void>;
  focusWindow(windowId: string): Promise<void>;
  minimizeWindow(windowId: string): Promise<void>;
  maximizeWindow(windowId: string): Promise<void>;
  getActiveWindows(): string[];
}

export interface ModuleController {
  load(moduleId: string): Promise<boolean>;
  unload(moduleId: string): Promise<boolean>;
  getStatus(moduleId: string): string;
  getLoadedModules(): string[];
  search(query: string): Array<{ id: string; name: string }>;
}

export interface WorkspaceController {
  getCurrent(): string;
  setWorkspace(id: string): Promise<void>;
  getWorkspaces(): Array<{ id: string; name: string }>;
  getSuggestedWorkspace(): string | null;
}

export interface NotificationController {
  send(
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error',
  ): Promise<string>;
  dismiss(id: string): Promise<void>;
  getActive(): Array<{ id: string; title: string; message: string }>;
  getImportantCount(): number;
}

export interface RuntimeControllerEngine extends ArunaEngine {
  bridge: RuntimeBridge;
  window: WindowController;
  module: ModuleController;
  workspace: WorkspaceController;
  notification: NotificationController;
}

/* ------------------------------------------------------------------ */
/*  Learning Engine                                                     */
/* ------------------------------------------------------------------ */

export interface HabitPattern {
  id: string;
  type: 'workspace' | 'time' | 'module' | 'routine';
  pattern: string;
  confidence: number;
  frequency: number;
  lastObserved: number;
}

export interface PreferenceData {
  preferredWorkspaces: string[];
  productiveHours: number[];
  favoriteModules: Array<{ id: string; name: string; usageCount: number }>;
  commonWorkflows: Array<{ name: string; steps: string[]; frequency: number }>;
}

export interface LearnerEngine extends ArunaEngine {
  getPreferences(): PreferenceData;
  getHabits(): HabitPattern[];
  observeActivity(type: string, data: Record<string, string>): void;
  getProductiveHours(): number[];
  getSuggestedWorkflow(): string[] | null;
}

/* ------------------------------------------------------------------ */
/*  Reflection Engine                                                   */
/* ------------------------------------------------------------------ */

export interface DailyReflection {
  date: string;
  tasksCompleted: number;
  tasksPending: number;
  emailsHandled: number;
  activeWorkspaces: string[];
  productiveHours: number;
  focusScore: number;
  summary: string;
  message: string;
}

export interface WeeklyReflection {
  weekStart: string;
  weekEnd: string;
  totalActiveDays: number;
  averageFocusScore: number;
  topWorkspaces: Array<{ id: string; hours: number }>;
  totalTasksCompleted: number;
  reflection: string;
}

export interface ProductivitySummary {
  today: DailyReflection;
  weekly?: WeeklyReflection;
  streak: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface ReflectorEngine extends ArunaEngine {
  generateDailyReflection(
    ctx: SystemContext,
    memory: { recall: (q: MemoryQuery) => Memory[] },
  ): DailyReflection;
  generateWeeklyReflection(
    ctx: SystemContext,
    memory: { recall: (q: MemoryQuery) => Memory[] },
  ): WeeklyReflection;
  getCurrentStreak(): number;
  getProductivitySummary(
    ctx: SystemContext,
    memory: { recall: (q: MemoryQuery) => Memory[] },
  ): ProductivitySummary;
}

/* ------------------------------------------------------------------ */
/*  AI Provider Layer (Contracts Only)                                 */
/* ------------------------------------------------------------------ */

export interface AIProviderConfig {
  model: string;
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  name: string;
  type: 'local' | 'cloud';
  chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config?: Partial<AIProviderConfig>,
  ): Promise<string>;
  stream?(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config?: Partial<AIProviderConfig>,
  ): AsyncIterable<string>;
  embed?(text: string): Promise<number[]>;
  isAvailable(): boolean;
}

export interface AIProviderRegistry {
  register(provider: AIProvider): void;
  get(name: string): AIProvider | null;
  getAvailable(): AIProvider[];
  getDefault(): AIProvider | null;
}

/* ------------------------------------------------------------------ */
/*  Assistant State Machine                                            */
/* ------------------------------------------------------------------ */

export type AssistantState =
  | 'idle'
  | 'observing'
  | 'thinking'
  | 'planning'
  | 'executing'
  | 'speaking'
  | 'listening'
  | 'sleeping';

export interface StateTransition {
  from: AssistantState;
  to: AssistantState;
  reason: string;
  timestamp: number;
}

export interface StateMachineEngine extends ArunaEngine {
  get current(): AssistantState;
  get history(): StateTransition[];
  transition(to: AssistantState, reason: string): Promise<boolean>;
  canTransition(to: AssistantState): boolean;
  onStateChange(fn: (from: AssistantState, to: AssistantState, reason: string) => void): () => void;
  reset(): void;
}
