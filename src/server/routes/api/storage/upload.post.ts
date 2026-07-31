import { defineEventHandler, toWebRequest, setResponseStatus } from 'h3';

import { pool } from '../../../lib/db';
import { requireSession, getOptimisticSessionToken } from '../../../lib/session';
import { invalidateCachedProfile } from '../../../lib/cache';
import { uploadAvatar, getSignedAvatarUrl } from '../../../lib/storage';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Avatar upload (storage-upload). Accepts the first multipart entry that
 * is a `File` (i.e. was appended with a filename), regardless of its
 * field name — this works equally for a real `<input type="file">`
 * selection and for the browser-walk's blob-fallback button (`FormData`
 * with a small in-memory `Blob` appended under any field name), since
 * `zerops_browser` has no file-input-selector primitive and the
 * showcase spec requires both affordances to hit this same endpoint.
 *
 * Body is read via `req.formData()` on the same `Request` used for
 * `requireSession`, not h3's `readMultipartFormData(event)` — see the
 * comment in `profile/index.patch.ts` for why mixing the web-standard
 * Request with h3's own body-reader on the same event hangs. The
 * web-standard `FormData` covers the same multipart parsing need.
 */
export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);
  const session = await requireSession(req);
  if (!session) {
    setResponseStatus(event, 401);
    return { error: 'unauthenticated' };
  }

  const form = await req.formData();
  let filePart: File | undefined;
  for (const value of form.values()) {
    if (value instanceof File) {
      filePart = value;
      break;
    }
  }
  if (!filePart) {
    setResponseStatus(event, 400);
    return { error: 'no_file', message: 'Expected a multipart field carrying a file' };
  }
  if (filePart.size > MAX_UPLOAD_BYTES) {
    setResponseStatus(event, 413);
    return { error: 'file_too_large', maxBytes: MAX_UPLOAD_BYTES };
  }

  const buffer = Buffer.from(await filePart.arrayBuffer());
  const { key, size } = await uploadAvatar(
    session.user.id,
    buffer,
    filePart.type || 'application/octet-stream',
    filePart.name || 'upload.bin',
  );

  await pool.query('UPDATE "user" SET image = $1, "updatedAt" = now() WHERE id = $2', [
    key,
    session.user.id,
  ]);

  const cacheToken = getOptimisticSessionToken(req);
  if (cacheToken) {
    await invalidateCachedProfile(cacheToken);
  }

  return {
    key,
    url: await getSignedAvatarUrl(key),
    size,
    uploadedAt: new Date().toISOString(),
  };
});
