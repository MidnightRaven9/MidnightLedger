import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const rl = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_MAX = 5000;

function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = rl.get(key);
  if (!entry || now > entry.reset) {
    // Bound memory: prune stale buckets, then evict the oldest until under the cap.
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

function boundedNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000
    ? value
    : fallback;
}

function validDay(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? 1), 10);
  return Number.isFinite(parsed) ? Math.min(31, Math.max(1, parsed)) : 1;
}

function sanitizeText(input: any, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLen)
    .replace(/[^a-zA-Z0-9 \-_.$()\/&,.'#]/g, '')
    .replace(/\s{2,}/g, ' ');
}

function isValidISODate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = s.split('-').map(Number);
  return d.getUTCFullYear() === y && (d.getUTCMonth() + 1) === m && d.getUTCDate() === day;
}

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const entry = {
    ...(isPlainObject(data) ? data : {}),
    timestamp: new Date().toISOString(),
    level,
    message,
    userId: isPlainObject(data) && typeof data.userId === 'string'
      ? data.userId.slice(0, 8) + '...'
      : undefined // never log full user ID
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

const db = new DatabaseSync('./midnightledger.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users ( id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE IF NOT EXISTS paychecks ( id TEXT PRIMARY KEY, user_id TEXT, date TEXT NOT NULL, amount REAL, allocated REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE IF NOT EXISTS bills ( id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, amount REAL NOT NULL, due_day INTEGER, category TEXT, recurring TEXT DEFAULT 'monthly', created_at DATETIME DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE IF NOT EXISTS allocations ( id TEXT PRIMARY KEY, user_id TEXT, paycheck_id TEXT, bill_id TEXT, amount REAL, paid BOOLEAN DEFAULT 0, paid_date TEXT, FOREIGN KEY(paycheck_id) REFERENCES paychecks(id), FOREIGN KEY(bill_id) REFERENCES bills(id) );
CREATE TABLE IF NOT EXISTS history ( id TEXT PRIMARY KEY, user_id TEXT, bill_id TEXT, paycheck_id TEXT, paid_at DATETIME DEFAULT CURRENT_TIMESTAMP );
`);

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  // Basic security headers (dev/preview server only; static hosting is on Cloudflare)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  // Simple per-IP rate limiter (100 req / min) — mirrors the worker path
  app.use((req, res, next) => {
    if (checkRateLimit(req.ip || 'unknown')) {
      return res.status(429).json({ error: 'Rate limited - try again in 1 min' });
    }
    next();
  });
  app.use(cors({ origin: ["https://midnightledger.justicegraff6.workers.dev", "http://localhost:5173", "http://localhost:3000"], allowedHeaders: ["Content-Type", "x-user-id"] }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    if (req.method === 'POST' && !isPlainObject(req.body)) {
      return res.status(400).json({ error: 'invalid body' });
    }
    next();
  });
  const requireUser = (req: any, res: any, next: any) => {
    const rawUserId = (req.headers['x-user-id'] as string) || '';
    const userId = rawUserId.toLowerCase();
    req.headers['x-user-id'] = userId;
    if (!userId || userId === 'default' || userId.length < 10 || userId.length > 100 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(userId)) {
      log('warn', 'Invalid user ID attempted', { attemptedId: rawUserId.slice(0, 20), ip: req.ip || req.headers['x-forwarded-for'] });
      return res.status(401).json({ error: 'missing or invalid x-user-id' });
    }
    next();
  };
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.get('/api/bills', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      res.json(db.prepare('SELECT * FROM bills WHERE user_id = ? ORDER BY created_at DESC').all(userId));
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'fetchBills', userId });
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  });
  app.post('/api/bills', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const body = req.body || {};

      const VALID_CATEGORIES = ['Housing', 'Utilities', 'Car', 'Insurance', 'Phone', 'Internet', 'Subscriptions', 'Debt', 'Food', 'Health', 'Entertainment', 'Other', 'Savings'] as const;
      const rawCat = typeof body.category === 'string' ? body.category.trim() : 'Other';
      const category = (VALID_CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : 'Other';

      const name = sanitizeText(body.name, 100);
      if (!name) return res.status(400).json({ error: 'name required' });

      if (typeof body.amount !== 'number' || body.amount < 0 || body.amount > 1000000) return res.status(400).json({ error: 'invalid amount' });

      const VALID_RECURRING = ['monthly', 'weekly', 'biweekly', 'yearly', 'once'] as const;
      const recurring = (VALID_RECURRING as readonly string[]).includes(body.recurring) ? body.recurring : 'monthly';

      const billId = isValidId(body.id) ? body.id.toLowerCase() : crypto.randomUUID();
      const day = validDay(body.due_day ?? body.dueDay);
      db.prepare(`INSERT INTO bills (id, user_id, name, amount, due_day, category, recurring) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, amount=excluded.amount, due_day=excluded.due_day, category=excluded.category, recurring=excluded.recurring`).run(billId, userId, name, body.amount, day, category, recurring);
      res.json({ ok: true, id: billId });
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'saveBill', userId });
      res.status(500).json({ error: 'Failed to save bill' });
    }
  });
  app.delete('/api/bills/:id', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?').run(req.params.id, userId);
      res.json({ ok: true });
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'deleteBill', userId });
      res.status(500).json({ error: 'Failed to delete bill' });
    }
  });
  app.get('/api/paychecks', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      res.json(db.prepare('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC').all(userId));
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'fetchPaychecks', userId });
      res.status(500).json({ error: 'Failed to fetch paychecks' });
    }
  });
  app.post('/api/paychecks', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const { id, date, amount, estimatedAmount, allocated } = req.body || {};
      if (!isValidISODate(date)) {
        return res.status(400).json({ error: 'Invalid date - must be YYYY-MM-DD' });
      }
      const safeDate = date;
      const payId = isValidId(id) ? id.toLowerCase() : crypto.randomUUID();
      const payAmount = amount ?? estimatedAmount ?? 0;
      if (typeof payAmount !== 'number' || !Number.isFinite(payAmount) || payAmount < 0 || payAmount > 1000000) {
        return res.status(400).json({ error: 'invalid amount' });
      }
      db.prepare(`INSERT INTO paychecks (id, user_id, date, amount, allocated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET date=excluded.date, amount=excluded.amount, allocated=excluded.allocated`).run(payId, userId, safeDate, payAmount, boundedNumber(allocated));
      res.json({ ok: true, id: payId });
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'savePaycheck', userId });
      res.status(500).json({ error: 'Failed to save paycheck' });
    }
  });
  app.delete('/api/paychecks/:id', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      db.prepare('DELETE FROM paychecks WHERE id = ? AND user_id = ?').run(req.params.id, userId);
      res.json({ ok: true });
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'deletePaycheck', userId });
      res.status(500).json({ error: 'Failed to delete paycheck' });
    }
  });
  app.get('/api/allocations', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      res.json(db.prepare('SELECT * FROM allocations WHERE user_id = ?').all(userId));
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'fetchAllocations', userId });
      res.status(500).json({ error: 'Failed to fetch allocations' });
    }
  });
  app.post('/api/allocations', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      const { id, paycheck_id, bill_id, amount, paid, paid_date } = req.body || {};
      if (!isValidId(paycheck_id) || !isValidId(bill_id)) {
        return res.status(400).json({ error: 'invalid paycheck or bill id' });
      }
      if (paid_date !== undefined && paid_date !== null && !isValidISODate(paid_date)) {
        return res.status(400).json({ error: 'invalid paid_date' });
      }
      const allocId = isValidId(id) ? id.toLowerCase() : crypto.randomUUID();
      db.prepare(`INSERT INTO allocations (id, user_id, paycheck_id, bill_id, amount, paid, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, paid=excluded.paid, paid_date=excluded.paid_date`).run(allocId, userId, paycheck_id.toLowerCase(), bill_id.toLowerCase(), boundedNumber(amount), paid ? 1 : 0, paid_date || null);
      res.json({ ok: true, id: allocId });
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'saveAllocation', userId });
      res.status(500).json({ error: 'Failed to save allocation' });
    }
  });
  app.get('/api/history', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    try {
      res.json(db.prepare('SELECT * FROM history WHERE user_id = ?').all(userId));
    } catch (err: any) {
      log('error', 'Database operation failed', { error: err?.message || String(err), operation: 'fetchHistory', userId });
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  const host = process.env.HOST || '127.0.0.1';
  app.listen(3000, host, () => console.log(`Midnight Ledger server running on http://${host}:3000`));
}
startServer();

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Scope by IP only — including the client-controlled user id would let a
    // caller sidestep the limit simply by rotating that header.
    const clientKey = request.headers.get('cf-connecting-ip') || 'unknown';
    if (checkRateLimit(clientKey)) {
      log('warn', 'Rate limit exceeded', { clientKey, ip: request.headers.get('cf-connecting-ip') });
      return new Response(JSON.stringify({ error: 'Rate limited - try again in 1 min' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const ALLOWED_ORIGINS = (env.ALLOWED_ORIGINS?.split(',') || [
      "https://midnightledger.justicegraff6.workers.dev",
      "http://localhost:5173",
      "http://localhost:3000"
    ]).map((s: string) => s.trim()).filter(Boolean);

    function isOriginAllowed(originStr: string): boolean {
      // No-Origin requests (mobile apps, curl, same-origin) are allowed through;
      // access control is enforced by x-user-id validation and user_id-scoped
      // queries. CORS is not authentication. A wildcard is deliberately never
      // honoured, even if supplied through configuration.
      if (!originStr) return true;
      return ALLOWED_ORIGINS.includes(originStr);
    }

    const origin = request.headers.get('Origin') || "";
    if (origin && !isOriginAllowed(origin)) {
      return new Response(JSON.stringify({ error: 'forbidden origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": isOriginAllowed(origin) ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    
    // CORS: browser-only protection. Real auth = x-user-id UUID validation
    const withCors = (res: Response) => {
      Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
      return res;
    };

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname.startsWith('/api/')) {
      // The shipped app never calls this API. The demo host serves static
      // assets only, so fail clearly if a D1 binding was never configured.
      if (!env.DB) {
        return withCors(Response.json({ error: 'API storage is not configured' }, { status: 503 }));
      }
      const rawUserId = request.headers.get('x-user-id') || '';
      const userId = rawUserId.toLowerCase();
      
      // Block default/shared user and invalid ids
      if (!userId || userId === 'default' || userId.length < 10 || userId.length > 100) {
        log('warn', 'Invalid user ID attempted', { attemptedId: rawUserId.slice(0, 20), ip: request.headers.get('cf-connecting-ip') });
        return withCors(Response.json({ error: 'missing or invalid x-user-id' }, { status: 401 }));
      }
      // Basic sanitize userId - only allow valid UUID v4
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(userId)) {
        log('warn', 'Invalid user ID attempted', { attemptedId: rawUserId.slice(0, 20), ip: request.headers.get('cf-connecting-ip') });
        return withCors(Response.json({ error: 'invalid user id format' }, { status: 400 }));
      }

      try {
        if (url.pathname === '/api/bills' && request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM bills WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
          return withCors(Response.json(results));
        }
        if (url.pathname === '/api/bills' && request.method === 'POST') {
          const body: unknown = await request.json().catch(() => null);
          if (!isPlainObject(body)) return withCors(Response.json({ error: 'invalid body' }, { status: 400 }));

          const VALID_CATEGORIES = ['Housing', 'Utilities', 'Car', 'Insurance', 'Phone', 'Internet', 'Subscriptions', 'Debt', 'Food', 'Health', 'Entertainment', 'Other', 'Savings'] as const;
          const rawCat = typeof body.category === 'string' ? body.category.trim() : 'Other';
          const category = (VALID_CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : 'Other';

          const name = sanitizeText(body.name, 100);
          if (!name) return withCors(Response.json({ error: 'name required' }, { status: 400 }));

          if (typeof body.amount !== 'number' || body.amount < 0 || body.amount > 1000000) {
            return withCors(Response.json({ error: 'invalid amount' }, { status: 400 }));
          }

          const VALID_RECURRING = ['monthly', 'weekly', 'biweekly', 'yearly', 'once'] as const;
          const recurring = typeof body.recurring === 'string' && (VALID_RECURRING as readonly string[]).includes(body.recurring)
            ? body.recurring
            : 'monthly';

          const billId = isValidId(body.id) ? body.id.toLowerCase() : crypto.randomUUID();
          const dueDay = validDay(body.due_day ?? body.dueDate);

          await env.DB.prepare('INSERT INTO bills (id, user_id, name, amount, due_day, category, recurring) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(billId, userId, name, body.amount, dueDay, category, recurring).run();
          return withCors(Response.json({ ok: true, id: billId }));
        }
        if (url.pathname === '/api/paychecks' && request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC').bind(userId).all();
          return withCors(Response.json(results));
        }
        if (url.pathname === '/api/paychecks' && request.method === 'POST') {
          const body: unknown = await request.json().catch(() => null);
          if (!isPlainObject(body)) return withCors(Response.json({ error: 'invalid body' }, { status: 400 }));
          if (!isValidISODate(body.date)) {
            return withCors(Response.json({ error: 'Invalid date - must be YYYY-MM-DD' }, { status: 400 }));
          }
          const safeDate = body.date;
          const payId = isValidId(body.id) ? body.id.toLowerCase() : crypto.randomUUID();
          const amount = typeof body.amount === 'number' ? body.amount : (body.estimatedAmount ?? 0);
          if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 1000000) {
            return withCors(Response.json({ error: 'invalid amount' }, { status: 400 }));
          }

          await env.DB.prepare('INSERT INTO paychecks (id, user_id, date, amount, allocated) VALUES (?, ?, ?, ?, ?)')
            .bind(payId, userId, safeDate, amount, boundedNumber(body.allocated)).run();
          return withCors(Response.json({ ok: true, id: payId }));
        }
        if (url.pathname === '/api/allocations' && request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM allocations WHERE user_id = ?').bind(userId).all();
          return withCors(Response.json(results));
        }
        if (url.pathname === '/api/allocations' && request.method === 'POST') {
          const body: unknown = await request.json().catch(() => null);
          if (!isPlainObject(body)) return withCors(Response.json({ error: 'invalid body' }, { status: 400 }));
          const amount = typeof body.amount === 'number' ? body.amount : 0;
          if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
            return withCors(Response.json({ error: 'invalid amount' }, { status: 400 }));
          }
          if (!isValidId(body.paycheck_id) || !isValidId(body.bill_id)) {
            return withCors(Response.json({ error: 'invalid paycheck or bill id' }, { status: 400 }));
          }
          if (body.paid_date !== undefined && body.paid_date !== null && !isValidISODate(body.paid_date)) {
            return withCors(Response.json({ error: 'invalid paid_date' }, { status: 400 }));
          }

          const allocId = isValidId(body.id) ? body.id.toLowerCase() : crypto.randomUUID();
          await env.DB.prepare('INSERT INTO allocations (id, user_id, paycheck_id, bill_id, amount, paid, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(allocId, userId, String(body.paycheck_id).toLowerCase(), String(body.bill_id).toLowerCase(), amount, body.paid ? 1 : 0, body.paid_date || null).run();
          return withCors(Response.json({ ok: true, id: allocId }));
        }

        return withCors(Response.json({ error: 'not found' }, { status: 404 }));
      } catch (e: any) {
        log('error', 'Database operation failed', { error: e?.message || String(e), operation: 'workerFetch', userId });
        return withCors(Response.json({ error: 'server error' }, { status: 500 }));
      }
    }

    return env.ASSETS.fetch(request);
  },
};
