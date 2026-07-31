import { defineEventHandler, getQuery } from 'h3';

import { searchUsers } from '../../../lib/search';

/**
 * search-items — full-text search over the same `user` resource the
 * Items/DB card lists. Empty `q` returns Meilisearch's default-ranked
 * results (its documented behavior for a null/empty query), which
 * doubles as a "browse the directory" view when the search box is empty.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = typeof query['q'] === 'string' ? query['q'] : '';
  const result = await searchUsers(q);
  return {
    query: q,
    hits: result.hits.map((hit) => ({ id: hit.id, name: hit.name, bio: hit.bio })),
    estimatedTotalHits: result.estimatedTotalHits,
  };
});
