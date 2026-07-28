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
          `- get_weather(lat?, lon?, city?): Get real-time weather data. Use when user asks about weather, forecast, or temperature. ` +
          `- get_calendar: Get current date/time/week/month/year/calendar grid. Use when user asks what day/date/month/year it is, or about calendar. ` +
          `- search(query, category?): Search for content in files, modules, settings, or apps ` +
          `- get_system_context: Get current system context (active windows, workspace, theme, modules) ` +
          `- notify(title, message, type?): Send a desktop notification ` +
          `- execute_command(command, params?): Execute a system action ` +
          `- generate_module(name, description, capabilities?): Generate a new ArunaOS module\n` +
          `IMPORTANT: When the user asks about WEATHER → ONLY output {"name":"get_weather","args":{}} on its own line. Nothing else. ` +
          `When the user asks about DATE, TIME, DAY, MONTH, YEAR, or CALENDAR → ONLY output {"name":"get_calendar","args":{}} on its own line. Nothing else. ` +
          `For other actions (open app, search, notify, etc.) → ONLY output the JSON tool call on its own line. Nothing else. ` +
          `The system will execute your tool and respond to the user naturally. ` +
          `DO NOT add any explanation, commentary, or extra text after the JSON. ` +
          `For normal conversation (no tool needed), just respond naturally without any JSON.`,
      );
    }

    return parts.join('\n\n');
  }

  /**
   * Extract JSON tool call(s) from text content.
   * Supports both pure JSON and mixed text-with-embedded-JSON.
   * Returns tool results + cleaned content (JSON stripped).
   */
  private async extractToolCalls(content: string): Promise<{
    toolResults: AIMessage[];
    contextUpdated: boolean;
    cleanedContent: string;
    found: boolean;
  }> {
    const toolResults: AIMessage[] = [];
    let contextUpdated = false;
    let cleanedContent = content;
    let found = false;

    if (!content) return { toolResults, contextUpdated, cleanedContent, found };

    // Try parsing the entire content as pure JSON first (fast path)
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      let parsed: Array<{ name: string; args: Record<string, unknown> }>;
      try {
        const raw = JSON.parse(trimmed) as
          | Array<{ name: string; args: Record<string, unknown> }>
          | { name: string; args: Record<string, unknown> };
        parsed = Array.isArray(raw) ? raw : [raw];
        const valid = parsed.every(
          (c) => typeof c.name === 'string' && c.args && typeof c.args === 'object',
        );
        if (valid) {
          found = true;
          cleanedContent = '';
          for (const call of parsed) {
            await this.executeSingleTool(call, toolResults);
            if (call.name === 'get_system_context') contextUpdated = true;
          }
          return { toolResults, contextUpdated, cleanedContent, found };
        }
      } catch {
        // Not pure JSON — fall through to regex extraction
      }
    }

    // Mixed content: scan for {"name":"...","args":{...}} patterns via regex
    const toolCallRegex =
      /\{"name"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*\}/g;
    let match: RegExpExecArray | null;
    const seenToolNames = new Set<string>();

    while ((match = toolCallRegex.exec(content)) !== null) {
      const rawName = match[1];
      const rawArgs = match[2] ?? '';
      if (!rawName || !rawArgs) continue;

      let argsObj: Record<string, unknown>;
      try {
        argsObj = JSON.parse(rawArgs) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (typeof argsObj !== 'object' || argsObj === null) continue;

      // Avoid re-executing the same tool name
      if (seenToolNames.has(rawName)) continue;
      seenToolNames.add(rawName);

      found = true;
      await this.executeSingleTool({ name: rawName, args: argsObj }, toolResults);
      if (rawName === 'get_system_context') contextUpdated = true;
    }

    // Strip all JSON tool call patterns from the content
    if (found) {
      cleanedContent = content
        .replace(toolCallRegex, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return { toolResults, contextUpdated, cleanedContent, found };
  }

  private async executeSingleTool(
    call: { name: string; args: Record<string, unknown> },
    results: AIMessage[],
  ): Promise<void> {
    const tool = this.tools.get(call.name);
    if (!tool) return;
    try {
      const result = await tool.execute(call.args);
      results.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolName: call.name,
        toolCallId: call.name,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      results.push({
        role: 'tool',
        content: JSON.stringify({ success: false, error: errorMessage }),
        toolName: call.name,
        toolCallId: call.name,
      });
    }
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

    // Extract tool calls from response (handles both pure JSON and mixed content)
    const { toolResults, cleanedContent } = await this.extractToolCalls(
      response.message.content ?? '',
    );

    if (toolResults.length > 0) {
      const followUp = await provider.complete({
        messages: [...req.messages, { role: 'assistant', content: cleanedContent }, ...toolResults],
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

    // Buffer text chunks until stream ends to detect tool calls before displaying
    const textBuffer: string[] = [];
    let fullContent = '';

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        textBuffer.push(chunk.content);
        fullContent += chunk.content;
      } else {
        yield chunk;
      }
    }

    // Extract tool calls from the full content
    const { toolResults, cleanedContent } = await this.extractToolCalls(fullContent);

    if (toolResults.length > 0) {
      // Tool calls found — do NOT replay the raw text (which contains JSON)
      // Instead, yield tool results and generate a follow-up response

      for (const result of toolResults) {
        yield {
          type: 'tool-result',
          content: result.content,
          toolName: result.toolName,
        };
      }

      const followUpStream = provider.completeStream({
        messages: [...req.messages, { role: 'assistant', content: cleanedContent }, ...toolResults],
        systemPrompt,
        temperature: req.temperature,
      });

      for await (const chunk of followUpStream) {
        yield chunk;
      }
    } else {
      // No tool calls — replay buffered text to the client
      for (const content of textBuffer) {
        yield { type: 'text', content };
      }
    }
  }
}
