import { defineNitroPlugin } from 'nitropack/runtime';

import {
  getNatsConnection,
  NATS_SUBJECT_USER_SIGNUP,
  NATS_QUEUE_GROUP,
  type UserEvent,
} from '../lib/broker';
import { recordActivityProcessed } from '../lib/activity';
import { indexUser } from '../lib/search';

/**
 * In-process NATS consumer — this codebase is a monolith (shape 1), so
 * "the worker" is a queue-group subscription started at server boot
 * rather than a separate deployable codebase. `queue: NATS_QUEUE_GROUP`
 * still proves real queue-group semantics (load-balanced delivery across
 * subscribers) even with a single container subscribed today; scaling
 * `app` to N containers would fan the same subject out across N
 * queue-group members with no code change.
 *
 * The connect + subscribe loop runs unawaited from the plugin body (fire
 * and forget, with a `.catch`) so a slow or momentarily-unreachable
 * broker at boot can't stall Nitro's own startup / readiness probe.
 */
export default defineNitroPlugin(() => {
  subscribe().catch((err) => {
    console.error('queue-consumer: subscription loop crashed', err);
  });
});

async function subscribe(): Promise<void> {
  const nc = await getNatsConnection();
  const sub = nc.subscribe(NATS_SUBJECT_USER_SIGNUP, {
    queue: NATS_QUEUE_GROUP,
  });
  console.log(
    `queue-consumer: subscribed to "${NATS_SUBJECT_USER_SIGNUP}" (queue group "${NATS_QUEUE_GROUP}")`,
  );
  for await (const msg of sub) {
    try {
      const event = msg.json<UserEvent>();
      await recordActivityProcessed({
        type: event.type,
        userId: event.userId,
        name: event.name,
        message: event.message,
        timestamp: event.timestamp ?? new Date().toISOString(),
      });
      // Every publisher (signup hook, profile-update route, activity-ping
      // route) sends the user's current bio at publish time, so this is
      // always a same-or-fresher upsert, never a stale overwrite. The
      // `?? ''` only guards the type (Meilisearch's `bio` field is
      // `string`, event.bio is `string | null | undefined`).
      await indexUser({
        id: event.userId,
        name: event.name,
        bio: event.bio ?? '',
      });
    } catch (err) {
      console.error('queue-consumer: failed to process message', err);
    }
  }
}
