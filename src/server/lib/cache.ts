import Redis from 'ioredis';

/**
 * Valkey is wire-compatible with Redis, so the well-established `ioredis`
 * client works against it unchanged — connecting via the full
 * `${cache_connectionString}` (aliased to `CACHE_URL`) carries the
 * mandatory auth automatically. Valkey on Zerops REQUIRES auth; connecting
 * without a password throws `NOAUTH Authentication required.` on the first
 * command.
 *
 * Constructed lazily (first real use), not at module top level. Analog's
 * production build prerenders `/`, which boots an in-process Nitro server
 * — including this module — before the container ever runs and before
 * Zerops has injected CACHE_URL. A lazy singleton behind a Proxy defers
 * construction until a request handler actually calls a method on
 * `cache`, by which point real runtime env is present; every call site
 * keeps using `cache.get(...)` / `cache.multi()...` unchanged.
 */
let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis(process.env['CACHE_URL'] as string, {
      // Fail fast on the status-check path rather than ioredis's default
      // of queuing commands indefinitely while it retries in the background.
      maxRetriesPerRequest: 3,
    });
    client.on('error', (err) => {
      // ioredis emits 'error' on every reconnect attempt while the
      // connection is down; log without crashing the process (an
      // unhandled 'error' event on an EventEmitter is fatal otherwise).
      console.error('cache: connection error', err.message);
    });
  }
  return client;
}

export const cache = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

const SESSION_CACHE_PREFIX = 'session-user:';
const SESSION_CACHE_TTL_SECONDS = 20;
const CACHE_HITS_KEY = 'cache:hits';
const CACHE_MISSES_KEY = 'cache:misses';

export async function getCachedProfile(cacheKey: string): Promise<string | null> {
  return cache.get(SESSION_CACHE_PREFIX + cacheKey);
}

export async function setCachedProfile(cacheKey: string, value: string): Promise<void> {
  await cache.set(SESSION_CACHE_PREFIX + cacheKey, value, 'EX', SESSION_CACHE_TTL_SECONDS);
}

export async function invalidateCachedProfile(cacheKey: string): Promise<void> {
  await cache.del(SESSION_CACHE_PREFIX + cacheKey);
}

export async function recordCacheHit(): Promise<void> {
  await cache.incr(CACHE_HITS_KEY);
}

export async function recordCacheMiss(): Promise<void> {
  await cache.incr(CACHE_MISSES_KEY);
}

export async function getCacheCounters(): Promise<{ hits: number; misses: number }> {
  const [hits, misses] = await cache.mget(CACHE_HITS_KEY, CACHE_MISSES_KEY);
  return { hits: Number(hits ?? 0), misses: Number(misses ?? 0) };
}

/**
 * Status-strip liveness check — a real PING round-trip, not just "the
 * client object exists".
 */
export async function isCacheHealthy(): Promise<boolean> {
  try {
    const pong = await cache.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
