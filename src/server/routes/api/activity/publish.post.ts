import { defineEventHandler, toWebRequest, setResponseStatus } from 'h3';

import { pool } from '../../../lib/db';
import { requireSession } from '../../../lib/session';
import { publishUserEvent } from '../../../lib/broker';
import { markActivityPending } from '../../../lib/activity';

const MAX_MESSAGE_LENGTH = 200;

/**
 * queue-demo's dedicated publish trigger — repeatable without editing the
 * profile form each time. Auth-gated (like signup/profile-update, the
 * event's other two publishers) so the queue demo stays part of the
 * same authenticated-user story rather than an anonymous action.
 * Publishes the user's CURRENT name/bio (read fresh from Postgres) so
 * the in-process consumer's Meilisearch upsert is always a same-or-newer
 * write, never a stale overwrite from a bio-less payload.
 *
 * Body is read via `req.json()` on the same `Request` used for
 * `requireSession` — see the comment in `profile/index.patch.ts` for why
 * mixing that with h3's `readBody(event)` on the same event hangs.
 */
export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);
  const session = await requireSession(req);
  if (!session) {
    setResponseStatus(event, 401);
    return { error: 'unauthenticated' };
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const message =
    typeof body?.['message'] === 'string'
      ? (body['message'] as string).trim().slice(0, MAX_MESSAGE_LENGTH)
      : undefined;

  const { rows } = await pool.query('SELECT bio FROM "user" WHERE id = $1', [session.user.id]);
  const bio: string | null = rows[0]?.bio ?? null;

  await publishUserEvent({
    type: 'ping',
    userId: session.user.id,
    name: session.user.name,
    bio,
    message,
  });
  // Only counted once the broker has accepted the publish — a throw above
  // returns 500 to the caller without inflating the pending gauge for a
  // message that was never actually sent.
  await markActivityPending();

  return { published: true, type: 'ping' as const };
});
