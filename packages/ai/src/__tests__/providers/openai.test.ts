import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../providers/openai';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({ apiKey: 'test-key', model: 'gpt-4o-mini' });
  });

  describe('constructor', () => {
    it('should set default values', () => {
      const p = new OpenAIProvider();
      expect(p.type).toBe('openai');
      expect(p.model).toBe('gpt-4o-mini');
      expect(p.isAvailable()).toBe(false);
    });

    it('should use custom config', () => {
      const p = new OpenAIProvider({
        apiKey: 'sk-custom',
        baseUrl: 'https://custom.example.com/v1',
        model: 'gpt-4',
        maxTokens: 2048,
        temperature: 0.5,
      });
      expect(p.model).toBe('gpt-4');
      expect(p.isAvailable()).toBe(true);
    });

    it('should detect availability from apiKey', () => {
      const p = new OpenAIProvider({ apiKey: 'sk-test' });
      expect(p.isAvailable()).toBe(true);
    });
  });

  describe('complete', () => {
    it('should make a POST request and return response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello from AI' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await provider.complete({
        messages: [{ role: 'user', content: 'Say hello' }],
      });

      expect(result.message.content).toBe('Hello from AI');
      expect(result.usage?.totalTokens).toBe(15);

      const callUrl = mockFetch.mock.calls[0]![0]!;
      expect(callUrl).toContain('/chat/completions');

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(callBody.model).toBe('gpt-4o-mini');
      expect(callBody.messages).toHaveLength(1);
      expect(callBody.messages[0].content).toBe('Say hello');
    });

    it('should include system prompt in messages', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await provider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
        systemPrompt: 'Be helpful',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      const systemMsg = callBody.messages.find((m: { role: string }) => m.role === 'system');
      expect(systemMsg?.content).toBe('Be helpful');
    });

    it('should handle API errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        provider.complete({ messages: [{ role: 'user', content: 'test' }] }),
      ).rejects.toThrow('OpenAI API error (401)');
    });

    it('should include Authorization header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await provider.complete({ messages: [{ role: 'user', content: 'test' }] });

      const headers = mockFetch.mock.calls[0]![1]!.headers;
      expect(headers['Authorization']).toBe('Bearer test-key');
    });
  });

  describe('completeStream', () => {
    it('should yield text chunks from SSE stream', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" world"}}]}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const chunks: string[] = [];
      for await (const chunk of provider.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'text') chunks.push(chunk.content);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should yield done event at end of stream', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      let doneReceived = false;
      for await (const chunk of provider.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'done') doneReceived = true;
      }

      expect(doneReceived).toBe(true);
    });

    it('should yield error on failed request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });
      vi.stubGlobal('fetch', mockFetch);

      const errors: string[] = [];
      for await (const chunk of provider.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'error') errors.push(chunk.content);
      }

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('OpenAI API error');
    });
  });

  describe('completeStream with tool calls', () => {
    it('should yield tool-call chunks', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"choices":[{"delta":{"tool_calls":[{"id":"call1","function":{"name":"search","arguments":"{}"}}]}}]}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });
      vi.stubGlobal('fetch', mockFetch);

      const chunks: Array<{ type: string; name?: string }> = [];
      for await (const chunk of provider.completeStream({
        messages: [{ role: 'user', content: 'Search something' }],
        tools: [
          {
            id: 'search',
            name: 'search',
            description: 'Search tool',
            category: 'search',
            parameters: [],
            execute: async () => ({ success: true, data: {} }),
          },
        ],
      })) {
        if (chunk.type === 'tool-call') {
          chunks.push({ type: chunk.type, name: chunk.toolName });
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]!.name).toBe('search');
    });
  });
});
