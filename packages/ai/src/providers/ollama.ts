import type {
  AIProvider,
  AIProviderConfig,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '../types';
import { normalizeBaseUrl } from './interface';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

export class OllamaProvider implements AIProvider {
  readonly type = 'ollama' as const;
  readonly model: string;
  private baseUrl: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIProviderConfig = {}) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl, DEFAULT_BASE_URL);
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
  }

  isAvailable(): boolean {
    return true; // Ollama is local, always available if configured
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const messages = req.messages.map((m) => ({ role: m.role, content: m.content }));
    if (req.systemPrompt) {
      messages.unshift({ role: 'system', content: req.systemPrompt });
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: req.temperature ?? this.temperature,
          num_predict: req.maxTokens ?? this.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    return {
      message: { role: 'assistant', content: data.message?.content ?? '' },
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: (data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0),
          }
        : undefined,
    };
  }

  async *completeStream(req: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const messages = req.messages.map((m) => ({ role: m.role, content: m.content }));
    if (req.systemPrompt) {
      messages.unshift({ role: 'system', content: req.systemPrompt });
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        options: {
          temperature: req.temperature ?? this.temperature,
          num_predict: req.maxTokens ?? this.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      yield { type: 'error', content: `Ollama API error (${response.status}): ${text}` };
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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              yield { type: 'text', content: parsed.message.content };
            }
            if (parsed.done) {
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
