import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import {
  ensureDatabaseSchema,
  hashToken,
  newSessionToken,
  type DbAdapter,
  type D1DatabaseLike,
} from '../../apiCore';
import worker from '../../worker';

const PASSWORD = 'correct horse battery staple';
const BILL_ID = '11111111-1111-4111-8111-111111111111';

async function makeEnv(enabled: boolean) {
  const sqlite = new DatabaseSync(':memory:');
  const adapter: DbAdapter = {
    one: (sql, params) => sqlite.prepare(sql).get(...params) ?? null,
    all: (sql, params) => sqlite.prepare(sql).all(...params),
    run: (sql, params) => sqlite.prepare(sql).run(...params),
  };
  await ensureDatabaseSchema(adapter);
  const db: D1DatabaseLike = {
    prepare(sql) {
      let params: unknown[] = [];
      return {
        bind(...values) {
          params = values;
          return this;
        },
        first: async () => (await adapter.one(sql, params as never[])) ?? null,
        all: async () => ({ results: await adapter.all(sql, params as never[]) }),
        run: async () => adapter.run(sql, params as never[]),
      };
    },
  };
  return {
    adapter,
    env: {
      DB: db,
      ASSETS: { fetch: async () => new Response('static') },
      ALLOWED_ORIGINS: 'http://localhost:5173',
      ENABLE_FINANCIAL_API: enabled ? '1' : '0',
    },
  };
}

async function call(
  env: Awaited<ReturnType<typeof makeEnv>>['env'],
  path: string,
  options: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    env,
  );
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Static assets return plain text in this harness.
  }
  return { status: response.status, body };
}

async function createSession(
  env: Awaited<ReturnType<typeof makeEnv>>['env'],
  username: string,
): Promise<{ userId: string; token: string }> {
  const registration = await call(env, '/api/auth/register', {
    method: 'POST',
    body: { username, password: PASSWORD },
  });
  assert.equal(registration.status, 200);
  const login = await call(env, '/api/auth/login', {
    method: 'POST',
    body: { username, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  return {
    userId: (registration.body as { id: string }).id,
    token: (login.body as { token: string }).token,
  };
}

test('Worker keeps financial and auth routes disabled by default', async () => {
  const { env } = await makeEnv(false);
  const bills = await call(env, '/api/bills');
  const register = await call(env, '/api/auth/register', {
    method: 'POST',
    body: { username: 'alice', password: PASSWORD },
  });
  assert.equal(bills.status, 503);
  assert.equal(register.status, 503);
});

test('Worker serves static assets broadly but restricts cross-origin API calls', async () => {
  const { env } = await makeEnv(true);

  const asset = await call(env, '/index.html', { headers: { Origin: 'https://unknown.example' } });
  assert.equal(asset.status, 200);
  assert.equal(asset.body, 'static');

  const health = await call(env, '/api/health', { headers: { Origin: 'https://unknown.example' } });
  assert.equal(health.status, 200);

  const crossOrigin = await call(env, '/api/bills', { headers: { Origin: 'https://unknown.example' } });
  assert.equal(crossOrigin.status, 403);

  const sameOrigin = await call(env, '/api/bills', { headers: { Origin: 'http://localhost' } });
  assert.equal(sameOrigin.status, 401);
});

test('Worker derives ownership from a verified session, not client headers', async () => {
  const { env, adapter } = await makeEnv(true);

  const anonymous = await call(env, '/api/bills');
  assert.equal(anonymous.status, 401);

  const alice = await createSession(env, 'alice');
  const bob = await createSession(env, 'bob');
  assert.notEqual(alice.userId, bob.userId);

  const spoofed = await call(env, '/api/bills', { headers: { 'x-user-id': alice.userId } });
  assert.equal(spoofed.status, 401);

  const invalidLogin = await call(env, '/api/auth/login', {
    method: 'POST',
    body: { username: 'alice', password: 'not the right password' },
  });
  assert.equal(invalidLogin.status, 401);

  const created = await call(env, '/api/bills', {
    method: 'POST',
    token: alice.token,
    body: { id: BILL_ID, name: 'Victim Rent', amount: 950.005, category: 'Housing' },
  });
  assert.equal(created.status, 200);

  const aliceBills = await call(env, '/api/bills', { token: alice.token });
  assert.equal((aliceBills.body as Array<{ amount: number }>)[0]?.amount, 950.01);

  const bobBills = await call(env, '/api/bills', { token: bob.token });
  assert.deepEqual(bobBills.body, []);

  const overwrite = await call(env, '/api/bills', {
    method: 'POST',
    token: bob.token,
    body: { id: BILL_ID, name: 'Attacker Rent', amount: 1, category: 'Housing' },
  });
  assert.equal(overwrite.status, 403);

  const expiredToken = newSessionToken();
  await adapter.run(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [await hashToken(expiredToken), alice.userId, Date.now() - 10_000, Date.now() - 1],
  );
  const expired = await call(env, '/api/bills', { token: expiredToken });
  assert.equal(expired.status, 401);

  const logout = await call(env, '/api/auth/logout', { method: 'POST', token: alice.token });
  assert.equal(logout.status, 200);
  const afterLogout = await call(env, '/api/bills', { token: alice.token });
  assert.equal(afterLogout.status, 401);
});
