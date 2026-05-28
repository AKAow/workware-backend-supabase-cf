interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  RATE_LIMIT?: DurableObjectNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const key = `rl:${ip}:${new Date().toISOString().slice(0, 16)}`;
    if (env.RATE_LIMIT) {
      const id = env.RATE_LIMIT.idFromName(key);
      const stub = env.RATE_LIMIT.get(id);
      const rlRes = await stub.fetch('https://internal/check');
      if (rlRes.status === 429) return withCors(new Response(JSON.stringify({ error: { code: 'TOO_MANY_REQUESTS', message: '요청 한도를 초과했습니다.' } }), { status: 429 }));
    }

    const inUrl = new URL(request.url);
    const targetPath = inUrl.pathname.replace(/^\/api/, '');
    const targetUrl = `${env.SUPABASE_URL}/functions/v1${targetPath}${inUrl.search}`;

    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
    const proxied = new Request(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        apikey: env.SUPABASE_ANON_KEY,
      },
      body,
    });

    const resp = await fetch(proxied);
    return withCors(resp);
  },
};

function withCors(resp: Response) {
  const headers = new Headers(resp.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}

export class RateLimitDO {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch() {
    const now = Date.now();
    const count = (await this.state.storage.get<number>('count')) ?? 0;
    const firstAt = (await this.state.storage.get<number>('firstAt')) ?? now;
    const windowMs = 60_000;
    const limit = 120;

    if (now - firstAt > windowMs) {
      await this.state.storage.put('count', 1);
      await this.state.storage.put('firstAt', now);
      return new Response('ok', { status: 200 });
    }

    if (count >= limit) return new Response('rate_limited', { status: 429 });
    await this.state.storage.put('count', count + 1);
    return new Response('ok', { status: 200 });
  }
}
