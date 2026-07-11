import { ModuleGenerator, type GeneratorOptions, type GeneratorResult } from './module-generator';

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const AI_PROVIDERS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-haiku-20240307' },
};

function detectProvider(): { provider: string; config: AIProviderConfig } | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: 'openai',
      config: {
        apiKey: openaiKey,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL,
      },
    };
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return {
      provider: 'openrouter',
      config: {
        apiKey: openrouterKey,
        baseUrl: process.env.OPENROUTER_BASE_URL,
        model: process.env.OPENROUTER_MODEL,
      },
    };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      config: {
        apiKey: anthropicKey,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        model: process.env.ANTHROPIC_MODEL,
      },
    };
  }

  return null;
}

function buildPrompt(options: GeneratorOptions): string {
  return `Generate an ArunaOS external module.

Name: "${options.name}"
Description: "${options.description}"
${options.capabilities ? `Capabilities: ${options.capabilities.join(', ')}` : ''}

Return ONLY a JSON object with these fields:
- id: string (reverse-domain, e.g. "com.example.myapp")
- manifest: { id, name, version, description, icon, entry: "./dist/bundle.js", type: "external", checksum: "", manifestUrl: "", permissions: string[], categories: string[] }
- code: string (the full module source code as an ESM module exporting: mount(params?) => string, unmount() => void, execute(input?) => Record<string, unknown>)
- files: [{ path: string, content: string }] (include module.json, src/index.ts, .gitignore, README.md)

Use semver version "0.1.0". Infer permissions from the description.`;
}

export class AIModuleGenerator {
  private fallback: ModuleGenerator;
  private provider: ReturnType<typeof detectProvider>;

  constructor() {
    this.fallback = new ModuleGenerator();
    this.provider = detectProvider();
  }

  get isAvailable(): boolean {
    return this.provider !== null;
  }

  get providerName(): string | null {
    return this.provider?.provider ?? null;
  }

  async generate(options: GeneratorOptions): Promise<GeneratorResult> {
    if (!this.provider) {
      return this.fallback.generate(options);
    }

    const { provider, config } = this.provider;
    const providerInfo = AI_PROVIDERS[provider];
    if (!providerInfo) {
      return this.fallback.generate(options);
    }

    const baseUrl = config.baseUrl ?? providerInfo.baseUrl;
    const model = config.model ?? providerInfo.model;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider === 'anthropic'
            ? { 'x-api-key': config.apiKey!, 'anthropic-version': '2023-06-01' }
            : { Authorization: `Bearer ${config.apiKey!}` }),
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an ArunaOS module generator. Return valid JSON only, no markdown fences.',
            },
            { role: 'user', content: buildPrompt(options) },
          ],
          temperature: 0.3,
          response_format: provider !== 'anthropic' ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`[AI] ${provider} API error (${response.status}): ${errorText}`);
        return this.fallback.generate(options);
      }

      const data = await response.json();
      let content: string;

      if (provider === 'anthropic') {
        content = data.content?.[0]?.text ?? '';
      } else {
        content = data.choices?.[0]?.message?.content ?? '';
      }

      content = content
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
