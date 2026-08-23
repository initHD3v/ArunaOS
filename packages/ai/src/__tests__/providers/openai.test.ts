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

    it('should serialize tool history with tool_call_id and structured assistant tool_calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await provider.complete({
        messages: [
          { role: 'user', content: 'What time is it?' },
          { role: 'assistant', content: '{"name":"get_time","args":{}}' },
          {
            role: 'tool',
            content: '{"time":"10:00"}',
            toolName: 'get_time',
            toolCallId: 'get_time',
          },
        ],
      });

      const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      const [assistantMsg, toolMsg] = body.messages.slice(-2);

      expect(assistantMsg.role).toBe('assistant');
      expect(assistantMsg.content).toBeNull();
      expect(assistantMsg.tool_calls).toEqual([
        {
          id: 'get_time',
          type: 'function',
          function: { name: 'get_time', arguments: '{}' },
        },
      ]);

      expect(toolMsg.role).toBe('tool');
      expect(toolMsg.tool_call_id).toBe('get_time');
      vi.unstubAllGlobals();
    });
  });

  describe('rate limit retry', () => {
    it('should retry on 429 honoring Retry-After and succeed', async () => {
      const rateLimited = () => ({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
        headers: { get: (k: string) => (k === 'retry-after' ? '0' : null) },
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      });
      const mockFetch = vi
        .fn()
        .mockImplementationOnce(async () => rateLimited())
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'after 429' } }] }),
        });
      vi.stubGlobal('fetch', mockFetch);

      const result = await provider.complete({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.message.content).toBe('after 429');
      expect(mockFetch.mock.calls.length).toBe(2);
      vi.unstubAllGlobals();
    });

    it('should give up after max retries on persistent 429', async () => {
      const p = new OpenAIProvider({
        apiKey: 'test-key',
        _retryDelayMs: 1,
        _maxRetries: 2,
      });
      const makeResponse = () => ({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
        headers: { get: (k: string) => (k === 'retry-after' ? '0' : null) },
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      });
      const mockFetch = vi.fn().mockImplementation(async () => makeResponse());
      vi.stubGlobal('fetch', mockFetch);

      await expect(p.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
        'OpenAI API error (429)',
      );
      expect(mockFetch.mock.calls.length).toBe(3); // initial + 2 retries
      vi.unstubAllGlobals();
    });

    it('should yield error chunk after exhausting 429 retries while streaming', async () => {
      const p = new OpenAIProvider({
        apiKey: 'test-key',
        _retryDelayMs: 1,
        _maxRetries: 1,
      });
      const makeResponse = () => ({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
        headers: { get: (k: string) => (k === 'retry-after' ? '0' : null) },
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      });
      const mockFetch = vi.fn().mockImplementation(async () => makeResponse());
      vi.stubGlobal('fetch', mockFetch);

      const errors: string[] = [];
      let sawDone = false;
      for await (const chunk of p.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'error') errors.push(chunk.content);
        if (chunk.type === 'done') sawDone = true;
      }

      expect(errors[0]).toContain('OpenAI API error (429)');
      expect(sawDone).toBe(false);
      expect(mockFetch.mock.calls.length).toBe(2); // initial + 1 retry
      vi.unstubAllGlobals();
    });

    it('should fall back to the next model on persistent 429 (complete)', async () => {
      const p = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'model-a',
        _retryDelayMs: 1,
        _maxRetries: 0,
        _fallbackModels: ['model-b', 'model-c'],
      });
      const rateLimited = () => ({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
        headers: { get: () => null },
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      });
      const mockFetch = vi.fn(async (_url: string, init?: { body?: string }) => {
        const bodyModel = JSON.parse(init?.body ?? '{}').model as string;
        if (bodyModel === 'model-a') return rateLimited();
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: `from ${bodyModel}` } }] }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await p.complete({ messages: [{ role: 'user', content: 'Hi' }] });

      expect(result.message.content).toBe('from model-b');
      vi.unstubAllGlobals();
    });

    it('should yield error only after all fallback models are exhausted while streaming', async () => {
      const p = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'model-a',
        _retryDelayMs: 1,
        _maxRetries: 0,
        _fallbackModels: ['model-b'],
      });
      const rateLimited = () => ({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
        headers: { get: () => null },
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      });
      const mockFetch = vi.fn(async () => rateLimited());
      vi.stubGlobal('fetch', mockFetch);

      const errors: string[] = [];
      for await (const chunk of p.completeStream({
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        if (chunk.type === 'error') errors.push(chunk.content);
      }

      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('(429)');
      expect(mockFetch.mock.calls.length).toBe(2); // model-a + model-b, no retry
      vi.unstubAllGlobals();
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
