import { OpenAIProvider } from './openai';
import type { AIProviderConfig } from '../types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterProvider extends OpenAIProvider {
  constructor(config: AIProviderConfig = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      model: config.model ?? 'openai/gpt-4o-mini',
      _type: 'openrouter',
    });
  }
}
