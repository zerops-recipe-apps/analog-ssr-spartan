import { cache } from './cache';

/**
 * "Recent activity" projection for the queue-demo — lives in Valkey
 * (already wired for the cache-demo) rather than a new Postgres table.
 * `LPUSH` + `LTRIM` gives a naturally-capped, newest-first list for free:
 * `LPUSH` puts the newest entry at index 0, `LTRIM 0 N-1` keeps only the
 * most recent N, and `LRANGE 0 N-1` reads them back newest-first — no
 * application-side sort needed.
 */
const RECENT_ACTIVITY_KEY = 'queue:recent-activity';
const RECENT_ACTIVITY_MAX = 20;
const PENDING_KEY = 'queue:pending';
const PROCESSED_KEY = 'queue:processed';

export interface ActivityEntry {
  type: 'signup' | 'profile_update' | 'ping';
  userId: string;
  name: string;
  message?: string;
  timestamp: string;
  processedAt: string;
}

/** Called at publish time (before the broker round-trip resolves). */
export async function markActivityPending(): Promise<void> {
  await cache.incr(PENDING_KEY);
}

/**
 * Called by the in-process NATS consumer once a `user.signup` message is
 * received. Moves the counter from pending to processed and appends the
 * entry to the recent-activity feed.
 */
export async function recordActivityProcessed(
  entry: Omit<ActivityEntry, 'processedAt'>,
): Promise<void> {
  const withTimestamp: ActivityEntry = {
    ...entry,
    processedAt: new Date().toISOString(),
  };
  await cache
    .multi()
    .lpush(RECENT_ACTIVITY_KEY, JSON.stringify(withTimestamp))
    .ltrim(RECENT_ACTIVITY_KEY, 0, RECENT_ACTIVITY_MAX - 1)
    .decr(PENDING_KEY)
    .incr(PROCESSED_KEY)
    .exec();
}

export async function getActivityState(): Promise<{
  pending: number;
  processed: number;
  recent: ActivityEntry[];
}> {
  const [pendingRaw, processedRaw, rawEntries] = await Promise.all([
    cache.get(PENDING_KEY),
    cache.get(PROCESSED_KEY),
    cache.lrange(RECENT_ACTIVITY_KEY, 0, RECENT_ACTIVITY_MAX - 1),
  ]);
  return {
    // Clamp at 0 — `pending` is a demo gauge, not a durable ledger; a
    // process restart between an increment and its matching decrement
    // (or a message the consumer never acked) can otherwise show a
    // small negative number, which reads as a bug on the dashboard.
    pending: Math.max(0, Number(pendingRaw ?? 0)),
    processed: Number(processedRaw ?? 0),
    recent: rawEntries.map((raw) => JSON.parse(raw) as ActivityEntry),
  };
}

/** Seed-time helper — increments processed directly without a broker round-trip. */
export async function seedActivityProcessed(count: number): Promise<void> {
  if (count > 0) {
    await cache.incrby(PROCESSED_KEY, count);
  }
}
