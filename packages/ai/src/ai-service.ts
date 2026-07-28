import type {
  AIProvider,
  AIProviderType,
  AIServiceConfig,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  AITool,
  AIMessage,
} from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OpenRouterProvider } from './providers/openrouter';
import { OllamaProvider } from './providers/ollama';
import { detectProviders } from './providers/interface';
import { ToolRegistry } from './tools/registry';

export class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProviderType: AIProviderType;
  private defaultModel?: string;
  private systemPrompt?: string;
  private tools: ToolRegistry;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIServiceConfig = {}) {
    this.defaultProviderType = config.defaultProvider ?? 'openai';
    this.defaultModel = config.defaultModel;
    this.systemPrompt = config.systemPrompt;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
    this.tools = new ToolRegistry();

    if (config.tools) {
      for (const tool of config.tools) {
        this.tools.register(tool);
      }
    }

    this.autoDetectProviders();
  }

  private autoDetectProviders(): void {
    const detected = detectProviders();
    for (const { type, config } of detected) {
      if (!this.providers.has(type)) {
        this.registerProvider(type, config);
      }
    }
  }

  registerProvider(
    type: AIProviderType,
    config?: { apiKey?: string; baseUrl?: string; model?: string },
  ): void {
    const cfg = {
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl,
      model: config?.model ?? this.defaultModel,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
    };

    switch (type) {
      case 'openai':
        this.providers.set(type, new OpenAIProvider(cfg));
        break;
      case 'anthropic':
        this.providers.set(type, new AnthropicProvider(cfg));
        break;
      case 'openrouter':
        this.providers.set(type, new OpenRouterProvider(cfg));
        break;
      case 'ollama':
        this.providers.set(type, new OllamaProvider(cfg));
        break;
    }
  }

  getProvider(type?: AIProviderType): AIProvider {
    const providerType = type ?? this.defaultProviderType;
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider "${providerType}" is not registered`);
    }
    return provider;
  }

  private getProviderForRequest(
    req: AICompletionRequest,
    providerType?: AIProviderType,
  ): AIProvider {
    if (req.providerConfig) {
      return this.createProvider(req.providerConfig.type, req.providerConfig);
    }
    return this.getProvider(providerType);
  }

  createProvider(
    type: AIProviderType,
    config: { apiKey?: string; baseUrl?: string; model?: string },
  ): AIProvider {
    const cfg = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model ?? this.defaultModel,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
    };

    switch (type) {
      case 'openai':
        return new OpenAIProvider(cfg);
      case 'anthropic':
        return new AnthropicProvider(cfg);
      case 'openrouter':
        return new OpenRouterProvider(cfg);
      case 'ollama':
        return new OllamaProvider(cfg);
      case 'lmstudio': {
        const lmBaseUrl = (cfg.baseUrl ?? 'http://127.0.0.1:1234').replace(/\/$/, '');
        const finalUrl = lmBaseUrl.includes('/v1') ? lmBaseUrl : `${lmBaseUrl}/v1`;
        return new OpenAIProvider({ ...cfg, baseUrl: finalUrl });
      }
      case 'native':
        throw new Error('Native provider can only be used client-side');
    }
  }

  getAvailableProviders(): Array<{ type: AIProviderType; model: string; available: boolean }> {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      type,
      model: provider.model,
      available: provider.isAvailable(),
    }));
  }

  getToolRegistry(): ToolRegistry {
    return this.tools;
  }

  registerTool(tool: AITool): void {
    this.tools.register(tool);
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  private buildSystemPrompt(customPrompt?: string, providerType?: AIProviderType): string {
    const parts: string[] = [];

    if (customPrompt ?? this.systemPrompt) {
      parts.push(customPrompt ?? this.systemPrompt ?? '');
    }

    parts.push(
      `You are the ArunaOS AI — the brain, heart, and soul of this operating system. ` +
        `You help users with tasks, answer questions, control the system, and generate modules. ` +
        `You are running in a web-based operating system. ` +
        `Be concise, helpful, and knowledgeable. ` +
        `Current time: ${new Date().toISOString()}`,
    );

    if (providerType === 'ollama' || providerType === 'lmstudio') {
      parts.push(
        `Available tools (only use when the user asks for a system action): ` +
          `- get_system_info: Get system state information ` +
          `- open_app(appId): Open an application by ID (e.g., "arunaos.weather", "arunaos.files", "arunaos.settings") ` +
          `- get_weather(lat?, lon?, city?): Get real-time weather data for a location (uses IP geolocation if no coordinates given). ` +
          `  Returns current temperature, feels-like, humidity, wind speed, condition, emoji, ` +
          `  7-hour hourly forecast, and 7-day daily forecast. ` +
          `- get_calendar: Get current date/time info including day name, date, month, year, ISO week number, ` +
          `  day of year, month calendar grid, and timezone. ` +
          `- search(query, category?): Search for content in files, modules, settings, or apps ` +
          `- get_system_context: Get current system context ` +
          `- notify(title, message, type?): Send a desktop notification ` +
          `- execute_command(command, params?): Execute a system action ` +
          `- generate_module(name, description, capabilities?): Generate a new ArunaOS module\n` +
          `When the user asks you to check weather, use get_weather tool to fetch real data and then respond with the weather summary. ` +
          `When the user asks about date, time, or calendar, use get_calendar tool. ` +
          `When the user asks you to DO something (open an app, search, etc.), ` +
          `output a JSON tool call on its own line like {"name":"tool_name","args":{...}} ` +
          `and then briefly explain what you did. For normal conversation, just respond naturally.`,
      );
    }

    return parts.join('\n\n');
  }

  private async processToolCalls(
    message: AIMessage,
  ): Promise<{ toolResults: AIMessage[]; contextUpdated: boolean }> {
    const toolResults: AIMessage[] = [];
    let contextUpdated = false;

    if (!message.content) return { toolResults, contextUpdated };

    // Only parse as tool call if the ENTIRE message is a JSON object with name + args
    const trimmed = message.content.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('['))
      return { toolResults, contextUpdated };

    let parsed: Array<{ name: string; args: Record<string, unknown> }>;
    try {
      const raw = JSON.parse(trimmed) as
        | Array<{ name: string; args: Record<string, unknown> }>
        | { name: string; args: Record<string, unknown> };
      parsed = Array.isArray(raw) ? raw : [raw];
    } catch {
      return { toolResults, contextUpdated };
    }

    // Validate every item has name and args before executing
    const valid = parsed.every(
      (c) => typeof c.name === 'string' && c.args && typeof c.args === 'object',
    );
    if (!valid) return { toolResults, contextUpdated };

    for (const call of parsed) {
      const tool = this.tools.get(call.name);
      if (tool) {
        try {
          const result = await tool.execute(call.args);
          toolResults.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolName: call.name,
            toolCallId: call.name,
          });
          if (call.name === 'get_system_context') {
            contextUpdated = true;
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          toolResults.push({
            role: 'tool',
            content: JSON.stringify({ success: false, error: errorMessage }),
            toolName: call.name,
            toolCallId: call.name,
          });
        }
      }
    }

    return { toolResults, contextUpdated };
  }

  async complete(
    req: AICompletionRequest,
    providerType?: AIProviderType,
  ): Promise<AICompletionResponse> {
    const provider = this.getProviderForRequest(req, providerType);
    const systemPrompt = this.buildSystemPrompt(req.systemPrompt, req.providerConfig?.type);

    const contextTools = this.tools.getAll();
    const allTools = [...(req.tools ?? []), ...contextTools];

    const cleanReq = { ...req };
    delete (cleanReq as Record<string, unknown>).providerConfig;

    const isLocalModel =
      req.providerConfig?.type === 'ollama' || req.providerConfig?.type === 'lmstudio';

    const response = await provider.complete({
      ...cleanReq,
      systemPrompt,
      tools: !isLocalModel && allTools.length > 0 ? allTools : undefined,
    });

    // Process any tool calls
    const { toolResults } = await this.processToolCalls(response.message);
    if (toolResults.length > 0) {
      const followUp = await provider.complete({
        messages: [...req.messages, response.message, ...toolResults],
        systemPrompt,
        temperature: req.temperature,
      });
      return followUp;
    }

    return response;
  }

  async *completeStream(
    req: AICompletionRequest,
    providerType?: AIProviderType,
  ): AsyncGenerator<AIStreamChunk> {
    const provider = this.getProviderForRequest(req, providerType);
    const systemPrompt = this.buildSystemPrompt(req.systemPrompt, req.providerConfig?.type);

    const contextTools = this.tools.getAll();
    const allTools = [...(req.tools ?? []), ...contextTools];

    const cleanReq = { ...req };
    delete (cleanReq as Record<string, unknown>).providerConfig;

    const isLocalModel =
      req.providerConfig?.type === 'ollama' || req.providerConfig?.type === 'lmstudio';

    const stream = provider.completeStream({
      ...cleanReq,
      systemPrompt,
      tools: !isLocalModel && allTools.length > 0 ? allTools : undefined,
    });

    let fullContent = '';
    const toolCallAccumulator: string[] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        fullContent += chunk.content;
        toolCallAccumulator.push(chunk.content);
      }
      yield chunk;
    }

    // Process tool calls if detected
    if (fullContent) {
      const toolMessage: AIMessage = { role: 'assistant', content: fullContent };
      const { toolResults } = await this.processToolCalls(toolMessage);

      if (toolResults.length > 0) {
        for (const result of toolResults) {
          yield {
            type: 'tool-result',
            content: result.content,
            toolName: result.toolName,
          };
        }

        // Get final response after tool calls
        const followUpStream = provider.completeStream({
          messages: [...req.messages, toolMessage, ...toolResults],
          systemPrompt,
          temperature: req.temperature,
        });

        for await (const chunk of followUpStream) {
          yield chunk;
        }
      }
    }
  }
}
