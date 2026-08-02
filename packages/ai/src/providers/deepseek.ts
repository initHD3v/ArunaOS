import { OpenAIProvider } from './openai';
import type { AIProviderConfig } from '../types';

const DEFAULT_BASE_URL = 'https://q5dh1rfszfym23hj.us-east-2.aws.endpoints.huggingface.cloud/v1';
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Flash-0731';

/**
 * Free public OpenAI-compatible endpoint for DeepSeek V4 Flash 0731
 * hosted on Hugging Face inference. No API key required.
 */
export class DeepSeekProvider extends OpenAIProvider {
  constructor(
    config: AIProviderConfig & {
      _retry?: boolean;
      _retryDelayMs?: number;
      _maxRetries?: number;
      _timeoutMs?: number;
    } = {},
  ) {
    super({
      ...config,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      model: config.model ?? DEFAULT_MODEL,
      _type: 'deepseek',
      // Free Hugging Face endpoint cold-starts and returns 503 while the model
      // spins up — retry with backoff until it is ready.
      _retry: config._retry ?? true,
      _retryDelayMs: config._retryDelayMs ?? 5000,
      _maxRetries: config._maxRetries ?? 3,
      // Free endpoint is slow/cold; cap a single request so the UI never hangs forever.
      _timeoutMs: config._timeoutMs ?? 90000,
    });
  }

  isAvailable(): boolean {
    return true;
  }
}
