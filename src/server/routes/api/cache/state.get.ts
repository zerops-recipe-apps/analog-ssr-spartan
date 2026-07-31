import { defineEventHandler } from 'h3';

import { getCacheCounters } from '../../../lib/cache';

/** Cache card's live-state read — hit/miss counters, no auth (dashboard metric, not user data). */
export default defineEventHandler(async () => {
  return getCacheCounters();
});
