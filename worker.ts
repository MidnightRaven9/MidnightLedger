import {
  authenticate,
  checkRateLimit,
  d1Adapter,
  handleAuthRequest,
  handleDataRequest,
  isPlainObject,
  parseAllowedOrigins,
  resultBody,
  type D1DatabaseLike,
} from './apiCore';

interface WorkerEnv {
  DB?: D1DatabaseLike;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ALLOWED_ORIGINS?: string;
  ENABLE_FINANCIAL_API?: string;
}

const API_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...API_SECURITY_HEADERS } });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const clientKey = request.headers.get('cf-connecting-ip') || 'unknown';
    if (checkRateLimit(clientKey)) {
      return json({ error: 'Rate limited - try again in 1 min' }, 429);
    }

    const url = new URL(request.url);
    const isApi = url.pathname.startsWith('/api/');
    const isHealth = url.pathname === '/api/health';
    // Static/PWA assets must load from any host that serves the app.
    if (!isApi) {
      return env.ASSETS.fetch(request);
    }
    // Health is a real JSON endpoint in both runtimes and must not depend on
    // SPA fallback behaviour from the asset binding.
    if (isHealth) {
      return json({ status: 'ok', time: new Date().toISOString() });
    }

    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const origin = request.headers.get('Origin') || '';
    // CORS is not authentication; reject unexpected cross-origin API callers.
    // Same-origin requests are always valid regardless of the configured list.
    if (origin && origin !== url.origin && !allowedOrigins.includes(origin)) {
      return json({ error: 'forbidden origin' }, 403);
    }

    const withCors = (response: Response): Response => {
      response.headers.set('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
      response.headers.set('Vary', 'Origin');
      return response;
    };

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204, headers: API_SECURITY_HEADERS }));
    }

    if (env.ENABLE_FINANCIAL_API !== '1') {
      return withCors(json({ error: 'Financial API is disabled.' }, 503));
    }
    if (!env.DB) {
      return withCors(json({ error: 'API storage is not configured' }, 503));
    }

    const db = d1Adapter(env.DB);
    const method = request.method;
    const authorization = request.headers.get('Authorization');
    let body: unknown = null;

    try {
      if (method === 'POST') {
        const text = await request.text();
        if (text.trim()) {
          try {
            body = JSON.parse(text);
          } catch {
            return withCors(json({ error: 'invalid JSON body' }, 400));
          }
          if (!isPlainObject(body)) return withCors(json({ error: 'invalid body' }, 400));
        } else {
          // Logout has no required payload; auth validators reject empty
          // registration/login bodies themselves.
          body = {};
        }
      }

      const authResult = await handleAuthRequest(db, method, url.pathname, body, authorization);
      if (authResult !== null) {
        return authResult.ok === false
          ? withCors(json({ error: authResult.error }, authResult.status))
          : withCors(json(resultBody(authResult.value), 200));
      }

      const userId = await authenticate(db, authorization);
      if (!userId) {
        return withCors(json({ error: 'missing, invalid or expired session' }, 401));
      }

      const result = await handleDataRequest(db, userId, method, url.pathname, body);
      return result.ok === false
        ? withCors(json({ error: result.error }, result.status))
        : withCors(json(resultBody(result.value), 200));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ level: 'error', message: 'API operation failed', error: message.slice(0, 200) }));
      return withCors(json({ error: 'server error' }, 500));
    }
  },
};
