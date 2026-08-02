import { NextRequest } from 'next/server';
import {
  AIService,
  getDefaultTools,
  type AIProviderType,
  type AIProviderConfig,
} from '@arunaos/ai';

const aiService = new AIService({ tools: getDefaultTools() });

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const providerConfigRaw = searchParams.get('providerConfig');
  const online = searchParams.get('online') !== 'false';

  let hasProvider = aiService.getAvailableProviders().filter((p) => p.available).length > 0;

  if (!hasProvider && providerConfigRaw) {
    try {
      const providerConfig: { type: AIProviderType } & AIProviderConfig =
        JSON.parse(providerConfigRaw);
      if (providerConfig.apiKey) hasProvider = true;
      if (
        (providerConfig.type === 'ollama' ||
          providerConfig.type === 'lmstudio' ||
          providerConfig.type === 'deepseek') &&
        providerConfig.baseUrl
      )
        hasProvider = true;
      if (providerConfig.type === 'native') hasProvider = true;
    } catch {
      /* ignore */
    }
  }

  let status: 'full' | 'limited' | 'none';
  if (hasProvider && online) status = 'full';
  else if (hasProvider && !online) status = 'limited';
  else status = 'none';

  return new Response(
    JSON.stringify({
      status,
      online,
      providerCount: hasProvider ? 1 : 0,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
