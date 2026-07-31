import { defineEventHandler } from 'h3';

import { getIndexedCount } from '../../../lib/search';

/** Search card's live-state read — indexed-document count badge. */
export default defineEventHandler(async () => {
  return { indexedCount: await getIndexedCount() };
});
