import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';

dotenv.config();

// Initialize local SQLite DB using built-in node:sqlite
const db = new DatabaseSync('./midnightledger.db');

// Run initial migration
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paychecks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  date TEXT NOT NULL,
  amount REAL,
  allocated REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_day INTEGER,
  category TEXT,
  recurring TEXT DEFAULT 'monthly',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allocations (
  id TEXT PRIMARY KEY,
  paycheck_id TEXT,
  bill_id TEXT,
  amount REAL,
  paid BOOLEAN DEFAULT 0,
  paid_date TEXT,
  FOREIGN KEY(paycheck_id) REFERENCES paychecks(id),
  FOREIGN KEY(bill_id) REFERENCES bills(id)
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  bill_id TEXT,
  paycheck_id TEXT,
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Routes
  app.get('/api/bills', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const stmt = db.prepare('SELECT * FROM bills WHERE user_id = ?');
    const bills = stmt.all(userId);
    res.json(bills);
  });

  app.post('/api/bills', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const { name, amount, due_day, dueDay, category, recurring, id } = req.body || {};
    const billId = id || crypto.randomUUID();
    const day = due_day ?? dueDay ?? 1;

    const stmt = db.prepare(`
      INSERT INTO bills (id, user_id, name, amount, due_day, category, recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        amount = excluded.amount,
        due_day = excluded.due_day,
        category = excluded.category,
        recurring = excluded.recurring
    `);
    stmt.run(billId, userId, name || 'Untitled Bill', amount || 0, day, category || 'Other', recurring || 'monthly');
    res.json({ ok: true, id: billId });
  });

  app.delete('/api/bills/:id', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const stmt = db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, userId);
    res.json({ ok: true });
  });

  app.get('/api/paychecks', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const stmt = db.prepare('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC');
    const paychecks = stmt.all(userId);
    res.json(paychecks);
  });

  app.post('/api/paychecks', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const { id, date, amount, estimatedAmount, allocated } = req.body || {};
    const paydayId = id || crypto.randomUUID();
    const paydayDate = date || new Date().toISOString().split('T')[0];
    const paydayAmount = amount ?? estimatedAmount ?? 0;

    const stmt = db.prepare(`
      INSERT INTO paychecks (id, user_id, date, amount, allocated)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        amount = excluded.amount,
        allocated = excluded.allocated
    `);
    stmt.run(paydayId, userId, paydayDate, paydayAmount, allocated || 0);
    res.json({ ok: true, id: paydayId });
  });

  app.delete('/api/paychecks/:id', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const stmt = db.prepare('DELETE FROM paychecks WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, userId);
    res.json({ ok: true });
  });

  app.get('/api/allocations', (req, res) => {
    const stmt = db.prepare('SELECT * FROM allocations');
    res.json(stmt.all());
  });

  app.post('/api/allocations', (req, res) => {
    const { id, paycheck_id, bill_id, amount, paid, paid_date } = req.body || {};
    const allocId = id || crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO allocations (id, paycheck_id, bill_id, amount, paid, paid_date)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        amount = excluded.amount,
        paid = excluded.paid,
        paid_date = excluded.paid_date
    `);
    stmt.run(allocId, paycheck_id, bill_id, amount || 0, paid ? 1 : 0, paid_date || null);
    res.json({ ok: true, id: allocId });
  });

  app.get('/api/history', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const stmt = db.prepare('SELECT * FROM history WHERE user_id = ?');
    res.json(stmt.all(userId));
  });

  app.post('/api/history', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'default';
    const { id, bill_id, paycheck_id } = req.body || {};
    const histId = id || crypto.randomUUID();
    const stmt = db.prepare('INSERT INTO history (id, user_id, bill_id, paycheck_id) VALUES (?, ?, ?, ?)');
    stmt.run(histId, userId, bill_id, paycheck_id);
    res.json({ ok: true, id: histId });
  });

  // Serve static assets in production or Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Midnight Ledger server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

// Cloudflare Worker export interface
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const userId = request.headers.get('x-user-id') || 'default';

      if (url.pathname === '/api/bills' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM bills WHERE user_id = ?').bind(userId).all();
        return Response.json(results);
      }
      if (url.pathname === '/api/bills' && request.method === 'POST') {
        const body: any = await request.json();
        await env.DB.prepare('INSERT INTO bills (id, user_id, name, amount, due_day, category) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(body.id || crypto.randomUUID(), userId, body.name, body.amount, body.due_day || body.dueDate || 1, body.category || 'Other').run();
        return Response.json({ ok: true });
      }
      if (url.pathname === '/api/paychecks' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC').bind(userId).all();
        return Response.json(results);
      }
      if (url.pathname === '/api/paychecks' && request.method === 'POST') {
        const body: any = await request.json();
        await env.DB.prepare('INSERT INTO paychecks (id, user_id, date, amount, allocated) VALUES (?, ?, ?, ?, ?)')
          .bind(body.id || crypto.randomUUID(), userId, body.date, body.amount || body.estimatedAmount || 0, body.allocated || 0).run();
        return Response.json({ ok: true });
      }

      return Response.json({ error: 'not found' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
