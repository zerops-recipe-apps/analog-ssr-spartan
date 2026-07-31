import { defineEventHandler } from 'h3';

import { getActivityState } from '../../../lib/activity';

/** Queue card's live-state read — pending/processed counters + recent-activity chip list, newest-first. */
export default defineEventHandler(async () => {
  return getActivityState();
});
