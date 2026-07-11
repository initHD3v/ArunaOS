import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIModuleGenerator } from './ai-generator';

describe('AIModuleGenerator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to keyword generator when no API key is set', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');

    const gen = new AIModuleGenerator();
    expect(gen.isAvailable).toBe(false);
    expect(gen.providerName).toBeNull();

    const result = await gen.generate({
      name: 'FallbackModule',
      description: 'Should use keyword fallback',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('fallbackmodule');
    expect(result.files).toHaveLength(4);
  });

  it('reports available when OPENAI_API_KEY is set', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

    const gen = new AIModuleGenerator();
    expect(gen.isAvailable).toBe(true);
    expect(gen.providerName).toBe('openai');
  });

  it('falls back on API error gracefully', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

    const gen = new AIModuleGenerator();
    const result = await gen.generate({
      name: 'APIFail',
      description: 'Testing API failure fallback',
    });

    expect(result).toBeDefined();
    expect(result.files).toHaveLength(4);
  });
});
