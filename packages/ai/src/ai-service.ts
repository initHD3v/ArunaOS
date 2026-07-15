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
import { createSystemContext } from './context/system-context';

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

  private buildSystemPrompt(customPrompt?: string): string {
    const parts: string[] = [];

    if (customPrompt ?? this.systemPrompt) {
      parts.push(customPrompt ?? this.systemPrompt ?? '');
    }

    parts.push(
      `You are the ArunaOS AI — the brain, heart, and soul of this operating system. ` +
        `You help users with tasks, answer questions, control the system, and generate modules. ` +
        `You are running in a web-based operating system. ` +
        `You can execute system tools to interact with the OS. ` +
        `Be concise, helpful, and knowledgeable. ` +
        `Current time: ${new Date().toISOString()}`,
    );

    return parts.join('\n\n');
  }

  private async processToolCalls(
    message: AIMessage,
  ): Promise<{ toolResults: AIMessage[]; contextUpdated: boolean }> {
    const toolResults: AIMessage[] = [];
    let contextUpdated = false;

    if (!message.content) return { toolResults, contextUpdated };

    let parsed: Array<{ name: string; args: Record<string, unknown> }>;
    try {
      const raw = JSON.parse(message.content) as
        | Array<{ name: string; args: Record<string, unknown> }>
        | { name: string; args: Record<string, unknown> };
      parsed = Array.isArray(raw) ? raw : [raw];
    } catch {
      // Check for system context tool call pattern
      if (message.content.includes('get_system_context')) {
        const ctx = await createSystemContext();
        toolResults.push({
          role: 'tool',
          content: JSON.stringify(ctx),
          toolName: 'get_system_context',
        });
        contextUpdated = true;
      }
      return { toolResults, contextUpdated };
    }

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
    const systemPrompt = this.buildSystemPrompt(req.systemPrompt);

    const contextTools = this.tools.getAll();
    const allTools = [...(req.tools ?? []), ...contextTools];

    const cleanReq = { ...req };
    delete (cleanReq as Record<string, unknown>).providerConfig;

    const response = await provider.complete({
      ...cleanReq,
      systemPrompt,
      tools: allTools.length > 0 ? allTools : undefined,
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
    const systemPrompt = this.buildSystemPrompt(req.systemPrompt);

    const contextTools = this.tools.getAll();
    const allTools = [...(req.tools ?? []), ...contextTools];

    const cleanReq = { ...req };
    delete (cleanReq as Record<string, unknown>).providerConfig;

    const stream = provider.completeStream({
      ...cleanReq,
      systemPrompt,
      tools: allTools.length > 0 ? allTools : undefined,
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
