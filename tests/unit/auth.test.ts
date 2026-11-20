import assert from 'node:assert/strict';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import {
  authenticate,
  ensureDatabaseSchema,
  hashPassword,
  hashToken,
  loginUser,
  newSessionToken,
  parseAllowedOrigins,
  registerUser,
  revokeSession,
  verifyPassword,
  type DbAdapter,
} from '../../apiCore';

async function makeDatabase(): Promise<DbAdapter> {
  const sqlite = new DatabaseSync(':memory:');
  const adapter: DbAdapter = {
    one: (sql, params) => sqlite.prepare(sql).get(...params) ?? null,
    all: (sql, params) => sqlite.prepare(sql).all(...params),
    run: (sql, params) => sqlite.prepare(sql).run(...params),
  };
  await ensureDatabaseSchema(adapter);
  return adapter;
}

const PASSWORD = 'correct horse battery staple';

test('password hashes stay within Worker WebCrypto limits and verify legacy hashes', async () => {
  const encoded = await hashPassword(PASSWORD);
  const iterations = Number(encoded.split('$')[1]);
  assert.equal(iterations, 100_000, 'Cloudflare Workers reject PBKDF2 counts above 100000');
  assert.equal(await verifyPassword(PASSWORD, encoded), true);
  assert.equal(await verifyPassword('wrong password', encoded), false);

  // A hash created by the earlier Node-only 310,000-count build stays valid
  // when verified in Node (Workers cannot derive above 100,000 iterations).
  const salt = randomBytes(16);
  const derived = pbkdf2Sync(PASSWORD, salt, 310_000, 32, 'sha256');
  const legacy = [
    'pbkdf2-sha256', '310000',
    salt.toString('base64url'), derived.toString('base64url'),
  ].join('$');
  assert.equal(await verifyPassword(PASSWORD, legacy), true);
});

test('registration enforces credential shape and does not allow duplicates', async () => {
  const db = await makeDatabase();
  const invalid = await registerUser(db, { username: 'ab', password: 'short' });
  assert.equal(invalid.ok, false);

  const created = await registerUser(db, { username: 'Alice', password: PASSWORD });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const duplicate = await registerUser(db, { username: 'alice', password: PASSWORD });
  assert.equal(duplicate.ok, false);
  if (duplicate.ok) return;
  assert.equal(duplicate.status, 409);
});

test('sessions are derived from verified credentials and can be revoked', async () => {
  const db = await makeDatabase();
  const created = await registerUser(db, { username: 'alice', password: PASSWORD });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const wrongPassword = await loginUser(db, { username: 'alice', password: 'wrong horse battery staple' });
  assert.equal(wrongPassword.ok, false);
  if (wrongPassword.ok) return;
  assert.equal(wrongPassword.status, 401);

  const login = await loginUser(db, { username: 'ALICE', password: PASSWORD });
  assert.equal(login.ok, true);
  if (!login.ok) return;
  assert.match(login.value.token, /^[A-Za-z0-9_-]{43}$/);

  assert.equal(await authenticate(db, `Bearer ${login.value.token}`), created.value.id);
  assert.equal(await authenticate(db, 'Bearer not-a-token'), null);
  assert.equal(await authenticate(db, ''), null);
  assert.equal(await authenticate(db, `Bearer ${'a'.repeat(43)}`), null);

  assert.equal(await revokeSession(db, `Bearer ${login.value.token}`), true);
  assert.equal(await authenticate(db, `Bearer ${login.value.token}`), null);
});

test('expired session tokens are rejected', async () => {
  const db = await makeDatabase();
  const created = await registerUser(db, { username: 'alice', password: PASSWORD });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const token = newSessionToken();
  const now = Date.now();
  await db.run(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [await hashToken(token), created.value.id, now - 10_000, now - 1],
  );
  assert.equal(await authenticate(db, `Bearer ${token}`), null);
});

test('CORS origins reject wildcards and unknown values', () => {
  assert.deepEqual(parseAllowedOrigins('https://one.example, *'), ['https://one.example']);
  assert.ok(parseAllowedOrigins('').length > 0);
  assert.ok(!parseAllowedOrigins('*').some(origin => origin.includes('*')));
});
