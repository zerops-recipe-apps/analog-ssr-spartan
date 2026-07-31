import { connect, type NatsConnection } from '@nats-io/transport-node';

/**
 * `@nats-io/transport-node` (nats.js v3), not the `nats` package. The
 * classic `nats` package (v2 API: `connect`/`StringCodec`/`JSONCodec` all
 * from one module) is upstream-deprecated in favor of this modular
 * successor — `npm install nats` prints "Package moved. Use
 * @nats-io/transport-node" at install time. The v3 API drops the Codec
 * abstraction: `publish()` accepts a plain `string | Uint8Array` directly,
 * and `Msg` gained `.json<T>()` / `.string()` convenience methods, so
 * publishing/consuming JSON payloads needs no codec import at all.
 *
 * Connects via separate NATS_HOST/NATS_PORT/NATS_USER/NATS_PASS vars
 * (each aliasing ${broker_hostname}/${broker_port}/${broker_user}/
 * ${broker_password}) rather than the single opaque
 * ${broker_connectionString}. The connectionString value observed at
 * runtime here is bracket-wrapped (`http://[user:pass@host:port]`), which
 * nats.js's own URL parser rejects with `TypeError: Invalid URL` — the
 * host/port/user/pass form sidesteps that shape entirely and is the
 * option Zerops' own NATS wiring guidance calls "recommended; works with
 * every NATS client library".
 */

const NATS_SUBJECT_USER_SIGNUP = 'user.signup';
const NATS_QUEUE_GROUP = 'activity-workers';

export interface UserEvent {
  type: 'signup' | 'profile_update' | 'ping';
  userId: string;
  name: string;
  bio?: string | null;
  message?: string;
  timestamp?: string;
}

let connectionPromise: Promise<NatsConnection> | null = null;

/**
 * Lazy singleton connection. A failed connect attempt clears the cached
 * promise so the next caller retries instead of being pinned to a
 * permanently-rejected promise for the life of the process.
 */
export function getNatsConnection(): Promise<NatsConnection> {
  if (!connectionPromise) {
    connectionPromise = connect({
      servers: `${process.env['NATS_HOST']}:${process.env['NATS_PORT']}`,
      user: process.env['NATS_USER'],
      pass: process.env['NATS_PASS'],
    }).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
}

/**
 * Publishes a user-lifecycle event onto the `user.signup` subject. Signup
 * and profile-update both publish here so the in-process consumer
 * (`server/plugins/queue-consumer.ts`) has one code path that records
 * "recent activity" and reindexes the user into Meilisearch, rather than
 * two parallel write paths that could drift out of sync.
 */
export async function publishUserEvent(
  event: Omit<UserEvent, 'timestamp'>,
): Promise<void> {
  const nc = await getNatsConnection();
  const payload: UserEvent = { ...event, timestamp: new Date().toISOString() };
  nc.publish(NATS_SUBJECT_USER_SIGNUP, JSON.stringify(payload));
}

export { NATS_SUBJECT_USER_SIGNUP, NATS_QUEUE_GROUP };

/**
 * Status-strip liveness check. `rtt()` forces an actual PING/PONG
 * round-trip to the server rather than trusting a possibly-stale local
 * `isClosed()` flag, bounded by an outer timeout so a wedged broker
 * doesn't hang the whole `/api/status` response.
 */
export async function isBrokerHealthy(): Promise<boolean> {
  try {
    const nc = await getNatsConnection();
    await nc.rtt();
    return true;
  } catch {
    return false;
  }
}
