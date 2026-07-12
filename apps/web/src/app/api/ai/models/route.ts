import { NextResponse } from 'next/server';
import { AIService, detectProviders } from '@arunaos/ai';

export async function GET() {
  try {
    const detected = detectProviders();
    const service = new AIService();

    for (const { type, config } of detected) {
      service.registerProvider(type, config);
    }

    const providers = service.getAvailableProviders();

    return NextResponse.json({
      providers: providers.map((p) => ({
        type: p.type,
        model: p.model,
        available: p.available,
      })),
      defaultProvider: detected[0]?.type ?? null,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to list models';
    return NextResponse.json({ error: errorMessage, providers: [] }, { status: 500 });
  }
}
