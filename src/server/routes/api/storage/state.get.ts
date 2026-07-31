import { defineEventHandler } from 'h3';

import { listRecentObjects } from '../../../lib/storage';

const RECENT_LIMIT = 5;

/** Storage card's live-state read — object count + recent uploads, newest-first by LastModified. */
export default defineEventHandler(async () => {
  return listRecentObjects(RECENT_LIMIT);
});
