// Core types
export * from './types';

// Providers
export {
  OpenAIProvider,
  AnthropicProvider,
  OpenRouterProvider,
  OllamaProvider,
  detectProviders,
} from './providers';

// Core services
export { AIService } from './ai-service';
export { ChatSession } from './chat-session';

// Tools
export { ToolRegistry, getDefaultTools } from './tools';
export type { AITool, AIToolResult } from './types';

// Context
export { createSystemContext, formatSystemContext } from './context/system-context';

// Module generation
export { ModuleGenerator } from './module-generator';
export { AIModuleGenerator } from './ai-generator';
export type { GeneratorResult, GeneratorOptions } from './module-generator';
