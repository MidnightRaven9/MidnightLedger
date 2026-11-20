import express, { type Request as ExpressRequest, type Response as ExpressResponse, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

/* -------------------------------------------------------------------------- */
/* Shared validation and persistence                                          */
/* -------------------------------------------------------------------------- */

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

type SqlParam = string | number | bigint | Uint8Array | null;

interface DbAdapter {
  one(sql: string, params: SqlParam[]): Promise<unknown | null> | unknown | null;
  all(sql: string, params: SqlParam[]): Promise<unknown[]> | unknown[];
  run(sql: string, params: SqlParam[]): Promise<unknown> | unknown;
}

interface D1Statement {
  bind(...params: SqlParam[]): D1Statement;
  first(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
  run(): Promise<unknown>;
}
interface D1DatabaseLike {
  prepare(sql: string): D1Statement;
}

const BILL_UPSERT = `
  INSERT INTO bills (id, user_id, name, amount, due_day, category, recurring)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name, amount = excluded.amount, due_day = excluded.due_day,
    category = excluded.category, recurring = excluded.recurring
  WHERE bills.user_id = excluded.user_id
`;
const PAYCHECK_UPSERT = `
  INSERT INTO paychecks (id, user_id, date, amount, allocated)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    date = excluded.date, amount = excluded.amount, allocated = excluded.allocated
  WHERE paychecks.user_id = excluded.user_id
`;
const ALLOCATION_UPSERT = `
  INSERT INTO allocations (id, user_id, paycheck_id, bill_id, amount, paid, paid_date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    amount = excluded.amount, paid = excluded.paid, paid_date = excluded.paid_date
  WHERE allocations.paycheck_id = excluded.paycheck_id
    AND allocations.bill_id = excluded.bill_id
`;

const VALID_CATEGORIES = ['Housing', 'Utilities', 'Car', 'Insurance', 'Phone', 'Internet', 'Subscriptions', 'Debt', 'Food', 'Health', 'Entertainment', 'Other', 'Savings'] as const;
const VALID_RECURRING = ['monthly', 'weekly', 'biweekly', 'yearly', 'once'] as const;

const rl = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_MAX = 5000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rl.get(key);
  if (!entry || now > entry.reset) {
    if (rl.size >= RATE_LIMIT_MAX) {
      for (const [k, v] of rl) {
        if (now > v.reset) rl.delete(k);
      }
      while (rl.size >= RATE_LIMIT_MAX) {
        const oldest = rl.keys().next().value;
        if (oldest === undefined) break;
        rl.delete(oldest);
      }
    }
    rl.set(key, { count: 1, reset: now + 60000 });
    return false;
  }
  entry.count++;
  return entry.count > 100;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

// All API money is USD rounded to whole cents. This is a write-time invariant;
// existing rows keep their stored precision until explicitly re-saved.
function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validMoney(value: unknown, field = 'amount'): Result<number> {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
    return { ok: false, status: 400, error: `invalid ${field}` };
  }
  return { ok: true, value: roundCents(value) };
}

function boundedNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000
    ? value
    : fallback;
  return roundCents(parsed);
}

function validDay(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? 1), 10);
  return Number.isFinite(parsed) ? Math.min(31, Math.max(1, parsed)) : 1;
}

function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLen)
    .replace(/[^a-zA-Z0-9 \-_.$()\/&,.'#]/g, '')
    .replace(/\s{2,}/g, ' ');
}

function isValidISODate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = s.split('-').map(Number);
  return d.getUTCFullYear() === y && (d.getUTCMonth() + 1) === m && d.getUTCDate() === day;
}

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function normalizeUserId(raw: string): string | null {
  const userId = raw.toLowerCase();
  if (!userId || userId === 'default' || userId.length < 10 || userId.length > 100 || !isValidId(userId)) {
    return null;
  }
  return userId;
}

function parseBill(body: unknown): Result<{ id?: string; name: string; amount: number; day: number; category: string; recurring: string }> {
  const b = asRecord(body);
  const name = sanitizeText(b.name, 100);
  if (!name) return { ok: false, status: 400, error: 'name required' };
  const amount = validMoney(b.amount);
  if (amount.ok === false) return { ok: false, status: amount.status, error: amount.error };
  const rawCat = typeof b.category === 'string' ? b.category.trim() : 'Other';
  const category = (VALID_CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : 'Other';
  const recurring = typeof b.recurring === 'string' && (VALID_RECURRING as readonly string[]).includes(b.recurring)
    ? b.recurring
    : 'monthly';
  const id = isValidId(b.id) ? b.id.toLowerCase() : undefined;
  return { ok: true, value: { id, name, amount: amount.value, day: validDay(b.due_day ?? b.dueDay ?? b.dueDate), category, recurring } };
}

function parsePaycheck(body: unknown): Result<{ id?: string; date: string; amount: number; allocated: number }> {
  const b = asRecord(body);
  if (!isValidISODate(b.date)) {
    return { ok: false, status: 400, error: 'Invalid date - must be YYYY-MM-DD' };
  }
  const amount = validMoney(b.amount ?? b.estimatedAmount ?? 0);
  if (amount.ok === false) return { ok: false, status: amount.status, error: amount.error };
  const id = isValidId(b.id) ? b.id.toLowerCase() : undefined;
  return { ok: true, value: { id, date: b.date, amount: amount.value, allocated: boundedNumber(b.allocated) } };
}

function parseAllocation(body: unknown): Result<{ id?: string; paycheckId: string; billId: string; amount: number; paid: number; paidDate: string | null }> {
  const b = asRecord(body);
  if (!isValidId(b.paycheck_id) || !isValidId(b.bill_id)) {
    return { ok: false, status: 400, error: 'invalid paycheck or bill id' };
  }
  const amount = validMoney(b.amount ?? 0);
  if (amount.ok === false) return { ok: false, status: amount.status, error: amount.error };
  if (b.paid_date !== undefined && b.paid_date !== null && !isValidISODate(b.paid_date)) {
    return { ok: false, status: 400, error: 'invalid paid_date' };
  }
  return {
    ok: true,
    value: {
      id: isValidId(b.id) ? b.id.toLowerCase() : undefined,
      paycheckId: (b.paycheck_id as string).toLowerCase(),
      billId: (b.bill_id as string).toLowerCase(),
      amount: amount.value,
      paid: b.paid ? 1 : 0,
      paidDate: typeof b.paid_date === 'string' ? b.paid_date : null,
    },
  };
}

async function saveBill(db: DbAdapter, userId: string, body: unknown): Promise<Result<{ id: string }>> {
  const parsed = parseBill(body);
  if (parsed.ok === false) return { ok: false, status: parsed.status, error: parsed.error };
  const { id = crypto.randomUUID(), name, amount, day, category, recurring } = parsed.value;
  const existing = await db.one('SELECT user_id FROM bills WHERE id = ?', [id]);
  if (existing && (existing as { user_id: string }).user_id !== userId) {
    return { ok: false, status: 403, error: 'bill id belongs to another user' };
  }
  await db.run(BILL_UPSERT, [id, userId, name, amount, day, category, recurring]);
  return { ok: true, value: { id } };
}

async function savePaycheck(db: DbAdapter, userId: string, body: unknown): Promise<Result<{ id: string }>> {
  const parsed = parsePaycheck(body);
  if (parsed.ok === false) return { ok: false, status: parsed.status, error: parsed.error };
  const { id = crypto.randomUUID(), date, amount, allocated } = parsed.value;
  const existing = await db.one('SELECT user_id FROM paychecks WHERE id = ?', [id]);
  if (existing && (existing as { user_id: string }).user_id !== userId) {
    return { ok: false, status: 403, error: 'paycheck id belongs to another user' };
  }
  await db.run(PAYCHECK_UPSERT, [id, userId, date, amount, allocated]);
  return { ok: true, value: { id } };
}

async function saveAllocation(db: DbAdapter, userId: string, body: unknown): Promise<Result<{ id: string }>> {
  const parsed = parseAllocation(body);
  if (parsed.ok === false) return { ok: false, status: parsed.status, error: parsed.error };
  const { id = crypto.randomUUID(), paycheckId, billId, amount, paid, paidDate } = parsed.value;
  const paycheck = await db.one('SELECT 1 AS ok FROM paychecks WHERE id = ? AND user_id = ?', [paycheckId, userId]);
  const bill = await db.one('SELECT 1 AS ok FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);
  if (!paycheck || !bill) {
    return { ok: false, status: 403, error: 'paycheck or bill does not belong to user' };
  }
  const existing = await db.one('SELECT paycheck_id FROM allocations WHERE id = ?', [id]);
  if (existing) {
    const owner = await db.one('SELECT user_id FROM paychecks WHERE id = ?', [(existing as { paycheck_id: string }).paycheck_id]);
    if (!owner || (owner as { user_id: string }).user_id !== userId) {
      return { ok: false, status: 403, error: 'allocation id belongs to another user' };
    }
  }
  await db.run(ALLOCATION_UPSERT, [id, userId, paycheckId, billId, amount, paid, paidDate]);
  return { ok: true, value: { id } };
}

async function deleteOwned(db: DbAdapter, userId: string, table: 'bills' | 'paychecks', id: string): Promise<void> {
  if (!isValidId(id)) return;
  await db.run(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id.toLowerCase(), userId]);
}

async function deleteAllocation(db: DbAdapter, userId: string, id: string): Promise<void> {
  if (!isValidId(id)) return;
  await db.run(`DELETE FROM allocations WHERE id = ? AND paycheck_id IN (SELECT id FROM paychecks WHERE user_id = ?)`, [id.toLowerCase(), userId]);
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
  const details = asRecord(data);
  const rawUserId = details.userId;
  const entry = {
    ...details,
    timestamp: new Date().toISOString(),
    level,
    message,
    userId: typeof rawUserId === 'string' ? rawUserId.slice(0, 8) + '...' : undefined,
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

const nodeDb = new DatabaseSync('./midnightledger.db');
nodeDb.exec('PRAGMA foreign_keys = ON');
nodeDb.exec(`
CREATE TABLE IF NOT EXISTS users ( id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE IF NOT EXISTS paychecks ( id TEXT PRIMARY KEY, user_id TEXT, date TEXT NOT NULL, amount REAL, allocated REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE IF NOT EXISTS bills ( id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, amount REAL NOT NULL, due_day INTEGER, category TEXT, recurring TEXT DEFAULT 'monthly', created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE IF NOT EXISTS allocations ( id TEXT PRIMARY KEY, user_id TEXT, paycheck_id TEXT, bill_id TEXT, amount REAL, paid BOOLEAN DEFAULT 0, paid_date TEXT, FOREIGN KEY(paycheck_id) REFERENCES paychecks(id), FOREIGN KEY(bill_id) REFERENCES bills(id) );
CREATE TABLE IF NOT EXISTS history ( id TEXT PRIMARY KEY, user_id TEXT, bill_id TEXT, paycheck_id TEXT, paid_at DATETIME DEFAULT CURRENT_TIMESTAMP );
`);

const nodeAdapter: DbAdapter = {
  one: (sql, params) => nodeDb.prepare(sql).get(...params) ?? null,
  all: (sql, params) => nodeDb.prepare(sql).all(...params),
  run: (sql, params) => nodeDb.prepare(sql).run(...params),
};

function d1Adapter(db: D1DatabaseLike): DbAdapter {
  return {
    one: async (sql, params) => (await db.prepare(sql).bind(...params).first()) ?? null,
    all: async (sql, params) => (await db.prepare(sql).bind(...params).all()).results ?? [],
    run: (sql, params) => db.prepare(sql).bind(...params).run(),
  };
}

function sendResult(res: ExpressResponse, result: Result<unknown>): void {
  if (result.ok === false) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json({ ok: true, ...(result.value as Record<string, unknown>) });
}

/* -------------------------------------------------------------------------- */
/* Express (local development only)                                           */
/* -------------------------------------------------------------------------- */

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    if (checkRateLimit(req.ip || 'unknown')) {
      res.status(429).json({ error: 'Rate limited - try again in 1 min' });
      return;
    }
    next();
  });
  app.use(cors({
    origin: ['https://midnightledger.justicegraff6.workers.dev', 'http://localhost:5173', 'http://localhost:3000'],
    allowedHeaders: ['Content-Type', 'x-user-id'],
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    if (req.method === 'POST' && !isPlainObject(req.body)) {
      res.status(400).json({ error: 'invalid body' });
      return;
    }
    next();
  });

  app.get('/api/health', (_req: ExpressRequest, res: ExpressResponse) => res.json({ status: 'ok', time: new Date().toISOString() }));

  const apiGate = (_req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    if (process.env.ENABLE_FINANCIAL_API !== '1') {
      res.status(503).json({ error: 'Financial API is disabled. Set ENABLE_FINANCIAL_API=1 to opt in.' });
      return;
    }
    next();
  };
  const requireUser = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const raw = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : '';
    const userId = normalizeUserId(raw);
    if (!userId) {
      log('warn', 'Invalid user ID attempted', { attemptedId: raw.slice(0, 20), ip: req.ip });
      res.status(401).json({ error: 'missing or invalid x-user-id' });
      return;
    }
    req.headers['x-user-id'] = userId;
    next();
  };
  const uid = (req: ExpressRequest): string => req.headers['x-user-id'] as string;

  app.get('/api/bills', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    res.json(await nodeAdapter.all('SELECT * FROM bills WHERE user_id = ? ORDER BY created_at DESC', [uid(req)]));
  });
  app.post('/api/bills', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    sendResult(res, await saveBill(nodeAdapter, uid(req), req.body));
  });
  app.delete('/api/bills/:id', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    await deleteOwned(nodeAdapter, uid(req), 'bills', req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/paychecks', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    res.json(await nodeAdapter.all('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC', [uid(req)]));
  });
  app.post('/api/paychecks', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    sendResult(res, await savePaycheck(nodeAdapter, uid(req), req.body));
  });
  app.delete('/api/paychecks/:id', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    await deleteOwned(nodeAdapter, uid(req), 'paychecks', req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/allocations', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    res.json(await nodeAdapter.all('SELECT a.* FROM allocations a JOIN paychecks p ON p.id = a.paycheck_id WHERE p.user_id = ?', [uid(req)]));
  });
  app.post('/api/allocations', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    sendResult(res, await saveAllocation(nodeAdapter, uid(req), req.body));
  });
  app.delete('/api/allocations/:id', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    await deleteAllocation(nodeAdapter, uid(req), req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/history', apiGate, requireUser, async (req: ExpressRequest, res: ExpressResponse) => {
    res.json(await nodeAdapter.all('SELECT * FROM history WHERE user_id = ?', [uid(req)]));
  });
  app.use('/api', apiGate, (_req: ExpressRequest, res: ExpressResponse) => res.status(404).json({ error: 'not found' }));

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

void startServer();

/* -------------------------------------------------------------------------- */
/* Cloudflare Worker (static assets only unless explicitly opted in)          */
/* -------------------------------------------------------------------------- */

interface WorkerEnv {
  DB?: D1DatabaseLike;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ALLOWED_ORIGINS?: string;
  ENABLE_FINANCIAL_API?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const clientKey = request.headers.get('cf-connecting-ip') || 'unknown';
    if (checkRateLimit(clientKey)) {
      log('warn', 'Rate limit exceeded', { clientKey });
      return Response.json({ error: 'Rate limited - try again in 1 min' }, { status: 429 });
    }

    const url = new URL(request.url);
    const allowedOrigins = (env.ALLOWED_ORIGINS?.split(',') || [
      'https://midnightledger.justicegraff6.workers.dev',
      'http://localhost:5173',
      'http://localhost:3000',
    ]).map((s: string) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    // CORS is browser-only protection; it is not authentication.
    if (origin && !allowedOrigins.includes(origin)) {
      return Response.json({ error: 'forbidden origin' }, { status: 403 });
    }

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': origin || allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    };
    const withCors = (res: Response): Response => {
      Object.entries(corsHeaders).forEach(([key, value]) => res.headers.set(key, value));
      return res;
    };

    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));

    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/health') {
      if (env.ENABLE_FINANCIAL_API !== '1') {
        return withCors(Response.json({ error: 'Financial API is disabled.' }, { status: 503 }));
      }
      if (!env.DB) {
        return withCors(Response.json({ error: 'API storage is not configured' }, { status: 503 }));
      }
      const userId = normalizeUserId(request.headers.get('x-user-id') || '');
      if (!userId) {
        log('warn', 'Invalid user ID attempted', { ip: clientKey });
        return withCors(Response.json({ error: 'missing or invalid x-user-id' }, { status: 401 }));
      }

      const db = d1Adapter(env.DB);
      const method = request.method;
      const pathname = url.pathname;
      try {
        let result: Result<unknown>;
        if (pathname === '/api/bills' && method === 'GET') {
          return withCors(Response.json(await db.all('SELECT * FROM bills WHERE user_id = ? ORDER BY created_at DESC', [userId])));
        } else if (pathname === '/api/bills' && method === 'POST') {
          result = await saveBill(db, userId, await request.json().catch(() => null));
        } else if (pathname.startsWith('/api/bills/') && method === 'DELETE') {
          await deleteOwned(db, userId, 'bills', pathname.split('/')[3] || '');
          return withCors(Response.json({ ok: true }));
        } else if (pathname === '/api/paychecks' && method === 'GET') {
          return withCors(Response.json(await db.all('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC', [userId])));
        } else if (pathname === '/api/paychecks' && method === 'POST') {
          result = await savePaycheck(db, userId, await request.json().catch(() => null));
        } else if (pathname.startsWith('/api/paychecks/') && method === 'DELETE') {
          await deleteOwned(db, userId, 'paychecks', pathname.split('/')[3] || '');
          return withCors(Response.json({ ok: true }));
        } else if (pathname === '/api/allocations' && method === 'GET') {
          return withCors(Response.json(await db.all('SELECT a.* FROM allocations a JOIN paychecks p ON p.id = a.paycheck_id WHERE p.user_id = ?', [userId])));
        } else if (pathname === '/api/allocations' && method === 'POST') {
          result = await saveAllocation(db, userId, await request.json().catch(() => null));
        } else if (pathname.startsWith('/api/allocations/') && method === 'DELETE') {
          await deleteAllocation(db, userId, pathname.split('/')[3] || '');
          return withCors(Response.json({ ok: true }));
        } else if (pathname === '/api/history' && method === 'GET') {
          return withCors(Response.json(await db.all('SELECT * FROM history WHERE user_id = ?', [userId])));
        } else {
          return withCors(Response.json({ error: 'not found' }, { status: 404 }));
        }
        if (result.ok === false) {
          return withCors(Response.json({ error: result.error }, { status: result.status }));
        }
        return withCors(Response.json({ ok: true, ...(result.value as Record<string, unknown>) }));
      } catch (e: unknown) {
        log('error', 'Database operation failed', { error: e instanceof Error ? e.message : String(e), userId });
        return withCors(Response.json({ error: 'server error' }, { status: 500 }));
      }
    }

    return env.ASSETS.fetch(request);
  },
};
