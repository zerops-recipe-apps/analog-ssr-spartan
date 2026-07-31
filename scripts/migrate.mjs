import { Pool } from 'pg';

// Better Auth core schema (user / session / account / verification) for the
// email+password provider — no additional plugins configured. Idempotent
// (CREATE ... IF NOT EXISTS) so re-running against an already-migrated
// database is a safe no-op; `zsc execOnce` (see zerops.yaml) still gates it
// to once per deploy so concurrent containers don't race the DDL.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP,
  "refreshTokenExpiresAt" TIMESTAMP,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);

-- Feature-pass addition: profile bio (crud "update"). Deliberately not a
-- Better Auth "additionalField" -- the profile routes read/write it via
-- plain SQL and only use Better Auth's session API for authentication,
-- so the core schema stays exactly what Better Auth itself generates.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bio" TEXT;
`;

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await pool.query(SCHEMA_SQL);
    // eslint-disable-next-line no-console
    console.log('better-auth schema migration applied');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('migration failed:', err);
  process.exit(1);
});
