import { NextRequest } from 'next/server';
import {
  AIService,
  ChatSession,
  getDefaultTools,
  type AIProviderType,
  type AIProviderConfig,
} from '@arunaos/ai';

const aiService = new AIService({
  tools: getDefaultTools(),
});

function getClientAddress(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? 'anonymous';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, provider, providerConfig } = body as {
      message?: string;
      sessionId?: string;
      provider?: string;
      providerConfig?: { type: AIProviderType } & AIProviderConfig;
    };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const providerType = (provider as AIProviderType) ?? providerConfig?.type ?? undefined;

    // Check if provider is configured before creating session
    if (!providerConfig?.apiKey && !providerConfig?.type) {
      const hasEnvProvider = aiService.getAvailableProviders().length > 0;
      if (!hasEnvProvider) {
        return new Response(
          JSON.stringify({
            error:
              'AI provider not configured. Please add an API key in Settings or set environment variables.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    const sid = sessionId ?? `session-${Date.now()}-${getClientAddress(request)}`;
    const session = new ChatSession(
      {
        id: sid,
        systemPrompt:
          'You are the ArunaOS AI — the brain, heart, and soul of this operating system. ' +
          'You help users with tasks, answer questions, control the system, and generate modules. ' +
          'You are running in a web-based operating system. You can execute system tools. ' +
          'Be concise, helpful, and knowledgeable.',
        tools: getDefaultTools(),
        provider: providerType,
        providerConfig: providerConfig?.type ? providerConfig : undefined,
      },
      aiService,
    );

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

  if (!message) {
    return new Response(JSON.stringify({ error: 'message query param is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let providerConfig: ({ type: AIProviderType } & AIProviderConfig) | undefined;
  if (providerConfigRaw) {
    try {
      providerConfig = JSON.parse(providerConfigRaw);
    } catch {
      /* ignore */
    }
  }

  const providerType = (providerRaw as AIProviderType) ?? providerConfig?.type ?? undefined;

  const sid = sessionId ?? `session-${Date.now()}-sse`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const session = new ChatSession(
          {
            id: sid,
            systemPrompt:
              'You are the ArunaOS AI — the brain, heart, and soul of this operating system.',
            tools: getDefaultTools(),
            provider: providerType,
            providerConfig: providerConfig?.type ? providerConfig : undefined,
          },
          aiService,
        );

        const generator = session.sendMessageStream(message);

        for await (const chunk of generator) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: {"type":"session","sessionId":"${sid}"}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`),
        );
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
