import { betterAuth } from 'better-auth';

import { pool } from '../server/lib/db';
import { publishUserEvent } from '../server/lib/broker';

/**
 * Better Auth server instance, mounted onto Analog's Nitro server via the
 * catch-all route at `src/server/routes/api/auth/[...all].ts`.
 *
 * Database: raw `pg.Pool` (shared singleton from `server/lib/db.ts`, also
 * used by the feature-pass profile/users routes) — Better Auth's built-in
 * Kysely adapter accepts a node-postgres Pool directly and introspects the
 * dialect from it.
 */
export const auth = betterAuth({
  database: pool,
  secret: process.env['BETTER_AUTH_SECRET'],
  baseURL: process.env['APP_URL'],
  trustedOrigins: [process.env['APP_URL']].filter(
    (value): value is string => Boolean(value),
  ),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for'],
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Fires after Better Auth commits the new `user` row (sign-up).
        // Publishes onto the broker rather than writing the activity feed
        // inline here — the in-process NATS consumer
        // (`server/plugins/queue-consumer.ts`) is the single code path that
        // records "recent activity" and reindexes the user into
        // Meilisearch, so signup and profile-update events converge on the
        // same demonstrated round-trip instead of two parallel write paths.
        after: async (user) => {
          await publishUserEvent({
            type: 'signup',
            userId: user.id,
            name: user.name,
            bio: null,
          });
        },
      },
    },
  },
});
