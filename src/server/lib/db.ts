import { Pool } from 'pg';

/**
 * Single shared `pg.Pool` for every in-process Postgres consumer — Better
 * Auth's own session/user store (`src/lib/auth.ts`) and the app-level
 * profile/users routes added in the feature pass both import this instance
 * instead of opening their own pool. One pool keeps connection count
 * predictable against the managed Postgres service's connection limit
 * instead of each call site quietly growing its own default-sized pool.
 */
export const pool = new Pool({
  host: process.env['DB_HOST'],
  port: Number(process.env['DB_PORT'] ?? 5432),
  user: process.env['DB_USER'],
  password: process.env['DB_PASSWORD'],
  database: process.env['DB_NAME'],
});
