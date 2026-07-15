export type AIToolCategory = 'system' | 'module' | 'workspace' | 'files' | 'search';

export interface AIToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface AITool {
  id: string;
  name: string;
  description: string;
  category: AIToolCategory;
  parameters: AIToolParameter[];
  execute: (params: Record<string, unknown>) => Promise<AIToolResult>;
}

export interface AIToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
  timestamp?: number;
}

export interface AIStreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'done' | 'error';
  content: string;
  toolCallId?: string;
  toolName?: string;
  done?: boolean;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  systemPrompt?: string;
  tools?: AITool[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Inline provider config — if present, creates a one-shot provider for this request */
  providerConfig?: { type: AIProviderType } & AIProviderConfig;
}

export interface AICompletionResponse {
  message: AIMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AIProviderType = 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'lmstudio';

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  readonly type: AIProviderType;
  readonly model: string;
  complete(req: AICompletionRequest): Promise<AICompletionResponse>;
  completeStream(req: AICompletionRequest): AsyncGenerator<AIStreamChunk>;
  isAvailable(): boolean;
}

export interface ChatSessionConfig {
  id: string;
  systemPrompt?: string;
  maxHistory?: number;
  tools?: AITool[];
  provider?: AIProviderType;
  providerConfig?: { type: AIProviderType } & AIProviderConfig;
}

export interface ChatSessionState {
  id: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
  provider: AIProviderType;
  model: string;
}

export interface AIServiceConfig {
  defaultProvider?: AIProviderType;
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: AITool[];
}

export interface SystemContext {
  os: {
    platform: string;
    version: string;
    uptime: number;
  };
  workspace: {
    activeWindows: number;
    activeWorkspace: string;
    theme: string;
  };
  modules: {
    total: number;
    active: number;
    installed: Array<{ id: string; name: string; version: string }>;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
  };
}
