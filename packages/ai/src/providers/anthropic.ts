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
  buildRequestBody,
  convertToolsForProvider,
} from './interface';

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-3-haiku-20240307';

export class AnthropicProvider implements AIProvider {
  readonly type = 'anthropic' as const;
  readonly model: string;
  private baseUrl: string;
  private apiKey?: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIProviderConfig = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = normalizeBaseUrl(config.baseUrl, DEFAULT_BASE_URL);
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
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

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Anthropic API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    const content = extractContent(this.type, data);

    return {
      message: { role: 'assistant', content },
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
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

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      yield { type: 'error', content: `Anthropic API error (${response.status}): ${text}` };
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
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield { type: 'text', content: parsed.delta.text };
            }
            if (
              parsed.type === 'content_block_start' &&
              parsed.content_block?.type === 'tool_use'
            ) {
              yield {
                type: 'tool-call',
                content: parsed.content_block.name,
                toolCallId: parsed.content_block.id,
                toolName: parsed.content_block.name,
              };
            }
            if (parsed.type === 'message_stop') {
              yield { type: 'done', content: '', done: true };
              return;
            }
          } catch {
            // skip malformed
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'done', content: '', done: true };
  }
}
