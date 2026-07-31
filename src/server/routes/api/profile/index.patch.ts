import { defineEventHandler, toWebRequest, setResponseStatus } from 'h3';

import { pool } from '../../../lib/db';
import { requireSession, getOptimisticSessionToken } from '../../../lib/session';
import { invalidateCachedProfile } from '../../../lib/cache';
import { getSignedAvatarUrl } from '../../../lib/storage';
import { publishUserEvent } from '../../../lib/broker';

const MAX_NAME_LENGTH = 120;
const MAX_BIO_LENGTH = 500;

/**
 * Update display name / bio (CRUD "update", self-scoped). A raw SQL
 * `UPDATE` rather than Better Auth's `updateUser` API — `bio` is an
 * app-owned column outside Better Auth's own user schema, and
 * `getSession` above is only used to authenticate the caller, not to
 * read or write the extended profile fields.
 *
 * Body is read via `req.json()` on the SAME `Request` object used for
 * `requireSession`, not h3's `readBody(event)`. Calling `toWebRequest`
 * and then separately calling h3's own body-reader on the same event
 * hangs indefinitely (no response, no thrown error) — reading the body
 * off the already-constructed web `Request` avoids the conflict.
 */
export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);
  const session = await requireSession(req);
  if (!session) {
    setResponseStatus(event, 401);
    return { error: 'unauthenticated' };
  }

  const body = await req
    .json()
    .catch(() => ({}) as Record<string, unknown>);
  const name = typeof body?.['name'] === 'string' ? (body['name'] as string).trim() : undefined;
  const bio = typeof body?.['bio'] === 'string' ? (body['bio'] as string).trim() : undefined;

  if (name === undefined && bio === undefined) {
    setResponseStatus(event, 400);
    return { error: 'no_fields', message: 'Provide at least one of: name, bio' };
  }
  if (name !== undefined && (name.length === 0 || name.length > MAX_NAME_LENGTH)) {
    setResponseStatus(event, 400);
    return { error: 'invalid_name' };
  }
  if (bio !== undefined && bio.length > MAX_BIO_LENGTH) {
    setResponseStatus(event, 400);
    return { error: 'invalid_bio' };
  }

  const { rows } = await pool.query(
    `UPDATE "user"
     SET name = COALESCE($1, name), bio = COALESCE($2, bio), "updatedAt" = now()
     WHERE id = $3
     RETURNING id, name, email, bio, image, "createdAt"`,
    [name ?? null, bio ?? null, session.user.id],
  );
  const row = rows[0];

  const cacheToken = getOptimisticSessionToken(req);
  if (cacheToken) {
    await invalidateCachedProfile(cacheToken);
  }

  // Best-effort: a broker hiccup shouldn't fail a profile update that
  // already committed to Postgres.
  try {
    await publishUserEvent({
      type: 'profile_update',
      userId: row.id,
      name: row.name,
      bio: row.bio ?? null,
    });
  } catch (err) {
    console.error('profile update: failed to publish user event', err);
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    bio: row.bio ?? null,
    avatarUrl: row.image ? await getSignedAvatarUrl(row.image) : null,
    createdAt: row.createdAt,
  };
});
