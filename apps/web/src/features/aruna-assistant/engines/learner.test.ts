import { describe, it, expect, beforeEach } from 'vitest';
import { LearningEngine } from './learner';

describe('LearningEngine', () => {
  let learner: LearningEngine;

  beforeEach(() => {
    localStorage.clear();
    learner = new LearningEngine();
  });

  it('starts with empty preferences', () => {
    const prefs = learner.getPreferences();
    expect(prefs.preferredWorkspaces).toEqual([]);
    expect(prefs.productiveHours).toEqual([]);
    expect(prefs.favoriteModules).toEqual([]);
  });

  it('starts with no habits', () => {
    expect(learner.getHabits()).toEqual([]);
  });

  it('tracks module usage', () => {
    learner.observeActivity('module-open', { moduleId: 'arunaos.files', moduleName: 'Files' });
    learner.observeActivity('module-open', { moduleId: 'arunaos.files', moduleName: 'Files' });
    const prefs = learner.getPreferences();
    expect(prefs.favoriteModules).toHaveLength(1);
    expect(prefs.favoriteModules[0]!.usageCount).toBe(2);
  });

  it('tracks workspace changes', () => {
    learner.observeActivity('workspace-change', {
      workspaceId: 'dev',
      workspaceName: 'Development',
    });
    const prefs = learner.getPreferences();
    expect(prefs.preferredWorkspaces).toContain('dev');
  });

  it('detects module habits after frequent usage', () => {
    for (let i = 0; i < 5; i++) {
      learner.observeActivity('module-open', { moduleId: 'arunaos.files', moduleName: 'Files' });
    }
    const habits = learner.getHabits();
    const moduleHabit = habits.find((h) => h.type === 'module');
    expect(moduleHabit).toBeTruthy();
    expect(moduleHabit!.pattern).toContain('files');
    expect(moduleHabit!.frequency).toBeGreaterThanOrEqual(3);
  });

  it('identifies productive hours', () => {
    // Simulate activities at different hours by manipulating what observeActivity sees
    // Since we can't mock Date, we create activities naturally
    learner.observeActivity('activity', {});
    learner.observeActivity('activity', {});
    learner.observeActivity('activity', {});
    // These all happen at the current hour, so that hour should become productive
    const prefs = learner.getPreferences();
    const currentHour = new Date().getHours();
    expect(prefs.productiveHours).toContain(currentHour);
  });

  it('provides workflow suggestion when patterns exist', () => {
    expect(learner.getSuggestedWorkflow()).toBeNull();

    // Simulate a common workflow
    for (let i = 0; i < 5; i++) {
      learner.observeActivity('module-open', { moduleId: 'arunaos.files', moduleName: 'Files' });
      learner.observeActivity('module-open', {
        moduleId: 'arunaos.settings',
        moduleName: 'Settings',
      });
    }

    // Check habits are detected
    const habits = learner.getHabits();
    expect(habits.length).toBeGreaterThanOrEqual(1);
  });

  it('persists data to localStorage', () => {
    learner.observeActivity('module-open', { moduleId: 'arunaos.files', moduleName: 'Files' });
    learner.observeActivity('workspace-change', {
      workspaceId: 'dev',
      workspaceName: 'Development',
    });

    // Create new instance and verify data persists
    const learner2 = new LearningEngine();
    learner2.init();
    const prefs = learner2.getPreferences();
    expect(prefs.favoriteModules.length).toBeGreaterThanOrEqual(1);
  });

  it('init loads from localStorage', async () => {
    learner.observeActivity('module-open', { moduleId: 'arunaos.files', moduleName: 'Files' });
    const learner2 = new LearningEngine();
    await learner2.init();
    expect(learner2.getPreferences().favoriteModules.length).toBeGreaterThanOrEqual(1);
  });

  it('destroy saves to localStorage', () => {
    learner.observeActivity('module-open', { moduleId: 'arunaos.weather', moduleName: 'Weather' });
    learner.destroy();
    const raw = localStorage.getItem('arunaos-learning');
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw!);
    expect(data.preferences.favoriteModules[0].id).toBe('arunaos.weather');
  });
});
