import { describe, it, expect, vi } from 'vitest';
import { DeepSeekProvider } from '../../providers/deepseek';

const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Flash-0731';
const DEFAULT_BASE = 'https://q5dh1rfszfym23hj.us-east-2.aws.endpoints.huggingface.cloud/v1';

describe('DeepSeekProvider', () => {
  it('should default to free public model and be available without a key', () => {
    const p = new DeepSeekProvider();
    expect(p.type).toBe('deepseek');
    expect(p.model).toBe(DEFAULT_MODEL);
    expect(p.isAvailable()).toBe(true);
  });

  it('should respect custom model config', () => {
    const p = new DeepSeekProvider({ model: 'x' });
    expect(p.model).toBe('x');
    expect(p.isAvailable()).toBe(true);
  });

  it('should POST to the base URL + /chat/completions', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hi' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const p = new DeepSeekProvider();
    await p.complete({ messages: [{ role: 'user', content: 'Hello' }] });

    const callUrl = mockFetch.mock.calls[0]![0]!;
    expect(callUrl).toBe(`${DEFAULT_BASE}/chat/completions`);
    vi.unstubAllGlobals();
  });

  it('should not require an API key', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const p = new DeepSeekProvider();
    const result = await p.complete({ messages: [{ role: 'user', content: 'Hello' }] });
    expect(result.message.content).toBe('ok');

    const headers = mockFetch.mock.calls[0]![1]!.headers;
    expect(headers['Authorization']).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it('should retry on 503 cold-start and succeed on retry', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => '{"error":{"message":"model server is starting or unavailable"}}',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'warm reply' } }] }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const p = new DeepSeekProvider({ _retryDelayMs: 1, _maxRetries: 3 });
    const result = await p.complete({ messages: [{ role: 'user', content: 'Hello' }] });

    expect(result.message.content).toBe('warm reply');
    expect(mockFetch.mock.calls.length).toBe(2);
    vi.unstubAllGlobals();
  });

  it('should give up after max retries on persistent 503', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'starting',
    });
    vi.stubGlobal('fetch', mockFetch);

    const p = new DeepSeekProvider({ _retryDelayMs: 1, _maxRetries: 2 });
    await expect(p.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
      'OpenAI API error (503)',
    );
    expect(mockFetch.mock.calls.length).toBe(3); // initial + 2 retries
    vi.unstubAllGlobals();
  });

  it('should NOT leak tool-call args as text; reassemble into executable JSON', async () => {
    vi.unstubAllGlobals();
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"get_weather"}}]}}]}\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"lat\\":"}}}]}}]}\n',
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"106.5}"}}]}}]}\n',
          ),
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
      vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } }),
    );

    const p = new DeepSeekProvider();
    const text: string[] = [];
    const toolCalls: string[] = [];
    for await (const chunk of p.completeStream({
      messages: [{ role: 'user', content: 'cuaca' }],
    })) {
      if (chunk.type === 'text') text.push(chunk.content);
      if (chunk.type === 'tool-call') toolCalls.push(chunk.content ?? '');
    }

    expect(text).toEqual([]); // args must never surface as assistant text
    expect(toolCalls.length).toBe(1);
    // Reassembled tool call is wrapped with a name so it is executable.
    expect(toolCalls[0]).toContain('"name":');
    expect(toolCalls[0]).toContain('"get_weather"');
    vi.unstubAllGlobals();
  });
});
