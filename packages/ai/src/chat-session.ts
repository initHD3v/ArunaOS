import type {
  AIMessage,
  AIStreamChunk,
  AIProviderType,
  AIProviderConfig,
  AITool,
  ChatSessionConfig,
  ChatSessionState,
} from './types';
import { AIService } from './ai-service';

export class ChatSession {
  readonly id: string;
  private messages: AIMessage[] = [];
  private systemPrompt: string;
  private maxHistory: number;
  private tools: AITool[];
  private provider: AIProviderType;
  private providerConfig?: { type: AIProviderType } & AIProviderConfig;
  private model: string;
  private aiService: AIService;
  private createdAt: number;
  private updatedAt: number;
  private streaming = false;

  constructor(config: ChatSessionConfig, aiService: AIService) {
    this.id = config.id;
    this.systemPrompt = config.systemPrompt ?? '';
    this.maxHistory = config.maxHistory ?? 100;
    this.tools = config.tools ?? [];
    this.provider = config.provider ?? 'openai';
    this.providerConfig = config.providerConfig;
    this.aiService = aiService;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.model = '';

    if (this.providerConfig?.model) {
      this.model = this.providerConfig.model;
    } else {
      const provider = aiService.getAvailableProviders().find((p) => p.type === this.provider);
      if (provider) {
        this.model = provider.model;
      }
    }
  }

  getState(): ChatSessionState {
    return {
      id: this.id,
      messages: [...this.messages],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      provider: this.provider,
      model: this.model,
    };
  }

  getMessages(): AIMessage[] {
    return [...this.messages];
  }

  addMessage(
    role: AIMessage['role'],
    content: string,
    toolName?: string,
    toolCallId?: string,
  ): void {
    const message: AIMessage = {
      role,
      content,
      timestamp: Date.now(),
    };
    if (toolName) message.toolName = toolName;
    if (toolCallId) message.toolCallId = toolCallId;
    this.messages.push(message);
    this.updatedAt = Date.now();

    if (this.messages.length > this.maxHistory) {
      this.messages = this.messages.slice(-this.maxHistory);
    }
  }

  clear(): void {
    this.messages = [];
    this.updatedAt = Date.now();
  }

  isStreaming(): boolean {
    return this.streaming;
  }

  async sendMessage(content: string): Promise<AIMessage> {
    this.addMessage('user', content);

    const request: Parameters<typeof this.aiService.complete>[0] = {
      messages: this.messages,
      systemPrompt: this.systemPrompt || undefined,
      tools: this.tools.length > 0 ? this.tools : undefined,
    };
    if (this.providerConfig) {
      request.providerConfig = this.providerConfig;
    }

    const response = await this.aiService.complete(request, this.provider);

    this.addMessage('assistant', response.message.content);
    return response.message;
  }

  async *sendMessageStream(content: string): AsyncGenerator<AIStreamChunk> {
    this.addMessage('user', content);
    this.streaming = true;

    let fullContent = '';

    try {
      const request: Parameters<typeof this.aiService.completeStream>[0] = {
        messages: this.messages,
        systemPrompt: this.systemPrompt || undefined,
        tools: this.tools.length > 0 ? this.tools : undefined,
      };
      if (this.providerConfig) {
        request.providerConfig = this.providerConfig;
      }

      const stream = this.aiService.completeStream(request, this.provider);

      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          fullContent += chunk.content;
        }
        yield chunk;
      }

      this.addMessage('assistant', fullContent);
    } finally {
      this.streaming = false;
    }
  }

  setProvider(provider: AIProviderType): void {
    this.provider = provider;
    const prov = this.aiService.getAvailableProviders().find((p) => p.type === provider);
    if (prov) {
      this.model = prov.model;
    }
  }

  getProvider(): AIProviderType {
    return this.provider;
  }

  getModel(): string {
    return this.model;
  }
}
