import { describe, it, expect, beforeEach } from 'vitest';
import { IntentEngine } from './intent-engine';

describe('IntentEngine', () => {
  let engine: IntentEngine;

  beforeEach(() => {
    engine = new IntentEngine();
  });

  it('recognizes open-module intent', () => {
    const result = engine.recognize('buka files');
    expect(result.type).toBe('open-module');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.entities.target).toBe('files');
  });

  it('recognizes open-module in english', () => {
    const result = engine.recognize('open settings');
    expect(result.type).toBe('open-module');
    expect(result.entities.target).toBe('settings');
  });

  it('recognizes search intent', () => {
    const result = engine.recognize('cari cuaca hari ini');
    expect(result.type).toBe('search');
    expect(result.entities.query).toBe('cuaca hari ini');
  });

  it('recognizes search in english', () => {
    const result = engine.recognize('search weather today');
    expect(result.type).toBe('search');
  });

  it('recognizes ask-info intent', () => {
    const result = engine.recognize('apa itu aruna?');
    expect(result.type).toBe('ask-info');
  });

  it('recognizes create-task intent', () => {
    const result = engine.recognize('buat task belajar rust');
    expect(result.type).toBe('create-task');
    expect(result.entities.task).toBe('belajar rust');
  });

  it('recognizes greeting intent', () => {
    const result = engine.recognize('halo');
    expect(result.type).toBe('greeting');
    expect(result.confidence).toBe(0.95);
  });

  it('recognizes english greeting', () => {
    const result = engine.recognize('good morning');
    expect(result.type).toBe('greeting');
  });

  it('returns unknown for gibberish', () => {
    const result = engine.recognize('asdfghjkl');
    expect(result.type).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('returns unknown for empty string', () => {
    const result = engine.recognize('');
    expect(result.type).toBe('unknown');
  });

  it('has higher confidence for longer inputs', () => {
    const short = engine.recognize('buka x');
    const long = engine.recognize('buka files manager aplikasi');
    expect(long.confidence).toBeGreaterThanOrEqual(short.confidence);
  });
});
