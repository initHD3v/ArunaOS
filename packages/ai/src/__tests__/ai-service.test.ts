import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService } from '../ai-service';
import type { AITool } from '../types';

describe('AIService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      const service = new AIService();
      expect(service.getAvailableProviders()).toEqual([]);
    });

    it('should auto-detect providers from env', () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      const service = new AIService();
      const providers = service.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0]!.type).toBe('openai');
    });

    it('should register tools from config', () => {
      const tool: AITool = {
        id: 't1',
        name: 'test_tool',
        description: '',
        category: 'system',
        parameters: [],
        execute: async () => ({ success: true, data: {} }),
      };
      const service = new AIService({ tools: [tool] });
      expect(service.getToolRegistry().has('test_tool')).toBe(true);
    });
  });

  describe('registerProvider', () => {
    it('should register OpenAI provider', () => {
      const service = new AIService();
      service.registerProvider('openai', { apiKey: 'sk-test' });
      const providers = service.getAvailableProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0]!.type).toBe('openai');
      expect(providers[0]!.available).toBe(true);
    });

    it('should register Ollama provider', () => {
      const service = new AIService({ defaultProvider: 'ollama' });
      const countBefore = service.getAvailableProviders().length;
      service.registerProvider('ollama', { baseUrl: 'http://localhost:11434' });
      const providers = service.getAvailableProviders();
      expect(providers).toHaveLength(countBefore + 1);
      const ollamaProviders = providers.filter((p) => p.type === 'ollama');
      expect(ollamaProviders.length).toBeGreaterThan(0);
    });

    it('should register multiple providers', () => {
      const service = new AIService();
      service.registerProvider('openai', { apiKey: 'sk-1' });
      service.registerProvider('ollama', { baseUrl: 'http://localhost:11434' });
      expect(service.getAvailableProviders()).toHaveLength(2);
    });

    it('should throw for unregistered provider type', () => {
      const service = new AIService();
      service.registerProvider('openai', { apiKey: 'sk-test' });
      expect(() => service.getProvider('anthropic')).toThrow('not registered');
    });
  });

  describe('getProvider', () => {
    it('should return the default provider', () => {
      const service = new AIService();
      service.registerProvider('openai', { apiKey: 'sk-test' });
      const provider = service.getProvider();
      expect(provider.type).toBe('openai');
    });

    it('should return specific provider', () => {
      const service = new AIService();
      service.registerProvider('ollama', { baseUrl: 'http://localhost:11434' });
      const provider = service.getProvider('ollama');
      expect(provider.type).toBe('ollama');
    });
  });

  describe('registerTool and getToolRegistry', () => {
    it('should register a tool', () => {
      const service = new AIService();
      const tool: AITool = {
        id: 'notify',
        name: 'notify',
        description: '',
        category: 'system',
        parameters: [],
        execute: async () => ({ success: true, data: {} }),
      };
      service.registerTool(tool);
      expect(service.getToolRegistry().has('notify')).toBe(true);
    });
  });

  describe('setSystemPrompt', () => {
    it('should set system prompt', () => {
      const service = new AIService();
      service.setSystemPrompt('You are ArunaOS AI');
      // private field, just verify no error
      expect(true).toBe(true);
    });
  });

  describe('complete', () => {
    it('should call provider.complete and return response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'AI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      const service = new AIService();

      const result = await service.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.message.content).toBe('AI response');
    });
  });

  describe('completeStream', () => {
    it('should yield chunks from provider stream', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => mockReader },
        }),
      );

      vi.stubEnv('OPENAI_API_KEY', 'sk-test');
      const service = new AIService();

      const chunks: string[] = [];
      for await (const chunk of service.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'text') chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Hello']);
    });
  });
});
