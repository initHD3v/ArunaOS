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

export class OpenAIProvider implements AIProvider {
  readonly type: 'openai' | 'openrouter' = 'openai';
  readonly model: string;
  private baseUrl: string;
  private apiKey?: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIProviderConfig & { _type?: 'openai' | 'openrouter' } = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = normalizeBaseUrl(config.baseUrl, DEFAULT_BASE_URL);
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
    if (config._type) this.type = config._type;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

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

    try {
      while (true) {
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
            yield { type: 'done', content: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              yield { type: 'text', content: delta.content };
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) {
                  yield {
                    type: 'tool-call',
                    content: tc.function.name,
                    toolCallId: tc.id,
                    toolName: tc.function.name,
                  };
                }
                if (tc.function?.arguments) {
                  yield { type: 'text', content: tc.function.arguments };
                }
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

    yield { type: 'done', content: '', done: true };
  }
}
