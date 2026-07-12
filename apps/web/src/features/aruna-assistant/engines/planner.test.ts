import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningEngine } from './planner';
import type { Intent } from './types';

describe('PlanningEngine', () => {
  let planner: PlanningEngine;

  beforeEach(() => {
    planner = new PlanningEngine();
  });

  it('creates a plan from an open-module intent', () => {
    const intent: Intent = {
      type: 'open-module',
      confidence: 0.9,
      entities: { target: 'files' },
      raw: 'buka files',
    };
    const plan = planner.createPlan(intent);
    expect(plan.id).toBeTruthy();
    expect(plan.intent).toBe('open-module');
    expect(plan.goal).toContain('files');
    expect(plan.steps.length).toBeGreaterThanOrEqual(1);
    expect(plan.status).toBe('pending');
  });

  it('creates a plan from search intent', () => {
    const intent: Intent = {
      type: 'search',
      confidence: 0.85,
      entities: { query: 'cuaca hari ini' },
      raw: 'cari cuaca',
    };
    const plan = planner.createPlan(intent);
    expect(plan.steps[0]!.action).toBe('search-web');
  });

  it('creates a multi-step plan for create-task', () => {
    const intent: Intent = {
      type: 'create-task',
      confidence: 0.8,
      entities: { task: 'belajar rust' },
      raw: 'buat task belajar rust',
    };
    const plan = planner.createPlan(intent);
    expect(plan.steps.length).toBe(2);
    expect(plan.steps[0]!.action).toBe('create-task');
    expect(plan.steps[1]!.action).toBe('save-memory');
    expect(plan.steps[1]!.status).toBe('blocked');
  });

  it('creates empty plan for unknown intent', () => {
    const intent: Intent = {
      type: 'unknown',
      confidence: 0.1,
      entities: {},
      raw: 'unknown command',
    };
    const plan = planner.createPlan(intent);
    expect(plan.steps).toHaveLength(0);
    expect(plan.status).toBe('completed');
  });

  it('retrieves stored plans', () => {
    const intent: Intent = {
      type: 'open-module',
      confidence: 0.9,
      entities: { target: 'settings' },
      raw: 'buka settings',
    };
    const plan = planner.createPlan(intent);
    const retrieved = planner.getPlan(plan.id);
    expect(retrieved).toBeTruthy();
    expect(retrieved!.goal).toBe(plan.goal);
  });

  it('returns null for unknown plan', () => {
    expect(planner.getPlan('nonexistent')).toBeNull();
  });

  it('executes next step in a plan', async () => {
    const intent: Intent = {
      type: 'open-module',
      confidence: 0.9,
      entities: { target: 'files' },
      raw: 'buka files',
    };
    const plan = planner.createPlan(intent);
    const executed = await planner.executeNextStep(plan.id);
    expect(executed).toBe(true);
    expect(plan.steps[0]!.status).toBe('completed');
  });

  it('executes multi-step plan in order', async () => {
    const intent: Intent = {
      type: 'create-task',
      confidence: 0.8,
      entities: { task: 'test' },
      raw: 'buat task test',
    };
    const plan = planner.createPlan(intent);

    // First step should execute
    const r1 = await planner.executeNextStep(plan.id);
    expect(r1).toBe(true);
    expect(plan.steps[0]!.status).toBe('completed');

    // Second step should now be pending (dependency met)
    expect(plan.steps[1]!.status).toBe('pending');

    // Execute second step
    const r2 = await planner.executeNextStep(plan.id);
    expect(r2).toBe(true);
    expect(plan.steps[1]!.status).toBe('completed');

    // Plan should be completed
    expect(plan.status).toBe('completed');
  });

  it('returns blocked steps', () => {
    const intent: Intent = {
      type: 'create-task',
      confidence: 0.8,
      entities: { task: 'test' },
      raw: 'buat task test',
    };
    const plan = planner.createPlan(intent);
    const blocked = planner.getBlockedSteps(plan.id);
    expect(blocked.length).toBe(1);
    expect(blocked[0]!.status).toBe('blocked');
  });

  it('cannot execute step on completed plan', async () => {
    const intent: Intent = {
      type: 'open-module',
      confidence: 0.9,
      entities: { target: 'files' },
      raw: 'buka',
    };
    const plan = planner.createPlan(intent);
    await planner.executeNextStep(plan.id);
    const result = await planner.executeNextStep(plan.id);
    expect(result).toBe(false);
  });

  it('lists all plans', () => {
    planner.createPlan({
      type: 'open-module',
      confidence: 0.9,
      entities: { target: 'a' },
      raw: 'a',
    });
    planner.createPlan({ type: 'search', confidence: 0.8, entities: { query: 'b' }, raw: 'b' });
    expect(planner.getAllPlans().length).toBe(2);
  });
});
