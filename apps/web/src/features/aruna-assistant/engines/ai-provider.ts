import type { AIProvider, AIProviderRegistry } from './types';

export class AIProviderRegistryImpl implements AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string | null = null;

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    if (!this.defaultProvider) {
      this.defaultProvider = provider.name;
    }
  }

  get(name: string): AIProvider | null {
    return this.providers.get(name) ?? null;
  }

  getAvailable(): AIProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isAvailable());
  }

  getDefault(): AIProvider | null {
    if (!this.defaultProvider) return null;
    return this.providers.get(this.defaultProvider) ?? null;
  }
}
