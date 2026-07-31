import { defineEventHandler } from 'h3';

import { pool } from '../../../lib/db';

const LIST_LIMIT = 50;

/**
 * Public directory list (CRUD "list" + the Items/DB card's row-count
 * badge). Deliberately excludes `email` — the self-scoped
 * `GET /api/profile` is the only route that returns a user's own email;
 * this route is readable by anyone (no session required), so it only
 * returns fields already meant to be public (name, bio).
 * `ORDER BY "createdAt" DESC` so the newest signup renders first, per the
 * newest-first list contract every dashboard card follows.
 */
export default defineEventHandler(async () => {
  const [listResult, countResult] = await Promise.all([
    pool.query(
      'SELECT id, name, bio, "createdAt" FROM "user" ORDER BY "createdAt" DESC LIMIT $1',
      [LIST_LIMIT],
    ),
    pool.query('SELECT COUNT(*)::int AS count FROM "user"'),
  ]);

  return {
    total: countResult.rows[0].count as number,
    users: listResult.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      bio: (row.bio as string | null) ?? null,
      createdAt: row.createdAt as string,
    })),
  };
});
