import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';

dotenv.config();
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
  app.use(cors({ origin: ["https://midnightledger.justicegraff6.workers.dev", "http://localhost:5173", "http://localhost:3000"], allowedHeaders: ["Content-Type", "x-user-id"] }));
  app.use(express.json());
  const requireUser = (req: any, res: any, next: any) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId || userId === 'default' || userId.length < 10 || userId.length > 100 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(401).json({ error: 'missing or invalid x-user-id' });
    }
    next();
  };
  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.get('/api/bills', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    res.json(db.prepare('SELECT * FROM bills WHERE user_id = ? ORDER BY created_at DESC').all(userId));
  });
  app.post('/api/bills', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { name, amount, due_day, dueDay, category, recurring, id } = req.body || {};
    if (!name || typeof name !== 'string' || name.length > 100) return res.status(400).json({ error: 'invalid name' });
    if (typeof amount !== 'number' || amount < 0 || amount > 1000000) return res.status(400).json({ error: 'invalid amount' });
    const billId = id && /^[a-zA-Z0-9-_]{5,100}$/.test(id) ? id : crypto.randomUUID();
    const day = Math.min(31, Math.max(1, parseInt(due_day || dueDay || 1)));
    db.prepare(`INSERT INTO bills (id, user_id, name, amount, due_day, category, recurring) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, amount=excluded.amount, due_day=excluded.due_day, category=excluded.category, recurring=excluded.recurring`).run(billId, userId, name.trim().slice(0,100), amount, day, (category || 'Other').toString().slice(0,50), (recurring || 'monthly').toString().slice(0,20));
    res.json({ ok: true, id: billId });
  });
  app.delete('/api/bills/:id', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  });
  app.get('/api/paychecks', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    res.json(db.prepare('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC').all(userId));
  });
  app.post('/api/paychecks', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { id, date, amount, estimatedAmount, allocated } = req.body || {};
    if (!date || typeof date !== 'string') return res.status(400).json({ error: 'invalid date' });
    const payId = id && /^[a-zA-Z0-9-_]{5,100}$/.test(id) ? id : crypto.randomUUID();
    const payAmount = amount ?? estimatedAmount ?? 0;
    if (typeof payAmount !== 'number' || payAmount < 0 || payAmount > 1000000) return res.status(400).json({ error: 'invalid amount' });
    db.prepare(`INSERT INTO paychecks (id, user_id, date, amount, allocated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET date=excluded.date, amount=excluded.amount, allocated=excluded.allocated`).run(payId, userId, date.slice(0,20), payAmount, allocated || 0);
    res.json({ ok: true, id: payId });
  });
  app.delete('/api/paychecks/:id', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    db.prepare('DELETE FROM paychecks WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  });
  app.get('/api/allocations', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    res.json(db.prepare('SELECT * FROM allocations WHERE user_id = ?').all(userId));
  });
  app.post('/api/allocations', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { id, paycheck_id, bill_id, amount, paid, paid_date } = req.body || {};
    const allocId = id || crypto.randomUUID();
    db.prepare(`INSERT INTO allocations (id, user_id, paycheck_id, bill_id, amount, paid, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, paid=excluded.paid, paid_date=excluded.paid_date`).run(allocId, userId, paycheck_id, bill_id, amount || 0, paid ? 1 : 0, paid_date || null);
    res.json({ ok: true, id: allocId });
  });
  app.get('/api/history', requireUser, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    res.json(db.prepare('SELECT * FROM history WHERE user_id = ?').all(userId));
  });
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(3000, '0.0.0.0', () => console.log(`Midnight Ledger server running on http://0.0.0.0:3000`));
}
startServer();

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const ALLOWED_ORIGINS = (env.ALLOWED_ORIGINS?.split(',') || [
      "https://midnightledger.justicegraff6.workers.dev",
      "http://localhost:5173",
      "http://localhost:3000"
    ]).map((s: string) => s.trim());

    function isOriginAllowed(originStr: string) {
      if (!originStr) return true; // allow same-origin / mobile / curl
      return ALLOWED_ORIGINS.includes(originStr) || ALLOWED_ORIGINS.includes('*');
    }

    const origin = request.headers.get('Origin') || "";
    if (origin && !isOriginAllowed(origin)) {
      return new Response(JSON.stringify({ error: 'forbidden origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": isOriginAllowed(origin) ? (origin || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id",
      "Access-Control-Max-Age": "86400",
    };
    
    const withCors = (res: Response) => {
      Object.entries(corsHeaders).forEach(([k,v]) => res.headers.set(k,v));
      return res;
    };

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname.startsWith('/api/')) {
      let userId = request.headers.get('x-user-id');
      
      // Block default/shared user and invalid ids
      if (!userId || userId === 'default' || userId.length < 10 || userId.length > 100) {
        return withCors(Response.json({ error: 'missing or invalid x-user-id' }, { status: 401 }));
      }
      // Basic sanitize userId - only allow valid UUID v4
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return withCors(Response.json({ error: 'invalid user id format' }, { status: 400 }));
      }

      try {
        if (url.pathname === '/api/bills' && request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM bills WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
          return withCors(Response.json(results));
        }
        if (url.pathname === '/api/bills' && request.method === 'POST') {
          const body: any = await request.json();
          
          // Validation
          if (!body.name || typeof body.name !== 'string' || body.name.length > 100) {
            return withCors(Response.json({ error: 'invalid name' }, { status: 400 }));
          }
          if (typeof body.amount !== 'number' || body.amount < 0 || body.amount > 1000000) {
            return withCors(Response.json({ error: 'invalid amount' }, { status: 400 }));
          }
          
          const billId = body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ? body.id : crypto.randomUUID();
          const dueDay = Math.min(31, Math.max(1, parseInt(body.due_day || body.dueDate || 1)));
          
          await env.DB.prepare('INSERT INTO bills (id, user_id, name, amount, due_day, category) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(billId, userId, body.name.trim().slice(0,100), body.amount, dueDay, (body.category || 'Other').toString().slice(0,50)).run();
          return withCors(Response.json({ ok: true, id: billId }));
        }
        if (url.pathname === '/api/paychecks' && request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC').bind(userId).all();
          return withCors(Response.json(results));
        }
        if (url.pathname === '/api/paychecks' && request.method === 'POST') {
          const body: any = await request.json();
          if (!body.date || typeof body.date !== 'string') {
            return withCors(Response.json({ error: 'invalid date' }, { status: 400 }));
          }
          const payId = body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ? body.id : crypto.randomUUID();
          const amount = typeof body.amount === 'number' ? body.amount : (body.estimatedAmount || 0);
          if (amount < 0 || amount > 1000000) return withCors(Response.json({error: 'invalid amount'}, {status: 400}));
          
          await env.DB.prepare('INSERT INTO paychecks (id, user_id, date, amount, allocated) VALUES (?, ?, ?, ?, ?)')
            .bind(payId, userId, body.date.slice(0,20), amount, body.allocated || 0).run();
          return withCors(Response.json({ ok: true, id: payId }));
        }
        if (url.pathname === '/api/allocations' && request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM allocations WHERE user_id = ?').bind(userId).all();
          return withCors(Response.json(results));
        }
        if (url.pathname === '/api/allocations' && request.method === 'POST') {
          const body: any = await request.json();
          const amount = typeof body.amount === 'number' ? body.amount : 0;
          if (amount < 0 || amount > 1000000) return withCors(Response.json({ error: 'invalid amount' }, { status: 400 }));
          
          const allocId = body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ? body.id : crypto.randomUUID();
          await env.DB.prepare('INSERT INTO allocations (id, user_id, paycheck_id, bill_id, amount, paid, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(allocId, userId, body.paycheck_id, body.bill_id, amount, body.paid ? 1 : 0, body.paid_date || null).run();
          return withCors(Response.json({ ok: true, id: allocId }));
        }

        return withCors(Response.json({ error: 'not found' }, { status: 404 }));
      } catch (e:any) {
        console.error(e);
        return withCors(Response.json({ error: 'server error' }, { status: 500 }));
      }
    }

    return env.ASSETS.fetch(request);
  },
};
