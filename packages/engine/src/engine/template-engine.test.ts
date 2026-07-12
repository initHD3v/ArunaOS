import { describe, it, expect } from 'vitest';
import { TemplateEngine, type EngineContext } from './template-engine';

function makeCtx(overrides?: Partial<EngineContext>): EngineContext {
  return {
    timeOfDay: 'pagi',
    date: new Date('2026-07-11T08:00:00'),
    ...overrides,
  };
}

describe('TemplateEngine', () => {
  describe('getTimeOfDay', () => {
    it('returns pagi for 4-11', () => {
      const e = new TemplateEngine();
      expect(e.getTimeOfDay(new Date('2026-07-11T04:00:00'))).toBe('pagi');
      expect(e.getTimeOfDay(new Date('2026-07-11T10:59:00'))).toBe('pagi');
    });

    it('returns siang for 11-15', () => {
      const e = new TemplateEngine();
      expect(e.getTimeOfDay(new Date('2026-07-11T11:00:00'))).toBe('siang');
      expect(e.getTimeOfDay(new Date('2026-07-11T14:59:00'))).toBe('siang');
    });

    it('returns sore for 15-19', () => {
      const e = new TemplateEngine();
      expect(e.getTimeOfDay(new Date('2026-07-11T15:00:00'))).toBe('sore');
      expect(e.getTimeOfDay(new Date('2026-07-11T18:59:00'))).toBe('sore');
    });

    it('returns malam for 19-4', () => {
      const e = new TemplateEngine();
      expect(e.getTimeOfDay(new Date('2026-07-11T19:00:00'))).toBe('malam');
      expect(e.getTimeOfDay(new Date('2026-07-11T23:59:00'))).toBe('malam');
      expect(e.getTimeOfDay(new Date('2026-07-11T00:00:00'))).toBe('malam');
      expect(e.getTimeOfDay(new Date('2026-07-11T03:59:00'))).toBe('malam');
    });
  });

  describe('getTimeEmoji', () => {
    it('returns correct emoji for each time', () => {
      const e = new TemplateEngine();
      expect(e.getTimeEmoji(new Date('2026-07-11T08:00:00'))).toBe('🌅');
      expect(e.getTimeEmoji(new Date('2026-07-11T12:00:00'))).toBe('☀️');
      expect(e.getTimeEmoji(new Date('2026-07-11T16:00:00'))).toBe('🌇');
      expect(e.getTimeEmoji(new Date('2026-07-11T20:00:00'))).toBe('🌙');
    });
  });

  describe('generateGreeting', () => {
    it('returns a greeting for pagi', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(makeCtx({ timeOfDay: 'pagi' }));
      expect(result.greeting).toContain('Selamat pagi');
      expect(result.mood).toBeTruthy();
    });

    it('returns a greeting for siang', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(makeCtx({ timeOfDay: 'siang' }));
      expect(result.greeting).toContain('Selamat siang');
      expect(result.mood).toBeTruthy();
    });

    it('returns a greeting for sore', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(makeCtx({ timeOfDay: 'sore' }));
      expect(result.greeting).toContain('Selamat sore');
      expect(result.mood).toBeTruthy();
    });

    it('returns a greeting for malam', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(makeCtx({ timeOfDay: 'malam' }));
      expect(result.greeting).toContain('Selamat malam');
      expect(result.mood).toBeTruthy();
    });

    it('mentions hot weather when temp > 33', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(
        makeCtx({
          weather: { temp: 35, condition: 'Clear', city: 'Jakarta' },
        }),
      );
      expect(result.greeting).toContain('Cuaca cukup panas');
    });

    it('mentions cool weather when temp < 25', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(
        makeCtx({
          weather: { temp: 22, condition: 'Cloudy', city: 'Jakarta' },
        }),
      );
      expect(result.greeting).toContain('Cuaca sejuk');
    });

    it('mentions rain when raining', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(
        makeCtx({
          weather: { temp: 28, condition: 'Moderate rain', city: 'Jakarta' },
        }),
      );
      expect(result.greeting).toContain('Hujan');
    });

    it('mentions remaining tasks', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(
        makeCtx({
          tasks: { total: 5, done: 2 },
        }),
      );
      expect(result.greeting).toContain('3 tugas');
    });

    it('celebrates when all tasks done', () => {
      const e = new TemplateEngine();
      const result = e.generateGreeting(
        makeCtx({
          tasks: { total: 3, done: 3 },
        }),
      );
      expect(result.greeting).toContain('selesai');
    });

    it('is deterministic for same day', () => {
      const e = new TemplateEngine();
      const ctx = makeCtx();
      const a = e.generateGreeting(ctx);
      const b = e.generateGreeting(ctx);
      expect(a.greeting).toBe(b.greeting);
      expect(a.mood).toBe(b.mood);
    });
  });

  describe('generateMoodSuggestion', () => {
    it('returns mood based on time', () => {
      const e = new TemplateEngine();
      const morning = e.generateMoodSuggestion(makeCtx({ date: new Date('2026-07-11T08:00:00') }));
      expect(morning).toContain('Energetic');

      const noon = e.generateMoodSuggestion(makeCtx({ date: new Date('2026-07-11T12:00:00') }));
      expect(noon).toContain('Focused');

      const evening = e.generateMoodSuggestion(makeCtx({ date: new Date('2026-07-11T17:00:00') }));
      expect(evening).toContain('Reflective');

      const night = e.generateMoodSuggestion(makeCtx({ date: new Date('2026-07-11T21:00:00') }));
      expect(night).toContain('Calm');
    });
  });

  describe('generateSuggestion', () => {
    it('returns null when no context', () => {
      const e = new TemplateEngine();
      expect(e.generateSuggestion(makeCtx())).toBeNull();
    });

    it('suggests starting with remaining tasks when >3', () => {
      const e = new TemplateEngine();
      const result = e.generateSuggestion(
        makeCtx({
          tasks: { total: 10, done: 3 },
        }),
      );
      expect(result).toContain('7 tugas');
    });

    it('celebrates when all tasks done', () => {
      const e = new TemplateEngine();
      const result = e.generateSuggestion(
        makeCtx({
          tasks: { total: 2, done: 2 },
        }),
      );
      expect(result).toContain('selesai');
    });

    it('suggests focus work when raining', () => {
      const e = new TemplateEngine();
      const result = e.generateSuggestion(
        makeCtx({
          weather: { temp: 28, condition: 'Heavy rain', city: 'Jakarta' },
        }),
      );
      expect(result).toContain('Hujan');
    });
  });
});
