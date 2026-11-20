import express, { type Request as ExpressRequest, type Response as ExpressResponse, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';
import {
  authenticate,
  checkRateLimit,
  ensureDatabaseSchema,
  handleAuthRequest,
  handleDataRequest,
  isPlainObject,
  parseAllowedOrigins,
  resultBody,
  type DbAdapter,
  type Result,
} from './apiCore';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const API_SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
} as const;

const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
} as const;

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join('; ');

const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

type AsyncHandler = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

function asyncRoute(handler: AsyncHandler) {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction): void => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function log(level: 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
  const entry = { level, message, timestamp: new Date().toISOString(), ...data };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function authorizationHeader(req: ExpressRequest): string {
  return typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
}

function sendResult(res: ExpressResponse, result: Result<unknown>): void {
  if (result.ok === false) {
    sendFailure(res, result.status, result.error);
    return;
  }
  res.json(resultBody(result.value));
}

function sendFailure(res: ExpressResponse, status: number, error: string): void {
  res.status(status).json({ error });
}

function sendOptionalFailure(
  res: ExpressResponse,
  result: Result<unknown> | null,
  status: number,
  error: string,
): void {
  if (result === null) sendFailure(res, status, error);
  else if (result.ok === false) sendFailure(res, result.status, result.error);
}

async function startServer(): Promise<void> {
  const nodeDb = new DatabaseSync('./midnightledger.db');
  nodeDb.exec('PRAGMA foreign_keys = ON');
  const nodeAdapter: DbAdapter = {
    one: (sql, params) => nodeDb.prepare(sql).get(...params) ?? null,
    all: (sql, params) => nodeDb.prepare(sql).all(...params),
    run: (sql, params) => nodeDb.prepare(sql).run(...params),
  };
  await ensureDatabaseSchema(nodeAdapter);

  const app = express();
  app.disable('x-powered-by');
  app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    Object.entries(BASE_SECURITY_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Content-Security-Policy', PRODUCTION_CSP);
    }
    if (req.path.startsWith('/api/')) {
      Object.entries(API_SECURITY_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    }
    next();
  });
  app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    // Static/PWA assets must load from any host that serves the app. CORS is
    // only an API boundary, and same-origin API calls never need an allowlist.
    const isFinancialApi = req.path.startsWith('/api/') && req.path !== '/api/health';
    const origin = req.headers.origin;
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    if (isFinancialApi && typeof origin === 'string' && origin !== requestOrigin && !allowedOrigins.includes(origin)) {
      sendFailure(res, 403, 'forbidden origin');
      return;
    }
    if (checkRateLimit(req.ip || 'unknown')) {
      sendFailure(res, 429, 'Rate limited - try again in 1 min');
      return;
    }
    next();
  });
  app.use(cors({
    origin: allowedOrigins,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    // Logout authenticates via bearer token and has no required payload.
    if (req.method === 'POST' && req.path !== '/api/auth/logout' && !isPlainObject(req.body)) {
      sendFailure(res, 400, 'invalid body');
      return;
    }
    next();
  });

  app.get('/api/health', (_req: ExpressRequest, res: ExpressResponse) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const apiGate = (_req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    if (process.env.ENABLE_FINANCIAL_API !== '1') {
      sendFailure(res, 503, 'Financial API is disabled. Set ENABLE_FINANCIAL_API=1 to opt in.');
      return;
    }
    next();
  };

  const requireAuth = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
    const userId = await authenticate(nodeAdapter, authorizationHeader(req));
    if (!userId) {
      sendFailure(res, 401, 'missing, invalid or expired session');
      return;
    }
    res.locals.userId = userId;
    next();
  };
  const uid = (res: ExpressResponse): string => res.locals.userId as string;

  app.post('/api/auth/register', apiGate, asyncRoute(async (req, res) => {
    const result = await handleAuthRequest(nodeAdapter, 'POST', '/api/auth/register', req.body, '');
    if (result === null || result.ok === false) {
      sendOptionalFailure(res, result, 500, 'registration failed');
      return;
    }
    sendResult(res, result);
  }));

  app.post('/api/auth/login', apiGate, asyncRoute(async (req, res) => {
    const result = await handleAuthRequest(nodeAdapter, 'POST', '/api/auth/login', req.body, '');
    if (result === null || result.ok === false) {
      sendOptionalFailure(res, result, 500, 'login failed');
      return;
    }
    sendResult(res, result);
  }));

  app.post('/api/auth/logout', apiGate, asyncRoute(async (req, res) => {
    const result = await handleAuthRequest(nodeAdapter, 'POST', '/api/auth/logout', req.body, authorizationHeader(req));
    if (result === null || result.ok === false) {
      sendOptionalFailure(res, result, 401, 'invalid session');
      return;
    }
    sendResult(res, result);
  }));

  app.get('/api/bills', apiGate, requireAuth, asyncRoute(async (_req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'GET', '/api/bills', null));
  }));
  app.post('/api/bills', apiGate, requireAuth, asyncRoute(async (req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'POST', '/api/bills', req.body));
  }));
  app.delete('/api/bills/:id', apiGate, requireAuth, asyncRoute(async (req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'DELETE', `/api/bills/${req.params.id}`, null));
  }));

  app.get('/api/paychecks', apiGate, requireAuth, asyncRoute(async (_req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'GET', '/api/paychecks', null));
  }));
  app.post('/api/paychecks', apiGate, requireAuth, asyncRoute(async (req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'POST', '/api/paychecks', req.body));
  }));
  app.delete('/api/paychecks/:id', apiGate, requireAuth, asyncRoute(async (req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'DELETE', `/api/paychecks/${req.params.id}`, null));
  }));

  app.get('/api/allocations', apiGate, requireAuth, asyncRoute(async (_req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'GET', '/api/allocations', null));
  }));
  app.post('/api/allocations', apiGate, requireAuth, asyncRoute(async (req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'POST', '/api/allocations', req.body));
  }));
  app.delete('/api/allocations/:id', apiGate, requireAuth, asyncRoute(async (req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'DELETE', `/api/allocations/${req.params.id}`, null));
  }));

  app.get('/api/history', apiGate, requireAuth, asyncRoute(async (_req, res) => {
    sendResult(res, await handleDataRequest(nodeAdapter, uid(res), 'GET', '/api/history', null));
  }));

  app.use('/api', apiGate, (_req: ExpressRequest, res: ExpressResponse) => {
    sendFailure(res, 404, 'not found');
  });

  app.use((error: unknown, _req: ExpressRequest, res: ExpressResponse, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    log('error', 'API operation failed', { error: message.slice(0, 200) });
    if (!res.headersSent) sendFailure(res, 500, 'server error');
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: ExpressRequest, res: ExpressResponse) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, host, () => console.log(`Midnight Ledger server running on http://${host}:${port}`));
}

const entry = process.argv[1] || '';
if (entry.endsWith('server.ts') || entry.endsWith('server.cjs')) {
  void startServer();
}
