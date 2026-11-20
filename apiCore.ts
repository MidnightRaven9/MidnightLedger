/**
 * Shared, transport-independent API core for the Node server and Worker.
 * This module deliberately has no Node-only imports so it can run unchanged in
 * both runtimes. Identity is always derived from a verified session token; no
 * caller-supplied user id is accepted.
 */
import { MAX_MONEY, roundCents, sumMoney } from './money';

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export type SqlParam = string | number | bigint | Uint8Array | null;

export interface DbAdapter {
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

export interface D1DatabaseLike {
  prepare(sql: string): D1Statement;
}

export function d1Adapter(db: D1DatabaseLike): DbAdapter {
  return {
    one: async (sql, params) => (await db.prepare(sql).bind(...params).first()) ?? null,
    all: async (sql, params) => (await db.prepare(sql).bind(...params).all()).results ?? [],
    run: async (sql, params) => db.prepare(sql).bind(...params).run(),
  };
}

const DEFAULT_ORIGINS = [
  'https://midnightledger.justicegraff6.workers.dev',
  'http://localhost:5173',
  'http://localhost:3000',
] as const;

const VALID_CATEGORIES = [
  'Housing', 'Utilities', 'Car', 'Insurance', 'Phone', 'Internet',
  'Subscriptions', 'Debt', 'Food', 'Health', 'Entertainment', 'Other', 'Savings',
] as const;
const VALID_RECURRING = ['monthly', 'weekly', 'biweekly', 'yearly', 'once'] as const;
// Cloudflare Workers' WebCrypto rejects PBKDF2 counts above 100,000. The
// iteration count is stored with every hash, so older 310,000-count hashes
// remain verifiable in Node; new accounts use the highest portable count.
const PASSWORD_ITERATIONS = 100_000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )`,
  `ALTER TABLE users ADD COLUMN username TEXT COLLATE NOCASE`,
  `ALTER TABLE users ADD COLUMN password_hash TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
     ON users(lower(username)) WHERE username IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     revoked_at INTEGER
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS paychecks (
     id TEXT PRIMARY KEY, user_id TEXT, date TEXT NOT NULL, amount REAL,
     allocated REAL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS bills (
     id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, amount REAL NOT NULL,
     due_day INTEGER, category TEXT, recurring TEXT DEFAULT 'monthly',
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS allocations (
     id TEXT PRIMARY KEY, user_id TEXT, paycheck_id TEXT, bill_id TEXT,
     amount REAL, paid BOOLEAN DEFAULT 0, paid_date TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS history (
     id TEXT PRIMARY KEY, user_id TEXT, bill_id TEXT, paycheck_id TEXT,
     paid_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS idx_allocations_user_id ON allocations(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_paychecks_user_id ON paychecks(user_id)`,
] as const;

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

const rateLimitState = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_MAX_KEYS = 5000;

function ignorableSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate column name|already exists/i.test(message);
}

/** Create or align schema without deleting or rewriting existing records. */
export async function ensureDatabaseSchema(db: DbAdapter): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await db.run(statement, []);
    } catch (error) {
      if (!ignorableSchemaError(error)) throw error;
    }
  }
}

export function parseAllowedOrigins(configured?: string): string[] {
  const values = (configured ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(value => /^https?:\/\//i.test(value) && !value.includes('*'));
  return values.length > 0 ? values : [...DEFAULT_ORIGINS];
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitState.get(key);
  if (!entry || now > entry.reset) {
    if (rateLimitState.size >= RATE_LIMIT_MAX_KEYS) {
      for (const [k, v] of rateLimitState) {
        if (now > v.reset) rateLimitState.delete(k);
      }
      while (rateLimitState.size >= RATE_LIMIT_MAX_KEYS) {
        const oldest = rateLimitState.keys().next().value;
        if (oldest === undefined) break;
        rateLimitState.delete(oldest);
      }
    }
    rateLimitState.set(key, { count: 1, reset: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 100;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

function derivePasswordKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle;
  const material = globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return material.then(key => subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  ).then(bits => new Uint8Array(bits)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePasswordKey(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(derived)}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
  const iterations = Number(parts[1]);
  const salt = base64UrlToBytes(parts[2]);
  const expected = base64UrlToBytes(parts[3]);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || !salt || !expected) return false;
  const actual = await derivePasswordKey(password, salt, iterations);
  return constantTimeEqual(actual, expected);
}

export function newSessionToken(): string {
  return bytesToBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return /^[a-z0-9._-]{3,64}$/.test(username) ? username : null;
}

function normalizePassword(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 12 || value.length > 200) return null;
  return value;
}

export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function createSession(db: DbAdapter, userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = newSessionToken();
  const now = Date.now();
  await db.run(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [await hashToken(token), userId, now, now + SESSION_TTL_MS],
  );
  return { token, expiresAt: new Date(now + SESSION_TTL_MS).toISOString() };
}

export async function registerUser(db: DbAdapter, body: unknown): Promise<Result<{ id: string }>> {
  const b = asRecord(body);
  const username = normalizeUsername(b.username);
  const password = normalizePassword(b.password);
  if (!username || !password) {
    return { ok: false, status: 400, error: 'username must be 3-64 characters and password at least 12 characters' };
  }
  const existing = await db.one('SELECT id FROM users WHERE lower(username) = ?', [username]);
  if (existing) return { ok: false, status: 409, error: 'username is unavailable' };

  const id = globalThis.crypto.randomUUID().toLowerCase();
  await db.run(
    'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
    [id, username, await hashPassword(password), new Date().toISOString()],
  );
  return { ok: true, value: { id } };
}

export async function loginUser(db: DbAdapter, body: unknown): Promise<Result<{ token: string; expiresAt: string }>> {
  const b = asRecord(body);
  const username = normalizeUsername(b.username);
  const password = normalizePassword(b.password);
  const invalid = { ok: false as const, status: 401, error: 'invalid username or password' };
  if (!username || !password) return invalid;

  const row = asRecord(await db.one('SELECT id, password_hash FROM users WHERE lower(username) = ?', [username]));
  const storedHash = typeof row.password_hash === 'string' ? row.password_hash : '';
  const id = typeof row.id === 'string' && isValidId(row.id) ? row.id : '';
  const passwordMatches = storedHash ? await verifyPassword(password, storedHash) : false;
  if (!id || !passwordMatches) return invalid;

  return { ok: true, value: await createSession(db, id) };
}

/** Authenticate using only a verified session token; returns the DB-owned id. */
export async function authenticate(db: DbAdapter, authorization: string | null | undefined): Promise<string | null> {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec((authorization ?? '').trim());
  if (!match) return null;
  const row = asRecord(await db.one(
    `SELECT s.user_id AS userId FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
    [await hashToken(match[1]), Date.now()],
  ));
  return typeof row.userId === 'string' && isValidId(row.userId) ? row.userId : null;
}

export async function revokeSession(db: DbAdapter, authorization: string | null | undefined): Promise<boolean> {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec((authorization ?? '').trim());
  if (!match) return false;
  await db.run(
    'UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL',
    [Date.now(), await hashToken(match[1])],
  );
  return true;
}

function validMoney(value: unknown, field = 'amount'): Result<number> {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_MONEY) {
    return { ok: false, status: 400, error: `invalid ${field}` };
  }
  return { ok: true, value: roundCents(value) };
}

function boundedNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_MONEY
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
  if (parsed.ok === false) return parsed;
  const { id = globalThis.crypto.randomUUID().toLowerCase(), name, amount, day, category, recurring } = parsed.value;
  const existing = await db.one('SELECT user_id FROM bills WHERE id = ?', [id]);
  if (existing && asRecord(existing).user_id !== userId) {
    return { ok: false, status: 403, error: 'bill id belongs to another user' };
  }
  await db.run(BILL_UPSERT, [id, userId, name, amount, day, category, recurring]);
  return { ok: true, value: { id } };
}

async function savePaycheck(db: DbAdapter, userId: string, body: unknown): Promise<Result<{ id: string }>> {
  const parsed = parsePaycheck(body);
  if (parsed.ok === false) return parsed;
  const { id = globalThis.crypto.randomUUID().toLowerCase(), date, amount, allocated } = parsed.value;
  const existing = await db.one('SELECT user_id FROM paychecks WHERE id = ?', [id]);
  if (existing && asRecord(existing).user_id !== userId) {
    return { ok: false, status: 403, error: 'paycheck id belongs to another user' };
  }
  await db.run(PAYCHECK_UPSERT, [id, userId, date, amount, allocated]);
  return { ok: true, value: { id } };
}

async function saveAllocation(db: DbAdapter, userId: string, body: unknown): Promise<Result<{ id: string }>> {
  const parsed = parseAllocation(body);
  if (parsed.ok === false) return parsed;
  const { id = globalThis.crypto.randomUUID().toLowerCase(), paycheckId, billId, amount, paid, paidDate } = parsed.value;
  const paycheck = await db.one('SELECT 1 AS ok FROM paychecks WHERE id = ? AND user_id = ?', [paycheckId, userId]);
  const bill = await db.one('SELECT 1 AS ok FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);
  if (!paycheck || !bill) {
    return { ok: false, status: 403, error: 'paycheck or bill does not belong to user' };
  }
  const existing = await db.one('SELECT paycheck_id FROM allocations WHERE id = ?', [id]);
  if (existing) {
    const parentId = asRecord(existing).paycheck_id;
    const owner = await db.one('SELECT user_id FROM paychecks WHERE id = ?', [typeof parentId === 'string' ? parentId : '']);
    if (!owner || asRecord(owner).user_id !== userId) {
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
  await db.run(
    `DELETE FROM allocations WHERE id = ? AND paycheck_id IN (SELECT id FROM paychecks WHERE user_id = ?)`,
    [id.toLowerCase(), userId],
  );
}

export async function handleAuthRequest(
  db: DbAdapter,
  method: string,
  pathname: string,
  body: unknown,
  authorization: string | null | undefined,
): Promise<Result<unknown> | null> {
  if (method !== 'POST') return null;
  if (pathname === '/api/auth/register') return registerUser(db, body);
  if (pathname === '/api/auth/login') return loginUser(db, body);
  if (pathname === '/api/auth/logout') {
    return (await revokeSession(db, authorization))
      ? { ok: true, value: {} }
      : { ok: false, status: 401, error: 'invalid session' };
  }
  return null;
}

export async function handleDataRequest(
  db: DbAdapter,
  userId: string,
  method: string,
  pathname: string,
  body: unknown,
): Promise<Result<unknown>> {
  if (pathname === '/api/bills' && method === 'GET') {
    return { ok: true, value: await db.all('SELECT * FROM bills WHERE user_id = ? ORDER BY created_at DESC', [userId]) };
  }
  if (pathname === '/api/bills' && method === 'POST') return saveBill(db, userId, body);
  if (pathname.startsWith('/api/bills/') && method === 'DELETE') {
    await deleteOwned(db, userId, 'bills', pathname.split('/')[3] || '');
    return { ok: true, value: {} };
  }
  if (pathname === '/api/paychecks' && method === 'GET') {
    return { ok: true, value: await db.all('SELECT * FROM paychecks WHERE user_id = ? ORDER BY date DESC', [userId]) };
  }
  if (pathname === '/api/paychecks' && method === 'POST') return savePaycheck(db, userId, body);
  if (pathname.startsWith('/api/paychecks/') && method === 'DELETE') {
    await deleteOwned(db, userId, 'paychecks', pathname.split('/')[3] || '');
    return { ok: true, value: {} };
  }
  if (pathname === '/api/allocations' && method === 'GET') {
    return {
      ok: true,
      value: await db.all(
        `SELECT a.* FROM allocations a JOIN paychecks p ON p.id = a.paycheck_id WHERE p.user_id = ?`,
        [userId],
      ),
    };
  }
  if (pathname === '/api/allocations' && method === 'POST') return saveAllocation(db, userId, body);
  if (pathname.startsWith('/api/allocations/') && method === 'DELETE') {
    await deleteAllocation(db, userId, pathname.split('/')[3] || '');
    return { ok: true, value: {} };
  }
  if (pathname === '/api/history' && method === 'GET') {
    return { ok: true, value: await db.all('SELECT * FROM history WHERE user_id = ?', [userId]) };
  }
  return { ok: false, status: 404, error: 'not found' };
}

export function resultBody(value: unknown): unknown {
  return Array.isArray(value) ? value : { ok: true, ...asRecord(value) };
}

export { sumMoney };
