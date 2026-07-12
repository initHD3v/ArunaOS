import { NextRequest, NextResponse } from 'next/server';
import { AIModuleGenerator, type AIProviderType } from '@arunaos/ai';

const fallbackGenerator = new AIModuleGenerator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, capabilities, providerConfig } = body as {
      name?: string;
      description?: string;
      capabilities?: string[];
      providerConfig?: { type: string; apiKey?: string; baseUrl?: string; model?: string };
    };

    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }

    let generator = fallbackGenerator;

    if (providerConfig?.type && providerConfig?.apiKey) {
      const gen = new AIModuleGenerator();
      gen.registerProvider(providerConfig.type as AIProviderType, {
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        model: providerConfig.model,
      });
      generator = gen;
    }

    const result = await generator.generate({
      name,
      description,
      capabilities: capabilities ?? [],
    });

    return NextResponse.json({
      id: result.id,
      code: result.code,
      manifest: result.manifest,
      files: result.files,
      generatedByAI: generator.isAvailable,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
