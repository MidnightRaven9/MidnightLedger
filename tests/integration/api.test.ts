import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const REPO = path.resolve(import.meta.dirname, '../..');
const TSX = path.join(REPO, 'node_modules', '.bin', 'tsx');
const SERVER = path.join(REPO, 'server.ts');
const cwd = mkdtempSync(path.join(tmpdir(), 'midnightledger-api-'));

const VICTIM = '11111111-1111-4111-8111-111111111111';
const PAYCHECK = '33333333-3333-4333-8333-333333333333';
const ALLOCATION = '44444444-4444-4444-8444-444444444444';
const PASSWORD = 'correct horse battery staple';

const processes: ChildProcess[] = [];

after(() => {
  processes.forEach(child => child.kill('SIGTERM'));
  rmSync(cwd, { recursive: true, force: true });
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function startServer(port: number, enableApi: boolean): Promise<string> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
  };
  delete env.ENABLE_FINANCIAL_API;
  if (enableApi) env.ENABLE_FINANCIAL_API = '1';

  const child = spawn(TSX, [SERVER], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  processes.push(child);
  let output = '';
  child.stdout?.on('data', chunk => { output += String(chunk); });
  child.stderr?.on('data', chunk => { output += String(chunk); });

  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(250);
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return base;
    } catch {
      // Server not ready yet.
    }
  }
  throw new Error(`Server did not become ready: ${output}`);
}

async function call(base: string, endpoint: string, options: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${base}${endpoint}`, options);
  return { status: response.status, body: await response.json() };
}

const jsonPost = (token: string, payload: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});
const getAs = (token: string): RequestInit => ({ headers: { Authorization: `Bearer ${token}` } });

async function login(base: string, username: string): Promise<string> {
  const result = await call(base, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  assert.equal(result.status, 200);
  return (result.body as { token: string }).token;
}

async function register(base: string, username: string): Promise<{ id: string; token: string }> {
  const result = await call(base, '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  assert.equal(result.status, 200);
  return { id: (result.body as { id: string }).id, token: await login(base, username) };
}

test('financial API and auth endpoints are disabled by default while health stays reachable', async () => {
  const base = await startServer(3921, false);
  const health = await call(base, '/api/health');
  assert.equal(health.status, 200);

  const healthFromUnknownOrigin = await call(base, '/api/health', {
    headers: { Origin: 'https://unknown.example' },
  });
  assert.equal(healthFromUnknownOrigin.status, 200, 'health is not subject to API CORS');

  const bills = await call(base, '/api/bills', getAs('a'.repeat(43)));
  assert.equal(bills.status, 503);

  const crossOriginBills = await call(base, '/api/bills', {
    ...getAs('a'.repeat(43)),
    headers: { Authorization: `Bearer ${'a'.repeat(43)}`, Origin: 'https://unknown.example' },
  });
  assert.equal(crossOriginBills.status, 403);

  const sameOriginBills = await call(base, '/api/bills', {
    headers: { Authorization: `Bearer ${'a'.repeat(43)}`, Origin: base },
  });
  assert.equal(sameOriginBills.status, 503, 'same-origin requests are not blocked by CORS');

  const registerAttempt = await call(base, '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: PASSWORD }),
  });
  assert.equal(registerAttempt.status, 503);
});

test('opt-in API requires verified sessions and enforces ownership end to end', async () => {
  const base = await startServer(3922, true);

  const missingSession = await call(base, '/api/bills');
  assert.equal(missingSession.status, 401);

  const spoofed = await call(base, '/api/bills', { headers: { 'x-user-id': VICTIM } });
  assert.equal(spoofed.status, 401);

  const invalidToken = await call(base, '/api/bills', getAs('not-a-token'));
  assert.equal(invalidToken.status, 401);

  const weakRegistration = await call(base, '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'weak', password: 'short' }),
  });
  assert.equal(weakRegistration.status, 400);

  const victim = await register(base, 'victim_user');
  const attacker = await register(base, 'attacker_user');
  const victimToken = victim.token;
  const attackerToken = attacker.token;

  const badLogin = await call(base, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'victim_user', password: 'wrong password value' }),
  });
  assert.equal(badLogin.status, 401);

  const seed = await call(base, '/api/bills', jsonPost(victimToken, {
    id: VICTIM, name: 'Victim Rent', amount: 950.005, category: 'Housing',
  }));
  assert.equal(seed.status, 200);

  const overwrite = await call(base, '/api/bills', jsonPost(attackerToken, {
    id: VICTIM, name: 'Attacker Overwrite', amount: 1, category: 'Housing',
  }));
  assert.equal(overwrite.status, 403);

  const victimBills = await call(base, '/api/bills', getAs(victimToken));
  assert.deepEqual(victimBills.body, [{
    id: VICTIM,
    user_id: victim.id,
    name: 'Victim Rent',
    amount: 950.01,
    due_day: 1,
    category: 'Housing',
    recurring: 'monthly',
    created_at: (victimBills.body as Array<{ created_at: string }>)[0]?.created_at,
  }]);

  const attackerBills = await call(base, '/api/bills', getAs(attackerToken));
  assert.deepEqual(attackerBills.body, []);

  const paycheck = await call(base, '/api/paychecks', jsonPost(victimToken, {
    id: PAYCHECK, date: '2026-11-20', amount: 1450,
  }));
  assert.equal(paycheck.status, 200);

  const foreignAllocation = await call(base, '/api/allocations', jsonPost(attackerToken, {
    id: ALLOCATION, paycheck_id: PAYCHECK, bill_id: VICTIM, amount: 950,
  }));
  assert.equal(foreignAllocation.status, 403);

  const ownAllocation = await call(base, '/api/allocations', jsonPost(victimToken, {
    id: ALLOCATION, paycheck_id: PAYCHECK, bill_id: VICTIM, amount: 950.004,
  }));
  assert.equal(ownAllocation.status, 200);

  const allocations = await call(base, '/api/allocations', getAs(victimToken));
  assert.equal((allocations.body as Array<{ amount: number }>)[0]?.amount, 950);

  const deleteAttempt = await call(base, `/api/bills/${VICTIM}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${attackerToken}` },
  });
  assert.equal(deleteAttempt.status, 200);
  const stillThere = await call(base, '/api/bills', getAs(victimToken));
  assert.equal((stillThere.body as unknown[]).length, 1);

  const logout = await call(base, '/api/auth/logout', jsonPost(victimToken, {}));
  assert.equal(logout.status, 200);
  const afterLogout = await call(base, '/api/bills', getAs(victimToken));
  assert.equal(afterLogout.status, 401);

  const bodyLessLogout = await call(base, '/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${attackerToken}` },
  });
  assert.equal(bodyLessLogout.status, 200, 'logout does not require a JSON body');
  const afterAttackerLogout = await call(base, '/api/bills', getAs(attackerToken));
  assert.equal(afterAttackerLogout.status, 401);
});
