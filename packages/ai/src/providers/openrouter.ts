import { OpenAIProvider } from './openai';
import type { AIProviderConfig } from '../types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'z-ai/glm-5.2:free';

// Tool-calling capable free models used when the primary model is rate-limited
// (free-tier pools are shared across all OpenRouter users and fill up often).
const FREE_FALLBACK_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'z-ai/glm-5.2:free',
];

export class OpenRouterProvider extends OpenAIProvider {
  constructor(config: AIProviderConfig & { _fallbackModels?: string[] } = {}) {
    const model = config.model ?? DEFAULT_MODEL;
    super({
      ...config,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      model,
      _type: 'openrouter',
      _fallbackModels: config._fallbackModels ?? FREE_FALLBACK_MODELS.filter((m) => m !== model),
    });
  }
}
