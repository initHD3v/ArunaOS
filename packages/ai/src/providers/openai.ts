import type {
  AIProvider,
  AIProviderConfig,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '../types';
import {
  normalizeBaseUrl,
  createHeaders,
  extractContent,
  extractToolCalls,
  buildRequestBody,
  convertToolsForProvider,
} from './interface';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAIProvider implements AIProvider {
  readonly type: 'openai' | 'openrouter' | 'deepseek' = 'openai';
  readonly model: string;
  private baseUrl: string;
  private apiKey?: string;
  private maxTokens: number;
  private temperature: number;
  private retry: boolean;
  private retryDelayMs: number;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(
    config: AIProviderConfig & {
      _type?: 'openai' | 'openrouter' | 'deepseek';
      _retry?: boolean;
      _retryDelayMs?: number;
      _maxRetries?: number;
      _timeoutMs?: number;
    } = {},
  ) {
    this.apiKey = config.apiKey;
    this.baseUrl = normalizeBaseUrl(config.baseUrl, DEFAULT_BASE_URL);
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
    this.retry = config._retry ?? false;
    this.retryDelayMs = config._retryDelayMs ?? 5000;
    this.maxRetries = config._maxRetries ?? 3;
    this.timeoutMs = config._timeoutMs ?? 0;
    if (config._type) this.type = config._type;
  }

  isAvailable(): boolean {
    return !!this.apiKey || this.retry;
  }

  private timed(init: RequestInit): RequestInit {
    return this.timeoutMs > 0 ? { ...init, signal: AbortSignal.timeout(this.timeoutMs) } : init;
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const response = await fetch(url, this.timed(init));
      if (response.status === 503 && this.retry && attempt < this.maxRetries) {
        await sleep(this.retryDelayMs * (attempt + 1));
        continue;
      }
      return response;
    }
    return fetch(url, this.timed(init));
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const headers = createHeaders(this.type, this.apiKey);
    const tools = req.tools ? convertToolsForProvider(this.type, req.tools) : undefined;

    const body = buildRequestBody(
      this.type,
      this.model,
      req.messages.map((m) => ({ role: m.role, content: m.content })),
      req.systemPrompt,
      tools,
      false,
      req.temperature ?? this.temperature,
      req.maxTokens ?? this.maxTokens,
    );

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenAI API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    const content = extractContent(this.type, data);
    const toolCalls = extractToolCalls(this.type, data);

    const message = { role: 'assistant' as const, content };
    if (toolCalls.length > 0) {
      message.content = content || JSON.stringify(toolCalls);
    }

    return {
      message,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *completeStream(req: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const headers = createHeaders(this.type, this.apiKey);
    const tools = req.tools ? convertToolsForProvider(this.type, req.tools) : undefined;

    const body = buildRequestBody(
      this.type,
      this.model,
      req.messages.map((m) => ({ role: m.role, content: m.content })),
      req.systemPrompt,
      tools,
      true,
      req.temperature ?? this.temperature,
      req.maxTokens ?? this.maxTokens,
    );

    let response: Response;
    try {
      response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      yield { type: 'error', content: `OpenAI API error: ${msg}` };
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      yield { type: 'error', content: `OpenAI API error (${response.status}): ${text}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', content: 'No response body stream' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    // Structured tool calls arrive as fragmented deltas (name on first delta,
    // arguments streamed across many deltas). Reassemble them here so the
    // engine can extract & execute a complete {"name":"...","args":{...}}.
    const structuredToolCalls = new Map<number, { name: string; args: string }>();
    let sawDone = false;

    try {
      while (!sawDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            sawDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              yield { type: 'text', content: delta.content };
            }

            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const index = typeof tc.index === 'number' ? tc.index : structuredToolCalls.size;
                const entry = structuredToolCalls.get(index) ?? { name: '', args: '' };
                if (tc.function?.name) entry.name = tc.function.name;
                if (tc.function?.arguments) entry.args += tc.function.arguments;
                structuredToolCalls.set(index, entry);
              }
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Reassemble structured tool calls into extractable JSON and relay them
    // (as a tool-call chunk, never as text) so they don't leak into the reply.
    for (const tc of structuredToolCalls.values()) {
      if (tc.name && tc.args) {
        yield {
          type: 'tool-call',
          content: `{"name":${JSON.stringify(tc.name)},"args":${tc.args}}`,
          toolName: tc.name,
        };
      }
    }

    yield { type: 'done', content: '', done: true };
  }
}
