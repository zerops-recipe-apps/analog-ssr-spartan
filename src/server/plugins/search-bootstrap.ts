import { defineNitroPlugin } from 'nitropack/runtime';

import { ensureSearchIndexSettings } from '../lib/search';

/**
 * Nitro auto-loads every file under `server/plugins/**` at server startup
 * (via `scanDirs` resolving `<srcDir>/plugins`, the same convention Nuxt
 * uses) and calls its default export once with the `nitroApp` instance.
 * The searchable-attributes call is idempotent — safe to (re)apply on
 * every process boot — and Meilisearch auto-creates the `users` index on
 * first call if it doesn't exist yet, so no separate "create index" step
 * is needed.
 */
export default defineNitroPlugin(() => {
  ensureSearchIndexSettings().catch((err) => {
    console.error('search-bootstrap: failed to configure index settings', err);
  });
});
