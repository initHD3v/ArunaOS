import { ModuleGenerator, type GeneratorOptions, type GeneratorResult } from './module-generator';
import { AIService } from './ai-service';
import type { AIProviderType } from './types';
import { detectProviders } from './providers/interface';

export class AIModuleGenerator {
  private fallback: ModuleGenerator;
  private aiService: AIService | null = null;

  constructor() {
    this.fallback = new ModuleGenerator();
    this.initializeAI();
  }

  registerProvider(
    type: AIProviderType,
    config: { apiKey?: string; baseUrl?: string; model?: string },
  ): void {
    this.aiService = new AIService();
    this.aiService.registerProvider(type, config);
  }

  private initializeAI(): void {
    const providers = detectProviders();
    if (providers.length > 0) {
      this.aiService = new AIService();
      for (const { type, config } of providers) {
        this.aiService.registerProvider(type, config);
      }
    }
  }

  get isAvailable(): boolean {
    return this.aiService !== null;
  }

  get providerName(): string | null {
    if (!this.aiService) return null;
    const providers = this.aiService.getAvailableProviders();
    return providers.find((p) => p.available)?.type ?? null;
  }

  async generate(options: GeneratorOptions): Promise<GeneratorResult> {
    if (!this.aiService) {
      return this.fallback.generate(options);
    }

    try {
      const systemPrompt = `You are an ArunaOS module generator. You generate valid module code only. Return valid JSON only, no markdown fences.`;

      const userPrompt = `Generate an ArunaOS external module.

Name: "${options.name}"
Description: "${options.description}"
${options.capabilities ? `Capabilities: ${options.capabilities.join(', ')}` : ''}

Return ONLY a JSON object with these fields:
- id: string (reverse-domain, e.g. "com.example.myapp")
- manifest: { id, name, version, description, icon, entry: "./dist/bundle.js", type: "external", checksum: "", manifestUrl: "", permissions: string[], categories: string[] }
- code: string (the full module source code as an ESM module exporting: mount(params?) => string, unmount() => void, execute(input?) => Record<string, unknown>)
- files: [{ path: string, content: string }] (include module.json, src/index.ts, .gitignore, README.md)

Use semver version "0.1.0". Infer permissions from the description.`;

      const response = await this.aiService.complete({
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        temperature: 0.3,
      });

      const content = response.message.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/g, '')
        .trim();

      const parsed = JSON.parse(content);

      return {
        id: parsed.id ?? options.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        code: parsed.code ?? '',
        manifest: parsed.manifest ?? {},
        files: parsed.files ?? [],
      };
    } catch (err) {
      console.warn('[AI] Provider request failed, falling back to keyword generator:', err);
      return this.fallback.generate(options);
    }
  }
}
