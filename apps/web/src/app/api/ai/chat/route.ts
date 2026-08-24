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

// Sessions persist across requests so conversation history is kept. The
// client sends back the sessionId it received from the first reply.
const sessionStore = new Map<string, ChatSession>();
const MAX_SESSIONS = 100;

type ProviderConfigInput = { type: AIProviderType } & AIProviderConfig;

function getOrCreateSession(
  sid: string,
  providerType: AIProviderType | undefined,
  providerConfig: ProviderConfigInput | undefined,
  systemPrompt: string,
): ChatSession {
  const existing = sessionStore.get(sid);
  if (existing) {
    // Provider/model may have changed since the last message (user switched
    // it in settings) — update in place without dropping history.
    if (providerType) {
      existing.setProvider(providerType, providerConfig);
    }
    return existing;
  }

  const session = new ChatSession(
    {
      id: sid,
      systemPrompt,
      provider: providerType,
      providerConfig: providerConfig?.type ? providerConfig : undefined,
    },
    aiService,
  );

  if (sessionStore.size >= MAX_SESSIONS) {
    const oldest = sessionStore.keys().next().value;
    if (oldest) sessionStore.delete(oldest);
  }
  sessionStore.set(sid, session);
  return session;
}

function hasConfiguredProvider(
  providerConfig?: { type: AIProviderType } & AIProviderConfig,
  requestedProvider?: AIProviderType,
): boolean {
  // A specific provider type was requested but its credentials were not sent
  // (e.g. client localStorage lost the key). Env fallbacks must not silently
  // authorize a DIFFERENT provider type — that produced requests without an
  // Authorization header (401 "Missing Authentication header").
  const effectiveType = providerConfig?.type ?? requestedProvider;
  if (effectiveType && !providerConfig?.apiKey) {
    if (
      effectiveType === 'ollama' ||
      effectiveType === 'lmstudio' ||
      effectiveType === 'deepseek'
    ) {
      return !!providerConfig?.baseUrl;
    }
    if (effectiveType === 'native') return true;
    return false;
  }

  if (!providerConfig) return aiService.getAvailableProviders().length > 0;
  if (providerConfig.apiKey) return true;
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

    if (!hasConfiguredProvider(providerConfig, provider as AIProviderType | undefined)) {
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
    const session = getOrCreateSession(
      sid,
      providerType,
      providerConfig,
      buildSystemPrompt(
        'You are the ArunaOS AI — the brain, heart, and soul of this operating system. ' +
          'You help users with tasks, answer questions, control the system, and generate modules. ' +
          'You are running in a web-based operating system. You can execute system tools. ' +
          'Be concise, helpful, and knowledgeable.',
        lat,
        lon,
        city,
      ),
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
    } catch (err: unknown) {
      console.error(
        '[ai/chat] completion failed, using fallback:',
        err instanceof Error ? err.message : err,
      );
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

  if (!hasConfiguredProvider(providerConfig, providerRaw as AIProviderType | undefined)) {
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
        const session = getOrCreateSession(
          sid,
          providerType,
          providerConfig,
          buildSystemPrompt(
            'You are the ArunaOS AI — the brain, heart, and soul of this operating system.',
            lat,
            lon,
            city,
          ),
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
      } catch (err: unknown) {
        // Surface why the provider stream failed instead of silently
        // degrading to the keyword fallback.
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[ai/chat] stream failed, using fallback:', errMsg);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', content: `Provider error: ${errMsg}` })}\n\n`,
          ),
        );
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
