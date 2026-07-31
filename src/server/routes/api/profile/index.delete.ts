import { defineEventHandler, toWebRequest, setResponseStatus } from 'h3';

import { pool } from '../../../lib/db';
import { requireSession, getOptimisticSessionToken } from '../../../lib/session';
import { invalidateCachedProfile } from '../../../lib/cache';
import { deleteAvatar } from '../../../lib/storage';
import { removeUserFromIndex } from '../../../lib/search';

/**
 * Delete-account (CRUD "delete", self-scoped). Better Auth ships its own
 * `deleteUser` endpoint, but it's built around an email-confirmation
 * callback — this recipe provisions no mailer (out of scope for the
 * showcase service set), so account deletion is a direct row delete
 * instead. `session`/`account` rows cascade via the existing
 * `ON DELETE CASCADE` foreign keys already present on those tables; no
 * separate cleanup query needed for those two tables.
 */
export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);
  const session = await requireSession(req);
  if (!session) {
    setResponseStatus(event, 401);
    return { error: 'unauthenticated' };
  }

  const userId = session.user.id;
  const { rows } = await pool.query('SELECT image FROM "user" WHERE id = $1', [userId]);
  const avatarKey: string | null = rows[0]?.image ?? null;

  await pool.query('DELETE FROM "user" WHERE id = $1', [userId]);

  const cacheToken = getOptimisticSessionToken(req);
  if (cacheToken) {
    await invalidateCachedProfile(cacheToken);
  }

  // Best-effort cleanup — the account row is already gone; a failure here
  // leaves an orphaned avatar object or a stale search document, neither
  // of which should block the delete response the caller is waiting on.
  if (avatarKey) {
    await deleteAvatar(avatarKey);
  }
  try {
    await removeUserFromIndex(userId);
  } catch (err) {
    console.error('delete account: failed to remove search document', err);
  }

  return { deleted: true, id: userId };
});
