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
const ATTACKER = '22222222-2222-4222-8222-222222222222';
const PAYCHECK = '33333333-3333-4333-8333-333333333333';
const ALLOCATION = '44444444-4444-4444-8444-444444444444';

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

const jsonPost = (userId: string, payload: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
  body: JSON.stringify(payload),
});
const getAs = (userId: string): RequestInit => ({ headers: { 'x-user-id': userId } });

test('financial API is disabled by default while health stays reachable', async () => {
  const base = await startServer(3921, false);
  const health = await call(base, '/api/health');
  assert.equal(health.status, 200);
  const bills = await call(base, '/api/bills', getAs(VICTIM));
  assert.equal(bills.status, 503);
  const allocations = await call(base, '/api/allocations', getAs(VICTIM));
  assert.equal(allocations.status, 503);
});

test('opt-in API enforces ownership, relational integrity and cent rounding', async () => {
  const base = await startServer(3922, true);

  const missingId = await call(base, '/api/bills');
  assert.equal(missingId.status, 401);

  const seed = await call(base, '/api/bills', jsonPost(VICTIM, {
    id: VICTIM, name: 'Victim Rent', amount: 950.005, category: 'Housing',
  }));
  assert.equal(seed.status, 200);

  const overwrite = await call(base, '/api/bills', jsonPost(ATTACKER, {
    id: VICTIM, name: 'Attacker Overwrite', amount: 1, category: 'Housing',
  }));
  assert.equal(overwrite.status, 403);

  const victimBills = await call(base, '/api/bills', getAs(VICTIM));
  assert.deepEqual(victimBills.body, [{
    id: VICTIM,
    user_id: VICTIM,
    name: 'Victim Rent',
    amount: 950.01,
    due_day: 1,
    category: 'Housing',
    recurring: 'monthly',
    created_at: (victimBills.body as Array<{ created_at: string }>)[0]?.created_at,
  }]);

  const paycheck = await call(base, '/api/paychecks', jsonPost(VICTIM, {
    id: PAYCHECK, date: '2026-11-20', amount: 1450,
  }));
  assert.equal(paycheck.status, 200);

  const foreignAllocation = await call(base, '/api/allocations', jsonPost(ATTACKER, {
    id: ALLOCATION, paycheck_id: PAYCHECK, bill_id: VICTIM, amount: 950,
  }));
  assert.equal(foreignAllocation.status, 403);

  const ownAllocation = await call(base, '/api/allocations', jsonPost(VICTIM, {
    id: ALLOCATION, paycheck_id: PAYCHECK, bill_id: VICTIM, amount: 950.004,
  }));
  assert.equal(ownAllocation.status, 200);

  const allocations = await call(base, '/api/allocations', getAs(VICTIM));
  assert.equal((allocations.body as Array<{ amount: number }>)[0]?.amount, 950);

  const deleteAttempt = await call(base, `/api/bills/${VICTIM}`, {
    method: 'DELETE', headers: { 'x-user-id': ATTACKER },
  });
  assert.equal(deleteAttempt.status, 200);
  const stillThere = await call(base, '/api/bills', getAs(VICTIM));
  assert.equal((stillThere.body as unknown[]).length, 1);
});
