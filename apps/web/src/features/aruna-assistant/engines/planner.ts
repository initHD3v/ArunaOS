import type {
  ActionPlan,
  ActionStep,
  Intent,
  IntentType,
  PlanStatus,
  PlannerEngine,
} from './types';

interface PlanTemplate {
  intent: IntentType;
  goalTemplate: string;
  steps: Array<{
    action: string;
    paramKeys: string[];
    dependencies: number[];
    label: string;
  }>;
}

const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    intent: 'open-module',
    goalTemplate: 'Buka {target}',
    steps: [
      { action: 'open-module', paramKeys: ['target'], dependencies: [], label: 'Open module' },
    ],
  },
  {
    intent: 'search',
    goalTemplate: 'Cari {query}',
    steps: [{ action: 'search-web', paramKeys: ['query'], dependencies: [], label: 'Search web' }],
  },
  {
    intent: 'create-task',
    goalTemplate: 'Buat task: {task}',
    steps: [
      { action: 'create-task', paramKeys: ['task'], dependencies: [], label: 'Create task' },
      { action: 'save-memory', paramKeys: ['task'], dependencies: [0], label: 'Save to memory' },
    ],
  },
  {
    intent: 'set-reminder',
    goalTemplate: 'Buat pengingat: {task}',
    steps: [
      {
        action: 'create-reminder',
        paramKeys: ['task', 'time'],
        dependencies: [],
        label: 'Create reminder',
      },
      { action: 'save-memory', paramKeys: ['task'], dependencies: [0], label: 'Save to memory' },
    ],
  },
  {
    intent: 'change-setting',
    goalTemplate: 'Ubah {setting} ke {value}',
    steps: [
      {
        action: 'change-setting',
        paramKeys: ['setting', 'value'],
        dependencies: [],
        label: 'Change setting',
      },
    ],
  },
  {
    intent: 'ask-info',
    goalTemplate: 'Cari informasi: {question}',
    steps: [
      {
        action: 'search-web',
        paramKeys: ['question'],
        dependencies: [],
        label: 'Search information',
      },
    ],
  },
  {
    intent: 'greeting',
    goalTemplate: 'Sapa pengguna',
    steps: [
      { action: 'generate-greeting', paramKeys: [], dependencies: [], label: 'Generate greeting' },
    ],
  },
];

export class PlanningEngine implements PlannerEngine {
  name = 'planner';

  private plans: Map<string, ActionPlan> = new Map();
  private stepCounter = 0;

  async init() {}

  destroy() {
    this.plans.clear();
  }

  createPlan(intent: Intent): ActionPlan {
    const template = PLAN_TEMPLATES.find((t) => t.intent === intent.type);
    const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (!template) {
      const plan: ActionPlan = {
        id: planId,
        intent: intent.type,
        goal: `Process: ${intent.raw}`,
        steps: [],
        status: 'completed',
        createdAt: Date.now(),
      };
      this.plans.set(planId, plan);
      return plan;
    }

    let goal = template.goalTemplate;
    for (const [key, value] of Object.entries(intent.entities)) {
      goal = goal.replace(`{${key}}`, value);
    }

    const steps: ActionStep[] = template.steps.map((s, idx) => ({
      id: `step-${this.stepCounter++}`,
      action: s.action,
      params: Object.fromEntries(s.paramKeys.map((k) => [k, intent.entities[k] ?? ''])),
      dependencies: [] as string[],
      status: idx === 0 ? ('pending' as PlanStatus) : ('blocked' as PlanStatus),
    }));

    // Fix dependencies after all steps created
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      step.dependencies = template.steps[i]!.dependencies.map((depIdx) => steps[depIdx]?.id).filter(
        (id): id is string => id !== undefined,
      );
    }

    const plan: ActionPlan = {
      id: planId,
      intent: intent.type,
      goal,
      steps,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.plans.set(planId, plan);
    return plan;
  }

  getPlan(id: string): ActionPlan | null {
    return this.plans.get(id) ?? null;
  }

  getAllPlans(): ActionPlan[] {
    return Array.from(this.plans.values());
  }

  async executeNextStep(planId: string): Promise<boolean> {
    const plan = this.plans.get(planId);
    if (!plan || plan.status === 'completed' || plan.status === 'failed') return false;

    const nextStep = plan.steps.find(
      (s) =>
        s.status === 'pending' &&
        s.dependencies.every((depId) => {
          const dep = plan.steps.find((ps) => ps.id === depId);
          return dep?.status === 'completed';
        }),
    );

    if (!nextStep) {
      // Check if all steps completed
      const allDone = plan.steps.every((s) => s.status === 'completed');
      plan.status = allDone ? 'completed' : 'blocked';
      if (allDone) plan.completedAt = Date.now();
      return false;
    }

    nextStep.status = 'in-progress';

    try {
      nextStep.result = `Executed: ${nextStep.action}`;
      nextStep.status = 'completed';

      // Unblock dependent steps
      for (const step of plan.steps) {
        if (step.status === 'blocked') {
          const allDepsMet = step.dependencies.every((depId) => {
            const dep = plan.steps.find((ps) => ps.id === depId);
            return dep?.status === 'completed';
          });
          if (allDepsMet) step.status = 'pending';
        }
      }

      // Check if plan is fully complete
      const allDone = plan.steps.every((s) => s.status === 'completed');
      if (allDone) {
        plan.status = 'completed';
        plan.completedAt = Date.now();
      }

      return true;
    } catch (err) {
      nextStep.status = 'failed';
      nextStep.error = String(err);
      plan.status = 'failed';
      return false;
    }
  }

  getBlockedSteps(planId: string): ActionStep[] {
    const plan = this.plans.get(planId);
    if (!plan) return [];
    return plan.steps.filter((s) => s.status === 'blocked');
  }
}
