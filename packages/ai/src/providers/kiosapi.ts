import { OpenAIProvider } from './openai';
import type { AIProviderConfig } from '../types';

const DEFAULT_BASE_URL = 'https://api.kiosapi.com/v1';
const DEFAULT_MODEL = 'kios-model';

export class KiosapiProvider extends OpenAIProvider {
  constructor(config: AIProviderConfig = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      model: config.model ?? DEFAULT_MODEL,
      _type: 'kiosapi',
    });
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
