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
import { DeepSeekProvider } from './providers/deepseek';
import { detectProviders } from './providers/interface';
import { ToolRegistry } from './tools/registry';
import { ToolRouter } from './tools/tool-router';
import { ToolResultFormatter } from './tools/tool-formatter';
import { ContextValidator } from './tools/context-validator';
import { MODULE_REGISTRY } from './tools/system-tools';
import { webSearch, shouldSearchWeb } from './tools/web-search';

export class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProviderType: AIProviderType;
  private defaultModel?: string;
  private systemPrompt?: string;
  private tools: ToolRegistry;
  private maxTokens: number;
  private temperature: number;
  private toolRouter: ToolRouter;
  private toolFormatter: ToolResultFormatter;
  private validator: ContextValidator;

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

    this.toolRouter = new ToolRouter();
    this.toolFormatter = new ToolResultFormatter();
    this.validator = new ContextValidator();

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
      case 'deepseek':
        this.providers.set(type, new DeepSeekProvider(cfg));
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
      case 'deepseek':
        return new DeepSeekProvider(cfg);
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
        `IMPORTANT:\n` +
          `- When the user says "Berikut informasi yang saya dapatkan:" they are giving you ` +
          `accurate and current data. Your training data about dates, times, weather, and ` +
          `current events is outdated. Trust the user's information.\n` +
          `- Calendar data for any year (e.g. 2025, 2026, 2027) that the user provides IS correct.\n` +
          `- Weather data the user provides IS real-time and accurate.\n` +
          `- Never say you "don't have real-time data" or "training data is outdated" ` +
          `when the user has already given you the information.\n` +
          `- If the user doesn't provide specific information, chat normally. Be concise and helpful in Indonesian.`,
      );
    }

    // Teach every model HOW to invoke tools — without this, small/local models
    // hallucinate tool usage instead of emitting a parseable call.
    const toolList = this.tools.getAll();
    if (toolList.length > 0) {
      const lines = toolList.map((t) => {
        const params = t.parameters
          .map((p) => `${p.name}${p.required ? '' : '?'}:${p.type}`)
          .join(', ');
        return `- ${t.name}(${params}): ${t.description}`;
      });
      parts.push(
        `TOOL CALLING:\n` +
          `You can execute system tools. To run one, reply with ONLY this JSON ` +
          `(no markdown fences, no extra text):\n` +
          `{"name":"<tool_name>","args":{<parameters>}}\n` +
          `Available tools:\n${lines.join('\n')}\n` +
          `After the system executes the tool, you will receive its result and must ` +
          `summarize it for the user in Indonesian. If no tool is needed, just answer normally.`,
      );
    }

    return parts.join('\n\n');
  }

  /**
   * Normalize a tool-call `args` value. OpenAI-compatible providers serialize
   * native `function.arguments` as a JSON *string*, while the text-based
   * convention uses an inline object — accept both.
   */
  private normalizeToolArgs(args: unknown): Record<string, unknown> | null {
    if (typeof args === 'string') {
      try {
        const parsed = JSON.parse(args) as unknown;
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        /* not JSON */
      }
      return null;
    }
    if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
      return args as Record<string, unknown>;
    }
    return null;
  }

  /**
   * Extract JSON tool call(s) from text content.
   * Supports pure JSON (object or array, incl. OpenAI-style entries with extra
   * fields like `id` and stringified `args`) and mixed text-with-embedded-JSON.
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
      try {
        const raw = JSON.parse(trimmed) as Array<Record<string, unknown>> | Record<string, unknown>;
        const list = Array.isArray(raw) ? raw : [raw];
        const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
        for (const item of list) {
          if (!item || typeof item !== 'object' || typeof item.name !== 'string') {
            calls.length = 0;
            break;
          }
          const args = this.normalizeToolArgs(item.args) ?? this.normalizeToolArgs(item.arguments);
          if (!args) {
            calls.length = 0;
            break;
          }
          calls.push({ name: item.name, args });
        }
        if (calls.length > 0) {
          found = true;
          cleanedContent = '';
          for (const call of calls) {
            await this.executeSingleTool(call, toolResults);
            if (call.name === 'get_system_context') contextUpdated = true;
          }
          return { toolResults, contextUpdated, cleanedContent, found };
        }
      } catch {
        // Not pure JSON — fall through to regex extraction
      }
    }

    // DeepSeek native tool-call format:
    // <｜tool▁call▁begin｜>function<｜tool▁sep｜>TOOL_NAME\n```json\n{args}\n```<｜tool▁call▁end｜>
    const seenToolNames = new Set<string>();
    const deepseekRegex =
      /<｜tool▁sep｜>\s*([a-zA-Z_][a-zA-Z0-9_]*)[\s\S]*?(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})/g;
    let dsMatch: RegExpExecArray | null;
    while ((dsMatch = deepseekRegex.exec(content)) !== null) {
      const rawName = dsMatch[1];
      const rawArgs = dsMatch[2] ?? '';
      if (!rawName || !rawArgs) continue;
      let argsObj: Record<string, unknown>;
      try {
        argsObj = JSON.parse(rawArgs) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (typeof argsObj !== 'object' || argsObj === null) continue;
      if (seenToolNames.has(rawName)) continue;
      seenToolNames.add(rawName);
      found = true;
      await this.executeSingleTool({ name: rawName, args: argsObj }, toolResults);
      if (rawName === 'get_system_context') contextUpdated = true;
    }

    // Mixed content: scan for {"name":"...","args":{...}} patterns via regex
    const toolCallRegex =
      /\{"name"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\s*\}/g;
    let match: RegExpExecArray | null;

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

    // Mixed content (stringified args variant): {"name":"...","args":"{...}"}
    const toolCallStrArgsRegex =
      /\{"name"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
    let strMatch: RegExpExecArray | null;
    while ((strMatch = toolCallStrArgsRegex.exec(content)) !== null) {
      const rawName = strMatch[1];
      const rawArgs = strMatch[2] ?? '';
      if (!rawName || !rawArgs) continue;

      const argsObj = this.normalizeToolArgs(rawArgs);
      if (!argsObj) continue;

      if (seenToolNames.has(rawName)) continue;
      seenToolNames.add(rawName);

      found = true;
      await this.executeSingleTool({ name: rawName, args: argsObj }, toolResults);
      if (rawName === 'get_system_context') contextUpdated = true;
    }

    // Strip all JSON tool call patterns from the content
    if (found) {
      cleanedContent = content
        .replace(/<｜tool▁calls▁begin｜>[\s\S]*?<｜tool▁calls▁end｜>/g, '')
        .replace(toolCallRegex, '')
        .replace(toolCallStrArgsRegex, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // DeepSeek control tokens must never leak into chat even when no valid
    // tool call was extracted from them.
    cleanedContent = cleanedContent
      .replace(/<｜tool▁[a-zA-Z▁]*｜>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // If nothing usable was produced and the whole reply is just JSON (e.g. a
    // malformed tool-call like `{"query":"..."}` leaked as text), drop it so raw
    // JSON never surfaces in the chat.
    const jsonOnlyContent = content.trim();
    if (!found && (jsonOnlyContent.startsWith('{') || jsonOnlyContent.startsWith('['))) {
      cleanedContent = '';
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

  private generateFallbackContext(messages: AIMessage[]): string | null {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return null;
    const lower = lastUserMsg.content.toLowerCase();

    const fallbacks: Array<{ keywords: string[]; message: string }> = [
      {
        keywords: ['presiden indonesia', 'presiden ri', 'siapa presiden'],
        message:
          'Presiden Indonesia saat ini adalah Prabowo Subianto, menjabat sejak 20 Oktober 2024.',
      },
      {
        keywords: ['prabowo'],
        message:
          'Prabowo Subianto adalah Presiden Indonesia ke-8 yang menjabat sejak 20 Oktober 2024.',
      },
      {
        keywords: ['ibu kota indonesia', 'ibukota indonesia', 'capital of indonesia'],
        message: 'Ibukota Indonesia adalah Nusantara di Kalimantan Timur.',
      },
      {
        keywords: ['wakil presiden'],
        message:
          'Wakil Presiden Indonesia adalah Gibran Rakabuming Raka, menjabat sejak 20 Oktober 2024.',
      },
    ];

    for (const fb of fallbacks) {
      if (fb.keywords.some((k) => lower.includes(k))) {
        return fb.message;
      }
    }

    return null;
  }

  private async routeAndExecute(messages: AIMessage[]): Promise<{ contextNote: string } | null> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return null;

    const route = this.toolRouter.route(lastUserMsg.content, {
      modules: MODULE_REGISTRY,
    });

    if (!route) return null;

    const tool = this.tools.get(route.tool);
    if (!tool) return null;

    try {
      const result = await tool.execute(route.args);
      if (!result.success) return null;
      const contextNote = this.toolFormatter.format(route.tool, result);
      return { contextNote };
    } catch {
      return null;
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

    if (isLocalModel) {
      const routed = await this.routeAndExecute(req.messages);
      if (routed) {
        const lastUserIdx = req.messages.map((m) => m.role).lastIndexOf('user');
        const enrichedMessages = [...req.messages];
        const originalUserContent =
          lastUserIdx >= 0 ? (enrichedMessages[lastUserIdx]?.content ?? '') : '';

        if (lastUserIdx >= 0 && originalUserContent) {
          enrichedMessages[lastUserIdx] = {
            role: 'user' as const,
            content: `${routed.contextNote}\n\nPertanyaan saya: ${originalUserContent}`,
          };
        }

        let response = await provider.complete({
          messages: enrichedMessages,
          systemPrompt,
          temperature: req.temperature,
          maxTokens: req.maxTokens,
        });

        let retries = 0;
        let status = this.validator.validate(response.message.content, routed.contextNote, retries);

        const retryInstructions = [
          'PENTING: Jawab berdasarkan data di atas, jangan gunakan pengetahuan lama.',
          'PENTING INI: Jawab persis sesuai data di atas. Abaikan pengetahuan usang Anda.',
        ];

        while (status === 'retry' && retries < 2) {
          const instruction = retryInstructions[retries] ?? '';
          retries++;
          if (lastUserIdx >= 0 && originalUserContent) {
            enrichedMessages[lastUserIdx] = {
              role: 'user' as const,
              content: `${routed.contextNote}\n\n${instruction}\n\nPertanyaan saya: ${originalUserContent}`,
            };
          }
          response = await provider.complete({
            messages: enrichedMessages,
            systemPrompt,
            temperature: req.temperature,
            maxTokens: req.maxTokens,
          });
          status = this.validator.validate(response.message.content, routed.contextNote, retries);
        }

        if (status === 'override') {
          response.message.content = this.validator.generateSafeResponse(routed.contextNote);
        }

        return response;
      }

      const fallback = this.generateFallbackContext(req.messages);
      if (fallback) {
        return {
          message: { role: 'assistant' as const, content: fallback, timestamp: Date.now() },
        };
      }

      const query = req.messages
        .map((m) => (m.role === 'user' ? m.content : ''))
        .filter(Boolean)
        .join(' ');
      if (req.webSearchEnabled !== false && shouldSearchWeb(query)) {
        const searchResult = await webSearch(query);
        if (searchResult) {
          const lastUserIdx = req.messages.map((m) => m.role).lastIndexOf('user');
          const enrichedMessages = [...req.messages];
          if (lastUserIdx >= 0) {
            const original = enrichedMessages[lastUserIdx];
            if (original) {
              enrichedMessages[lastUserIdx] = {
                role: 'user' as const,
                content: `Informasi dari web:\n${searchResult}\n\nPertanyaan saya: ${original.content}`,
              };
            }
          }
          return provider.complete({
            messages: enrichedMessages,
            systemPrompt,
            temperature: req.temperature,
            maxTokens: req.maxTokens,
          });
        }
      }

      return provider.complete({
        messages: req.messages,
        systemPrompt,
        temperature: req.temperature,
        maxTokens: req.maxTokens,
      });
    }

    const response = await provider.complete({
      ...cleanReq,
      systemPrompt,
      tools: allTools.length > 0 ? allTools : undefined,
    });

    // Extract tool calls from response (handles both pure JSON and mixed content)
    const { toolResults, cleanedContent } = await this.extractToolCalls(
      response.message.content ?? '',
    );

    if (toolResults.length > 0) {
      const followUpMessages: AIMessage[] = [
        ...req.messages,
        { role: 'assistant' as const, content: response.message.content ?? '' },
        ...toolResults,
      ];
      const followUp = await provider.complete({
        messages: followUpMessages,
        systemPrompt,
        temperature: req.temperature,
      });
      return followUp;
    }

    // Safety net: if the whole reply was malformed tool-call JSON that could
    // not be executed, never surface the raw JSON to the user.
    if (
      cleanedContent === '' &&
      response.message.content &&
      /^[[{]/.test(response.message.content.trim())
    ) {
      return {
        ...response,
        message: {
          ...response.message,
          content:
            'Maaf, saya belum bisa memproses perintah tersebut. Coba rumuskan dengan cara lain.',
        },
      };
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

    yield { type: 'status', content: 'Thinking...', status: 'thinking' };

    if (isLocalModel) {
      const routed = await this.routeAndExecute(req.messages);
      if (routed) {
        const lastUserIdx = req.messages.map((m) => m.role).lastIndexOf('user');
        const enrichedMessages = [...req.messages];
        if (lastUserIdx >= 0) {
          const original = enrichedMessages[lastUserIdx];
          if (original) {
            enrichedMessages[lastUserIdx] = {
              role: 'user' as const,
              content: `${routed.contextNote}\n\nPertanyaan saya: ${original.content}`,
            };
          }
        }
        const stream = provider.completeStream({
          messages: enrichedMessages,
          systemPrompt,
          temperature: req.temperature,
        });
        const textChunks: string[] = [];
        let yieldedTool = false;
        for await (const chunk of stream) {
          if (chunk.type === 'text') {
            textChunks.push(chunk.content);
            yield chunk;
          } else {
            yieldedTool = true;
            yield chunk;
          }
        }
        if (!yieldedTool) {
          const fullContent = textChunks.join('');
          const status = this.validator.validate(fullContent, routed.contextNote, 0);
          if (status === 'override' || status === 'retry') {
            const correction = this.validator.generateSafeResponse(routed.contextNote);
            yield { type: 'text', content: `\n\n${correction}` };
          }
        }
        yield { type: 'status', content: '', status: 'done' };
        return;
      }

      const fallback = this.generateFallbackContext(req.messages);
      if (fallback) {
        yield { type: 'text', content: fallback };
        yield { type: 'status', content: '', status: 'done' };
        yield { type: 'done', content: '', done: true };
        return;
      }

      const query = req.messages
        .map((m) => (m.role === 'user' ? m.content : ''))
        .filter(Boolean)
        .join(' ');
      if (req.webSearchEnabled !== false && shouldSearchWeb(query)) {
        yield { type: 'status', content: 'Searching web...', status: 'searching' };
        const searchResult = await webSearch(query);
        if (searchResult) {
          const lastUserIdx = req.messages.map((m) => m.role).lastIndexOf('user');
          const enrichedMessages = [...req.messages];
          if (lastUserIdx >= 0) {
            const original = enrichedMessages[lastUserIdx];
            if (original) {
              enrichedMessages[lastUserIdx] = {
                role: 'user' as const,
                content: `Informasi dari web:\n${searchResult}\n\nPertanyaan saya: ${original.content}`,
              };
            }
          }
          const webStream = provider.completeStream({
            messages: enrichedMessages,
            systemPrompt,
            temperature: req.temperature,
          });
          for await (const chunk of webStream) {
            yield chunk;
          }
          yield { type: 'status', content: '', status: 'done' };
          return;
        }
      }

      const passthroughStream = provider.completeStream({
        messages: req.messages,
        systemPrompt,
        temperature: req.temperature,
      });
      for await (const chunk of passthroughStream) {
        yield chunk;
      }
      yield { type: 'status', content: '', status: 'done' };
    }

    const stream = provider.completeStream({
      ...cleanReq,
      systemPrompt,
      tools: allTools.length > 0 ? allTools : undefined,
    });

    const textBuffer: string[] = [];
    let fullContent = '';

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        textBuffer.push(chunk.content);
        fullContent += chunk.content;
      } else if (
        chunk.type === 'tool-call' &&
        chunk.content &&
        (chunk.content.startsWith('{') || chunk.content.startsWith('['))
      ) {
        // Accumulate tool-call arguments so a well-formed {"name","args"} JSON
        // can be extracted and executed later. Chunk is relayed (client ignores it).
        fullContent += chunk.content;
        yield chunk;
      } else {
        yield chunk;
      }
    }

    const { toolResults, cleanedContent } = await this.extractToolCalls(fullContent);

    if (toolResults.length > 0) {
      for (const result of toolResults) {
        yield {
          type: 'tool-result',
          content: result.content,
          toolName: result.toolName,
        };
      }

      const followUpMessages: AIMessage[] = [
        ...req.messages,
        { role: 'assistant' as const, content: fullContent },
        ...toolResults,
      ];
      const followUpStream = provider.completeStream({
        messages: followUpMessages,
        systemPrompt,
        temperature: req.temperature,
      });

      for await (const chunk of followUpStream) {
        yield chunk;
      }
    } else {
      // Only suppress the reply if the whole output was malformed tool-call JSON
      // (stripped by extractToolCalls). Otherwise stream the prose chunk-by-chunk.
      const combined = textBuffer.join('');
      const jsonNoise =
        toolResults.length === 0 &&
        cleanedContent === '' &&
        (combined.startsWith('{') || combined.startsWith('['));
      if (!jsonNoise) {
        for (const content of textBuffer) {
          yield { type: 'text', content };
        }
      }
    }
    yield { type: 'status', content: '', status: 'done' };
  }
}
