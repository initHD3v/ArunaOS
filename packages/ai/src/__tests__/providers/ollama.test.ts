import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../../providers/ollama';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should set default values', () => {
      const p = new OllamaProvider();
      expect(p.type).toBe('ollama');
      expect(p.model).toBe('llama3.2');
      expect(p.isAvailable()).toBe(true);
    });

    it('should use custom base URL', () => {
      const p = new OllamaProvider({ baseUrl: 'http://custom:11434', model: 'mistral' });
      expect(p.model).toBe('mistral');
    });
  });

  describe('complete', () => {
    it('should make a POST request to /api/chat', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Hello from local AI' },
          usage: { prompt_tokens: 20, completion_tokens: 10 },
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434' });
      const result = await provider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.message.content).toBe('Hello from local AI');
      expect(mockFetch.mock.calls[0]![0]!).toBe('http://localhost:11434/api/chat');

      const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(body.model).toBe('llama3.2');
      expect(body.stream).toBe(false);
    });

    it('should include system prompt as first message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: 'OK' } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new OllamaProvider();
      await provider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
        systemPrompt: 'You are helpful',
      });

      const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('You are helpful');
    });

    it('should handle API errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new OllamaProvider();
      await expect(
        provider.complete({ messages: [{ role: 'user', content: 'test' }] }),
      ).rejects.toThrow('Ollama API error (500)');
    });

    it('should handle empty response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: {} }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new OllamaProvider();
      const result = await provider.complete({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(result.message.content).toBe('');
    });
  });

  describe('completeStream', () => {
    it('should yield text chunks from Ollama NDJSON stream', async () => {
      const encoder = new TextEncoder();
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: encoder.encode(JSON.stringify({ message: { content: 'Hello' } }) + '\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: encoder.encode(JSON.stringify({ message: { content: ' world' } }) + '\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: encoder.encode(JSON.stringify({ message: { content: '' }, done: true }) + '\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new OllamaProvider();
      const chunks: string[] = [];
      for await (const chunk of provider.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'text') chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should yield error on failed stream request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      });
      vi.stubGlobal('fetch', mockFetch);

      const provider = new OllamaProvider();
      const errors: string[] = [];
      for await (const chunk of provider.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'error') errors.push(chunk.content);
      }

      expect(errors[0]).toContain('Ollama API error (503)');
    });
  });
});
