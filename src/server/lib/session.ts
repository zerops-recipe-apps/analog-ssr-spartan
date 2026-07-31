import { getSessionCookie } from 'better-auth/cookies';

import { auth } from '../../lib/auth';

/**
 * Full, authoritative session check — verifies the signed session cookie
 * against the `session` table (a DB round-trip). Use for anything that
 * reads or mutates data on a cache MISS, or for writes, where trusting a
 * possibly-stale cache would be wrong.
 */
export function requireSession(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}

/**
 * Cheap, unverified session-cookie read (`better-auth/cookies`'
 * documented helper for "is a session cookie present" middleware checks).
 * It does NOT hit the database and does NOT verify the cookie's HMAC
 * signature — it only strips the `__Secure-` prefix and tries both the
 * `.`/`-` cookie-prefix separators Better Auth supports. Used solely to
 * derive a stable per-session key for the Valkey read-through cache;
 * never treated as an auth decision by itself — the cache-MISS path still
 * calls `requireSession` for the authoritative check.
 */
export function getOptimisticSessionToken(req: Request): string | null {
  return getSessionCookie(req);
}
