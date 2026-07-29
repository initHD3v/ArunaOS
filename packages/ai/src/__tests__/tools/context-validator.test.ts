import { describe, it, expect } from 'vitest';
import { ContextValidator } from '../../tools/context-validator';

describe('ContextValidator', () => {
  const validator = new ContextValidator();

  describe('extractFacts', () => {
    it('should extract day from context', () => {
      const facts = validator.extractFacts('Saat ini Kamis, 30 Juli 2026.');
      expect(facts.find((f) => f.type === 'day')?.value).toBe('Kamis');
    });

    it('should extract period from context', () => {
      const facts = validator.extractFacts('jam 1:52 dini hari');
      expect(facts.find((f) => f.type === 'period')?.value).toBe('dini hari');

      const facts2 = validator.extractFacts('jam 12:30 siang');
      expect(facts2.find((f) => f.type === 'period')?.value).toBe('siang');
    });

    it('should extract month from context', () => {
      const facts = validator.extractFacts('30 Juli 2026');
      expect(facts.find((f) => f.type === 'month')?.value).toBe('Juli');
    });

    it('should extract year from context', () => {
      const facts = validator.extractFacts('30 Juli 2026');
      expect(facts.find((f) => f.type === 'year')?.value).toBe('2026');
    });

    it('should extract date from context', () => {
      const facts = validator.extractFacts('30 Juli 2026');
      expect(facts.find((f) => f.type === 'date')?.value).toBe('30');
    });

    it('should extract all facts from full context', () => {
      const facts = validator.extractFacts('Saat ini Kamis, 30 Juli 2026, jam 1:52 dini hari.');
      expect(facts).toHaveLength(5);
      expect(facts.find((f) => f.type === 'day')?.value).toBe('Kamis');
      expect(facts.find((f) => f.type === 'date')?.value).toBe('30');
      expect(facts.find((f) => f.type === 'month')?.value).toBe('Juli');
      expect(facts.find((f) => f.type === 'year')?.value).toBe('2026');
      expect(facts.find((f) => f.type === 'period')?.value).toBe('dini hari');
    });

    it('should return empty for context with no time facts', () => {
      const facts = validator.extractFacts('Membuka File Manager.');
      expect(facts).toHaveLength(0);
    });

    it('should only extract first day found', () => {
      const facts = validator.extractFacts('Jumat, 30 Juli 2026');
      expect(facts.find((f) => f.type === 'day')?.value).toBe('Jumat');
    });

    it('should handle weather context', () => {
      const facts = validator.extractFacts(
        'Saat ini Kamis, 30 Juli 2026, jam 1:52 dini hari. Cuaca di Jakarta 28°C.',
      );
      expect(facts.find((f) => f.type === 'day')?.value).toBe('Kamis');
      expect(facts.find((f) => f.type === 'period')?.value).toBe('dini hari');
    });

    it('should handle open_app context', () => {
      const facts = validator.extractFacts('Membuka File Manager: File Manager sudah terbuka!');
      expect(facts).toHaveLength(0);
    });
  });

  describe('checkContradiction', () => {
    it('should return null when response matches day', () => {
      const facts = [validator.extractFacts('Saat ini Kamis, 30 Juli 2026.')[0]!];
      expect(validator.checkContradiction('Hari ini adalah Kamis.', facts)).toBeNull();
    });

    it('should detect wrong day', () => {
      const facts = [{ type: 'day' as const, value: 'Kamis' }];
      expect(validator.checkContradiction('Hari ini adalah Jumat.', facts)).toContain('Jumat');
    });

    it('should detect wrong period', () => {
      const facts = [{ type: 'period' as const, value: 'dini hari' }];
      expect(validator.checkContradiction('Sekarang jam 1 siang.', facts)).toContain('siang');
    });

    it('should detect wrong month', () => {
      const facts = [{ type: 'month' as const, value: 'Juli' }];
      expect(validator.checkContradiction('Sekarang bulan Agustus.', facts)).toContain('Agustus');
    });

    it('should detect wrong year', () => {
      const facts = [{ type: 'year' as const, value: '2026' }];
      expect(validator.checkContradiction('Tahun 2025.', facts)).toContain('2025');
    });

    it('should pass when no contradicting day mentioned', () => {
      const facts = [{ type: 'day' as const, value: 'Kamis' }];
      expect(validator.checkContradiction('Saya tidak tahu.', facts)).toBeNull();
    });

    it('should pass when correct day is mentioned alongside others', () => {
      const facts = [{ type: 'day' as const, value: 'Kamis' }];
      expect(validator.checkContradiction('Hari Kamis, besok Jumat.', facts)).toBeNull();
    });

    it('should detect wrong date number', () => {
      const facts = [{ type: 'date' as const, value: '30' }];
      expect(validator.checkContradiction('Hari ini tanggal 31 Juli 2026.', facts)).toContain('31');
    });

    it('should pass when no date mentioned', () => {
      const facts = [{ type: 'date' as const, value: '30' }];
      expect(validator.checkContradiction('Hari ini adalah Kamis.', facts)).toBeNull();
    });
  });

  describe('validate', () => {
    it('should return pass when no contradiction', () => {
      const contextNote = 'Saat ini Kamis, 30 Juli 2026.';
      const response = 'Hari ini adalah Kamis.';
      expect(validator.validate(response, contextNote, 0)).toBe('pass');
    });

    it('should return retry on first contradiction', () => {
      const contextNote = 'Saat ini Kamis, 30 Juli 2026.';
      const response = 'Hari ini adalah Jumat.';
      expect(validator.validate(response, contextNote, 0)).toBe('retry');
    });

    it('should return retry on second contradiction', () => {
      const contextNote = 'Saat ini Kamis, 30 Juli 2026.';
      const response = 'Hari ini adalah Jumat.';
      expect(validator.validate(response, contextNote, 1)).toBe('retry');
    });

    it('should return override on third contradiction', () => {
      const contextNote = 'Saat ini Kamis, 30 Juli 2026.';
      const response = 'Hari ini adalah Jumat.';
      expect(validator.validate(response, contextNote, 2)).toBe('override');
    });

    it('should return pass for empty response', () => {
      const contextNote = 'Saat ini Kamis, 30 Juli 2026.';
      expect(validator.validate('', contextNote, 0)).toBe('pass');
    });

    it('should return pass for empty context', () => {
      expect(validator.validate('Halo', '', 0)).toBe('pass');
    });

    it('should return pass for context with no extractable facts', () => {
      expect(validator.validate('Halo', 'Membuka file manager.', 0)).toBe('pass');
    });
  });

  describe('generateSafeResponse', () => {
    it('should strip prefix and return clean info', () => {
      const note = 'Berikut informasi yang saya dapatkan:\nSaat ini Kamis, 30 Juli 2026.';
      expect(validator.generateSafeResponse(note)).toBe('Saat ini Kamis, 30 Juli 2026.');
    });

    it('should return as-is if no prefix', () => {
      const note = 'Saat ini Kamis, 30 Juli 2026.';
      expect(validator.generateSafeResponse(note)).toBe(note);
    });

    it('should handle weather context', () => {
      const note = 'Berikut informasi yang saya dapatkan:\nCuaca di Jakarta 28°C.';
      expect(validator.generateSafeResponse(note)).toBe('Cuaca di Jakarta 28°C.');
    });

    it('should handle open_app context', () => {
      const note = 'Berikut informasi yang saya dapatkan:\nMembuka File Manager.';
      expect(validator.generateSafeResponse(note)).toBe('Membuka File Manager.');
    });
  });

  describe('integration: real scenarios from test suite', () => {
    it('should detect wrong day in jam berapa response', () => {
      const contextNote =
        'Berikut informasi yang saya dapatkan:\nSaat ini Kamis, 30 Juli 2026, jam 1:52 dini hari.';
      const response = 'Saat ini jam 01:52 siang.';
      expect(validator.validate(response, contextNote, 0)).toBe('retry');
    });

    it('should detect wrong day in tanggal berapa response', () => {
      const contextNote = 'Berikut informasi yang saya dapatkan:\nSaat ini Kamis, 30 Juli 2026.';
      const response = 'Hari ini, 30 Juli 2026, merupakan hari Jumat.';
      expect(validator.validate(response, contextNote, 0)).toBe('retry');
    });

    it('should detect wrong month in bulan sekarang response', () => {
      const contextNote = 'Berikut informasi yang saya dapatkan:\nSaat ini Kamis, 30 Juli 2026.';
      const response = 'Anda sedang di bulan Agustus.';
      expect(validator.validate(response, contextNote, 0)).toBe('retry');
    });

    it('should detect wrong date in emoji test', () => {
      const contextNote =
        'Berikut informasi yang saya dapatkan:\nSaat ini Kamis, 30 Juli 2026, jam 1:55 dini hari.';
      const response = 'hari ini adalah hari Rabu';
      expect(validator.validate(response, contextNote, 0)).toBe('retry');
    });

    it('should pass correct hari apa response', () => {
      const contextNote = 'Berikut informasi yang saya dapatkan:\nSaat ini Kamis, 30 Juli 2026.';
      const response = 'Hari ini adalah Kamis, 30 Juli 2026.';
      expect(validator.validate(response, contextNote, 0)).toBe('pass');
    });

    it('should retry then override after 3 failures', () => {
      const contextNote = 'Berikut informasi yang saya dapatkan:\nSaat ini Kamis.';
      const response = 'Hari ini Jumat.';
      expect(validator.validate(response, contextNote, 0)).toBe('retry');
      expect(validator.validate(response, contextNote, 1)).toBe('retry');
      expect(validator.validate(response, contextNote, 2)).toBe('override');
    });

    it('should handle weather context with correct response', () => {
      const contextNote =
        'Berikut informasi yang saya dapatkan:\nSaat ini Kamis, 30 Juli 2026, jam 1:52 dini hari. Cuaca di Jakarta 28°C.';
      const response = 'Suhu di Jakarta saat ini 28°C.';
      expect(validator.validate(response, contextNote, 0)).toBe('pass');
    });
  });
});
