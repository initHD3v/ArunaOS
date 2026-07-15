import type { AIProviderConfig, AIProviderType } from '../types';

export function normalizeBaseUrl(baseUrl: string | undefined, defaultUrl: string): string {
  if (!baseUrl) return defaultUrl;
  return baseUrl.replace(/\/+$/, '');
}

export function createHeaders(provider: AIProviderType, apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    switch (provider) {
      case 'anthropic':
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      default:
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  return headers;
}

export function extractContent(provider: AIProviderType, data: unknown): string {
  if (!data) return '';

  const d = data as Record<string, unknown>;

  switch (provider) {
    case 'anthropic': {
      const content = d.content;
      if (Array.isArray(content)) {
        return content.map((c: Record<string, unknown>) => c.text ?? '').join('');
      }
      return String(content ?? '');
    }
    default: {
      const choices = d.choices as Array<Record<string, unknown>> | undefined;
      if (choices?.[0]) {
        const msg = choices[0].message as Record<string, unknown> | undefined;
        return String(msg?.content ?? '');
      }
      return '';
    }
  }
}

export function extractToolCalls(
  provider: AIProviderType,
  data: unknown,
): Array<{ id: string; name: string; args: string }> {
  const d = data as Record<string, unknown>;

  switch (provider) {
    case 'anthropic': {
      const content = d.content as Array<Record<string, unknown>> | undefined;
      if (!content) return [];
      return content
        .filter((c) => c.type === 'tool_use')
        .map((c) => ({
          id: String(c.id ?? ''),
          name: String(c.name ?? ''),
          args: JSON.stringify(c.input ?? {}),
        }));
    }
    default: {
      const choices = d.choices as Array<Record<string, unknown>> | undefined;
      const firstChoice = choices?.[0];
      if (!firstChoice) return [];
      const message = firstChoice.message as Record<string, unknown> | undefined;
      const toolCalls = message?.tool_calls as
        Array<{ id: string; function: { name: string; arguments: string } }> | undefined;
      if (!toolCalls) return [];
      return toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: tc.function.arguments,
      }));
    }
  }
}

export function buildRequestBody(
  provider: AIProviderType,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
  tools?: Array<Record<string, unknown>>,
  stream?: boolean,
  temperature?: number,
  maxTokens?: number,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    stream: stream ?? false,
    temperature: temperature ?? 0.7,
    max_tokens: maxTokens ?? 4096,
  };

  switch (provider) {
    case 'anthropic': {
      const msgs = messages.filter((m) => m.role !== 'system');
      body.messages = msgs;
      if (systemPrompt) {
        body.system = systemPrompt;
      }
      if (tools && tools.length > 0) {
        body.tools = tools;
      }
      break;
    }
    default: {
      const msgs = [...messages];
      if (systemPrompt && !msgs.some((m) => m.role === 'system')) {
        msgs.unshift({ role: 'system', content: systemPrompt });
      }
      body.messages = msgs;
      if (tools && tools.length > 0 && provider !== 'ollama') {
        body.tools = tools;
      }
      if (provider !== 'ollama') {
        body.response_format = { type: 'text' };
      }
      break;
    }
  }

  return body;
}

export function detectProviders(): Array<{ type: AIProviderType; config: AIProviderConfig }> {
  const providers: Array<{ type: AIProviderType; config: AIProviderConfig }> = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      type: 'openai',
      config: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL,
      },
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      type: 'openrouter',
      config: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: process.env.OPENROUTER_BASE_URL,
        model: process.env.OPENROUTER_MODEL,
      },
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      type: 'anthropic',
      config: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        model: process.env.ANTHROPIC_MODEL,
      },
    });
  }

  if (process.env.OLLAMA_BASE_URL) {
    providers.push({
      type: 'ollama',
      config: {
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL,
      },
    });
  }

  return providers;
}

export function convertToolsForProvider(
  provider: AIProviderType,
  tools: import('../types').AITool[],
): Array<Record<string, unknown>> {
  if (provider === 'anthropic') {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map((p) => [
            p.name,
            { type: p.type, description: p.description, enum: p.enum },
          ]),
        ),
        required: tool.parameters.filter((p) => p.required).map((p) => p.name),
      },
    }));
  }

  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map((p) => [
            p.name,
            { type: p.type, description: p.description, enum: p.enum },
          ]),
        ),
        required: tool.parameters.filter((p) => p.required).map((p) => p.name),
      },
    },
  }));
}
