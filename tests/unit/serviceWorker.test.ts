import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const SOURCE = readFileSync(path.resolve(import.meta.dirname, '../../public/sw.js'), 'utf8');
const ORIGIN = 'https://app.example';
const CURRENT_CACHE = 'midnightledger-app-__BUILD_ID__';

interface Harness {
  listeners: Map<string, (event: unknown) => void>;
  calls: { skipWaiting: number; claim: number; fetches: string[] };
  cacheMap: Map<string, Map<string, Response>>;
  setOffline: (offline: boolean) => void;
  dispatchFetch: (request: { method: string; url: string; mode?: string }) => Promise<Response> | null;
  dispatchLifecycle: (type: 'install' | 'activate') => Promise<void>;
}

function createHarness(): Harness {
  const listeners = new Map<string, (event: unknown) => void>();
  const calls = { skipWaiting: 0, claim: 0, fetches: [] as string[] };
  const cacheMap = new Map<string, Map<string, Response>>();
  let offline = false;

  const normalize = (value: string | { url: string }): string =>
    typeof value === 'string' ? new URL(value, ORIGIN).href : value.url;

  const caches = {
    open: async (name: string) => {
      const store = cacheMap.get(name) ?? new Map<string, Response>();
      cacheMap.set(name, store);
      return {
        addAll: async (paths: string[]) => {
          for (const entry of paths) store.set(new URL(entry, ORIGIN).href, new Response('shell'));
        },
        put: async (request: string | { url: string }, response: Response) => {
          store.set(normalize(request), response);
        },
        match: async (request: string | { url: string }) => store.get(normalize(request)),
      };
    },
    match: async (request: string | { url: string }) => {
      for (const store of cacheMap.values()) {
        const found = store.get(normalize(request));
        if (found) return found;
      }
      return undefined;
    },
    keys: async () => [...cacheMap.keys()],
    delete: async (name: string) => cacheMap.delete(name),
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    skipWaiting: () => { calls.skipWaiting++; },
    clients: { claim: () => { calls.claim++; } },
  };

  const fetchImpl = async (request: { url: string }): Promise<Response> => {
    calls.fetches.push(request.url);
    if (offline) throw new Error('offline');
    return new Response('network');
  };

  vm.runInNewContext(SOURCE, {
    self,
    caches,
    fetch: fetchImpl,
    URL,
    Response,
    console,
  });

  return {
    listeners,
    calls,
    cacheMap,
    setOffline: value => { offline = value; },
    dispatchLifecycle: async type => {
      let pending: Promise<unknown> | undefined;
      listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
      if (pending) await pending;
    },
    dispatchFetch: request => {
      let pending: Promise<Response> | undefined;
      listeners.get('fetch')?.({
        request,
        respondWith: (promise: Promise<Response>) => { pending = promise; },
      });
      return pending ?? null;
    },
  };
}

test('service worker install precaches the app shell with a build-stamped cache', async () => {
  assert.match(SOURCE, /__BUILD_ID__/);
  const harness = createHarness();
  await harness.dispatchLifecycle('install');
  assert.equal(harness.calls.skipWaiting, 1);
  const cache = harness.cacheMap.get(CURRENT_CACHE);
  assert.ok(cache, 'versioned app cache was created');
  assert.ok(cache?.has(`${ORIGIN}/index.html`));
  assert.ok(cache?.has(`${ORIGIN}/`));
});

test('activation removes stale app caches but preserves unrelated caches', async () => {
  const harness = createHarness();
  harness.cacheMap.set('midnightledger-app-old', new Map());
  harness.cacheMap.set('user-financial-data', new Map());
  await harness.dispatchLifecycle('activate');
  assert.equal(harness.cacheMap.has('midnightledger-app-old'), false);
  assert.equal(harness.cacheMap.has('user-financial-data'), true);
  assert.equal(harness.calls.claim, 1);
});

test('navigation is network-first and falls back to the cached app shell offline', async () => {
  const harness = createHarness();
  await harness.dispatchLifecycle('install');

  const online = await harness.dispatchFetch({ method: 'GET', url: `${ORIGIN}/bills`, mode: 'navigate' });
  assert.equal(await online?.text(), 'network');
  await Promise.resolve();
  await Promise.resolve();

  harness.setOffline(true);
  const offline = await harness.dispatchFetch({ method: 'GET', url: `${ORIGIN}/bills`, mode: 'navigate' });
  assert.equal(await offline?.text(), 'network');
});

test('assets are cached, API traffic is never cached, and cross-origin requests are ignored', async () => {
  const harness = createHarness();
  await harness.dispatchLifecycle('install');

  const assetUrl = `${ORIGIN}/assets/index-abc.js`;
  const first = await harness.dispatchFetch({ method: 'GET', url: assetUrl });
  assert.equal(await first?.text(), 'network');
  await Promise.resolve();
  await Promise.resolve();

  harness.setOffline(true);
  const cachedAsset = await harness.dispatchFetch({ method: 'GET', url: assetUrl });
  assert.equal(await cachedAsset?.text(), 'network');

  const fetchCount = harness.calls.fetches.length;
  assert.equal(harness.dispatchFetch({ method: 'GET', url: `${ORIGIN}/api/bills` }), null);
  assert.equal(harness.dispatchFetch({ method: 'GET', url: 'https://other.example/data' }), null);
  assert.equal(harness.calls.fetches.length, fetchCount);

  const cache = harness.cacheMap.get(CURRENT_CACHE);
  assert.equal(cache?.has(`${ORIGIN}/api/bills`), false);
});
