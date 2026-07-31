import { defineEventHandler } from 'h3';

import { pool } from '../../lib/db';
import { isCacheHealthy } from '../../lib/cache';
import { isBrokerHealthy } from '../../lib/broker';
import { isSearchHealthy } from '../../lib/search';
import { isStorageHealthy } from '../../lib/storage';

const CHECK_TIMEOUT_MS = 3000;

function withTimeout(check: () => Promise<boolean>): Promise<boolean> {
  return Promise.race([
    check().catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), CHECK_TIMEOUT_MS)),
  ]);
}

async function isDbHealthy(): Promise<boolean> {
  await pool.query('SELECT 1');
  return true;
}

/**
 * Status-strip data source — one liveness probe per managed service, each
 * independently timeout-bounded so a single wedged dependency reports
 * "down" instead of hanging the whole response (and, in turn, hanging
 * every dashboard card that waits on this endpoint before rendering).
 */
export default defineEventHandler(async () => {
  const [db, cacheOk, broker, search, storage] = await Promise.all([
    withTimeout(isDbHealthy),
    withTimeout(isCacheHealthy),
    withTimeout(isBrokerHealthy),
    withTimeout(isSearchHealthy),
    withTimeout(isStorageHealthy),
  ]);

  return {
    api: 'ok' as const,
    db: db ? 'ok' : 'down',
    cache: cacheOk ? 'ok' : 'down',
    broker: broker ? 'ok' : 'down',
    search: search ? 'ok' : 'down',
    storage: storage ? 'ok' : 'down',
    // Diagnostic only — confirms the container is actually running the
    // `prod`/`dev` setup its zerops.yaml declares, not a build-vs-runtime
    // env mismatch.
    nodeEnv: process.env['NODE_ENV'] ?? null,
  };
});
