import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { provider, baseUrl, apiKey } = await req.json();

  if (!provider || !baseUrl) {
    return NextResponse.json({ error: 'Missing provider or baseUrl' }, { status: 400 });
  }

  const url = (baseUrl as string).replace(/\/$/, '');

  const endpoints: { url: string; headers: Record<string, string> }[] = [];

  if (provider === 'ollama') {
    endpoints.push(
      { url: `${url}/api/tags`, headers: {} },
      { url: `${url}/v1/models`, headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} },
    );
  } else if (provider === 'lmstudio') {
    endpoints.push({
      url: `${url}/v1/models`,
      headers: {},
    });
  } else if (provider === 'anthropic') {
    endpoints.push({
      url: `${url}/models`,
      headers: {
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
        'anthropic-version': '2023-06-01',
      },
    });
  } else {
    endpoints.push({
      url: `${url}/models`,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
  }

  const start = performance.now();
  let lastError: string | null = null;

  for (const ep of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(ep.url, { headers: ep.headers, signal: controller.signal });
      clearTimeout(timeout);
      const latency = ((performance.now() - start) / 1000).toFixed(2);

      let body = '';
      let json: unknown;
      try {
        json = await res.json();
        body = JSON.stringify(json).slice(0, 2000);
      } catch {
        body = await res.text().catch(() => '');
      }

      let models: string[] = [];
      if (res.ok && json) {
        if (ep.url.endsWith('/api/tags')) {
          const data = json as { models?: Array<{ name: string }> };
          if (data?.models) models = data.models.map((m) => m.name);
        } else {
          const data = json as { data?: Array<{ id: string }> };
          if (data?.data) models = data.data.map((m) => m.id);
        }
      }

      return NextResponse.json({
        ok: res.ok,
        statusCode: res.status,
        statusText: res.statusText,
        latency: `${latency}s`,
        body,
        models,
        error: res.ok ? null : `${res.status} ${res.statusText}`,
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  const latency = ((performance.now() - start) / 1000).toFixed(2);
  return NextResponse.json({
    ok: false,
    statusCode: null,
    statusText: null,
    latency: `${latency}s`,
    body: lastError ?? 'Failed to connect',
    models: [],
    error: lastError ?? 'Failed to connect',
  });
}
