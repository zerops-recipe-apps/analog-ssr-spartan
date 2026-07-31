import { defineEventHandler, toWebRequest, setHeader, setResponseStatus } from 'h3';

import { pool } from '../../../lib/db';
import { requireSession, getOptimisticSessionToken } from '../../../lib/session';
import {
  getCachedProfile,
  setCachedProfile,
  recordCacheHit,
  recordCacheMiss,
} from '../../../lib/cache';
import { getSignedAvatarUrl } from '../../../lib/storage';

interface ProfilePayload {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

async function loadProfile(userId: string): Promise<ProfilePayload | null> {
  const { rows } = await pool.query(
    'SELECT id, name, email, bio, image, "createdAt" FROM "user" WHERE id = $1',
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    bio: row.bio ?? null,
    avatarUrl: row.image ? await getSignedAvatarUrl(row.image) : null,
    createdAt: row.createdAt,
  };
}

/**
 * Doubles as the profile "show" route (CRUD) and the cache-demo trigger:
 * reading your own profile is the read-through demonstration the Cache
 * card exercises. Keyed by the raw signed session-cookie value (via
 * `getOptimisticSessionToken`, no DB round-trip) rather than the
 * DB-column `session.token` — see `server/lib/session.ts` for why that's
 * the correct trade-off here.
 */
export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);
  const cacheToken = getOptimisticSessionToken(req);
  if (!cacheToken) {
    setResponseStatus(event, 401);
    return { error: 'unauthenticated' };
  }

  const cached = await getCachedProfile(cacheToken);
  if (cached) {
    setHeader(event, 'X-Cache', 'HIT');
    await recordCacheHit();
    return JSON.parse(cached) as ProfilePayload;
  }

  const session = await requireSession(req);
  if (!session) {
    setResponseStatus(event, 401);
    return { error: 'unauthenticated' };
  }

  const profile = await loadProfile(session.user.id);
  if (!profile) {
    setResponseStatus(event, 404);
    return { error: 'not_found' };
  }

  await setCachedProfile(cacheToken, JSON.stringify(profile));
  setHeader(event, 'X-Cache', 'MISS');
  await recordCacheMiss();
  return profile;
});
