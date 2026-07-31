import { Meilisearch } from 'meilisearch';

/**
 * The npm package's exported client class is `Meilisearch` (lowercase
 * "s") as of v0.57 — earlier versions exported `MeiliSearch`. Getting the
 * casing wrong fails at import time with a named-export error, not a
 * runtime API error, so it's easy to misdiagnose as a connectivity issue.
 *
 * Constructed lazily (first real use), not at module top level — see the
 * comment in `cache.ts` for why: Analog's production build prerenders
 * `/` (booting an in-process Nitro server, including this module) before
 * Zerops has injected any runtime env, and Meilisearch's constructor
 * validates `host` synchronously, throwing immediately if it's undefined.
 */
let client: Meilisearch | null = null;

function getClient(): Meilisearch {
  if (!client) {
    client = new Meilisearch({
      host: process.env['SEARCH_URL'] as string,
      apiKey: process.env['SEARCH_MASTER_KEY'],
    });
  }
  return client;
}

const USERS_INDEX = 'users';

export interface SearchableUser {
  id: string;
  name: string;
  bio: string;
}

/**
 * The admin `masterKey` is used here rather than `defaultSearchKey`
 * because indexing AND querying both happen server-side — the browser
 * never talks to Meilisearch directly, it talks to this app's own
 * `/api/search/*` routes. `defaultSearchKey` exists specifically for
 * clients that call Meilisearch directly from the browser, which this
 * recipe does not do, so the "never expose masterKey to the frontend"
 * platform rule is satisfied by construction (masterKey never leaves the
 * server process).
 */
export function getSearchIndex() {
  return getClient().index<SearchableUser>(USERS_INDEX);
}

/** Called once at boot (see `server/plugins/search-bootstrap.ts`). */
export async function ensureSearchIndexSettings(): Promise<void> {
  await getSearchIndex().updateSearchableAttributes(['name', 'bio']);
}

/** Upserts (or updates) one user document — id is the primary key. */
export async function indexUser(user: SearchableUser): Promise<void> {
  await getSearchIndex().addDocuments([user], { primaryKey: 'id' });
}

export async function removeUserFromIndex(userId: string): Promise<void> {
  await getSearchIndex().deleteDocument(userId);
}

export async function searchUsers(query: string) {
  return getSearchIndex().search(query || null, { limit: 20 });
}

export async function getIndexedCount(): Promise<number> {
  const stats = await getSearchIndex().getStats();
  return stats.numberOfDocuments;
}

export async function isSearchHealthy(): Promise<boolean> {
  try {
    const health = await getClient().health();
    return health.status === 'available';
  } catch {
    return false;
  }
}
