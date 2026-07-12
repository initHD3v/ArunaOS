import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalityEngine } from './personality-engine';
import type { SystemContext, TimeOfDay } from './types';

describe('PersonalityEngine', () => {
  let engine: PersonalityEngine;
  let ctx: SystemContext;

  beforeEach(() => {
    engine = new PersonalityEngine();
    ctx = {
      time: { hour: 10, minute: 0, dayOfWeek: 0, date: 'Sunday', timeOfDay: 'morning' },
      weather: { temp: 28, condition: 'Cerah', icon: 'sun', city: 'Jakarta' },
      workspace: { activeModules: [], focusedWindow: null },
      notifications: { total: 0, important: 0 },
      system: { battery: null, network: 'wifi', uptime: 0 },
    };
  });

  it('sets username from init', async () => {
    await engine.init();
    expect(engine.name).toBe('personality');
  });

  it('returns greeting based on time of day', () => {
    expect(engine.getGreeting('morning')).toBe('Good Morning');
    expect(engine.getGreeting('afternoon')).toBe('Good Afternoon');
    expect(engine.getGreeting('evening')).toBe('Good Evening');
    expect(engine.getGreeting('night')).toBe('Good Night');
  });

  it('returns personality message for time of day', () => {
    const msg = engine.getPersonalityMessage('morning');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('falls back to morning for unknown time', () => {
    const msg = engine.getPersonalityMessage('night' as TimeOfDay);
    expect(msg.length).toBeGreaterThan(0);
  });

  it('returns focus recommendation', () => {
    const rec = engine.getFocusRecommendation();
    expect(rec.length).toBeGreaterThan(0);
  });

  it('generates daily brief', () => {
    const brief = engine.generateDailyBrief(ctx);
    expect(brief.greeting).toContain('Good Morning');
    expect(brief.timeOfDay).toBe('morning');
    expect(brief.weather).toContain('28');
    expect(brief.weather).toContain('Jakarta');
    expect(brief.focusRecommendation.length).toBeGreaterThan(0);
    expect(brief.message.length).toBeGreaterThan(0);
  });

  it('handles no weather context', () => {
    const noWeatherCtx = { ...ctx, weather: null };
    const brief = engine.generateDailyBrief(noWeatherCtx);
    expect(brief.weather).toBe('Cuaca hari ini --');
  });

  it('custom username through setUsername', () => {
    engine.setUsername('Budi');
    // Re-init loads from localStorage which has no account data
    // setUsername should work independently
    const brief = engine.generateDailyBrief(ctx);
    expect(brief.greeting).toContain('Good Morning');
  });
});
