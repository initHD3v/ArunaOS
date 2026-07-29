import { NextRequest } from 'next/server';
import {
  AIService,
  ChatSession,
  ChatFallback,
  getDefaultTools,
  type AIProviderType,
  type AIProviderConfig,
} from '@arunaos/ai';

const aiService = new AIService({
  tools: getDefaultTools(),
});

const fallback = new ChatFallback(getDefaultTools());

function hasConfiguredProvider(
  providerConfig?: { type: AIProviderType } & AIProviderConfig,
): boolean {
  if (!providerConfig) return aiService.getAvailableProviders().length > 0;
  if (providerConfig.apiKey) return true;
  if (providerConfig.type === 'ollama' || providerConfig.type === 'lmstudio')
    return !!providerConfig.baseUrl;
  if (providerConfig.type === 'native') return true;
  return false;
}

function getClientAddress(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'anonymous';
}

function buildLocationPrompt(
  lat?: string | null,
  lon?: string | null,
  city?: string | null,
): string {
  if (!lat || !lon) return '';
  const loc = `User location: ${lat}, ${lon}`;
  return city ? `${loc} (${city})` : loc;
}

function buildSystemPrompt(
  base: string,
  lat?: string | null,
  lon?: string | null,
  city?: string | null,
): string {
  const locationLine = buildLocationPrompt(lat, lon, city);
  return locationLine ? `${base}\n\n${locationLine}` : base;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, provider, providerConfig, lat, lon, city } = body as {
      message?: string;
      sessionId?: string;
      provider?: string;
      providerConfig?: { type: AIProviderType } & AIProviderConfig;
      lat?: string;
      lon?: string;
      city?: string;
    };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!hasConfiguredProvider(providerConfig)) {
      const reply = await fallback.respond(message);
      return new Response(
        JSON.stringify({
          reply: reply.content,
          sessionId: sessionId ?? `fallback-${Date.now()}`,
          provider: 'fallback',
          model: 'keyword',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const providerType = (provider as AIProviderType) ?? providerConfig?.type ?? undefined;

    const sid = sessionId ?? `session-${Date.now()}-${getClientAddress(request)}`;
    const session = new ChatSession(
      {
        id: sid,
        systemPrompt: buildSystemPrompt(
          'You are the ArunaOS AI — the brain, heart, and soul of this operating system. ' +
            'You help users with tasks, answer questions, control the system, and generate modules. ' +
            'You are running in a web-based operating system. You can execute system tools. ' +
            'Be concise, helpful, and knowledgeable.',
          lat,
          lon,
          city,
        ),
        provider: providerType,
        providerConfig: providerConfig?.type ? providerConfig : undefined,
      },
      aiService,
    );

    try {
      const response = await session.sendMessage(message);

      return new Response(
        JSON.stringify({
          reply: response.content,
          sessionId: sid,
          provider: session.getProvider(),
          model: session.getModel(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch {
      const reply = await fallback.respond(message);
      return new Response(
        JSON.stringify({
          reply: reply.content,
          sessionId: sid,
          provider: 'fallback',
          model: 'keyword',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const message = searchParams.get('message') ?? '';
  const sessionId = searchParams.get('sessionId') ?? undefined;
  const providerRaw = searchParams.get('provider') ?? undefined;
  const providerConfigRaw = searchParams.get('providerConfig') ?? undefined;
  const webSearch = searchParams.get('webSearch');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const city = searchParams.get('city');

  if (!message) {
    return new Response(JSON.stringify({ error: 'message query param is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  let providerConfig: ({ type: AIProviderType } & AIProviderConfig) | undefined;
  if (providerConfigRaw) {
    try {
      providerConfig = JSON.parse(providerConfigRaw);
    } catch {
      /* ignore */
    }
  }

  if (!hasConfiguredProvider(providerConfig)) {
    const stream = new ReadableStream({
      async start(controller) {
        const generator = fallback.respondStream(message);
        for await (const chunk of generator) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(
          encoder.encode(`data: {"type":"session","sessionId":"fallback-${Date.now()}"}\n\n`),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const providerType = (providerRaw as AIProviderType) ?? providerConfig?.type ?? undefined;

  const sid = sessionId ?? `session-${Date.now()}-sse`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const session = new ChatSession(
          {
            id: sid,
            systemPrompt: buildSystemPrompt(
              'You are the ArunaOS AI — the brain, heart, and soul of this operating system.',
              lat,
              lon,
              city,
            ),
            provider: providerType,
            providerConfig: providerConfig?.type ? providerConfig : undefined,
          },
          aiService,
        );

        const generator = session.sendMessageStream(message, {
          webSearchEnabled: webSearch !== 'false',
        });

        for await (const chunk of generator) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: {"type":"session","sessionId":"${sid}"}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch {
        const fallbackGen = fallback.respondStream(message);
        for await (const chunk of fallbackGen) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(
          encoder.encode(`data: {"type":"session","sessionId":"fallback-${Date.now()}"}\n\n`),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
