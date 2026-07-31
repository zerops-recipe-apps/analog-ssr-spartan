import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Zerops object storage runs on a MinIO backend reachable only through
 * path-style bucket addressing (`https://endpoint/bucket/key`, never
 * `https://bucket.endpoint/key`) — `forcePathStyle: true` is required, not
 * optional, or every SDK call 404s against a virtual-hosted-style URL the
 * gateway doesn't answer to. Region is required by the S3 SDK's request
 * signer but MinIO itself ignores its value, so `us-east-1` is a literal,
 * not a cross-service reference — there's no `${storage_region}` token to
 * wire.
 *
 * Constructed lazily (first real use), not at module top level — see the
 * comment in `cache.ts` for why (Analog's production build prerenders `/`,
 * booting an in-process Nitro server, including this module, before
 * Zerops has injected any runtime env).
 */
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env['S3_ENDPOINT'],
      region: process.env['S3_REGION'] || 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env['S3_ACCESS_KEY_ID'] as string,
        secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] as string,
      },
    });
  }
  return s3Client;
}

function bucket(): string {
  return process.env['S3_BUCKET'] as string;
}

const SIGNED_URL_TTL_SECONDS = 300;

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export async function uploadAvatar(
  userId: string,
  body: Buffer,
  contentType: string,
  originalFilename: string,
): Promise<{ key: string; size: number }> {
  const key = `avatars/${userId}-${Date.now()}-${safeFilename(originalFilename)}`;
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    }),
  );
  return { key, size: body.byteLength };
}

/**
 * The bucket is not assumed to be `public-read` — every retrieval goes
 * through a signed GET URL instead of a bare `${apiUrl}/bucket/key` link,
 * so avatars are readable under a `private` bucket policy too.
 */
export async function getSignedAvatarUrl(key: string): Promise<string> {
  return getSignedUrl(getS3Client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}

export async function deleteAvatar(key: string): Promise<void> {
  try {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    // Best-effort cleanup on account delete — an orphaned object is a
    // minor storage-quota cost, not worth failing the delete-account
    // request over.
    console.error('storage: failed to delete avatar object', key, err);
  }
}

export interface StorageObjectSummary {
  key: string;
  filename: string;
  size: number;
  uploadedAt: string;
  url: string;
}

/**
 * `ListObjectsV2Command` returns entries alphabetical-by-key. Upload keys
 * are timestamp-suffixed so alphabetical happens to be monotonic, but the
 * natural order is oldest-first — sort DESC by `LastModified` here so the
 * API contract is newest-first by construction and the frontend can
 * `slice(0, N)` without re-sorting.
 */
export async function listRecentObjects(limit = 5): Promise<{
  objectCount: number;
  recent: StorageObjectSummary[];
}> {
  const result = await getS3Client().send(
    new ListObjectsV2Command({ Bucket: bucket(), MaxKeys: 1000 }),
  );
  const contents = result.Contents ?? [];
  const sorted = [...contents].sort((a, b) => {
    const aTime = a.LastModified?.getTime() ?? 0;
    const bTime = b.LastModified?.getTime() ?? 0;
    return bTime - aTime;
  });
  const recentSlice = sorted.slice(0, limit);
  const recent = await Promise.all(
    recentSlice.map(async (obj) => ({
      key: obj.Key as string,
      filename: (obj.Key as string).split('/').pop() as string,
      size: obj.Size ?? 0,
      uploadedAt: obj.LastModified?.toISOString() ?? new Date(0).toISOString(),
      url: await getSignedAvatarUrl(obj.Key as string),
    })),
  );
  return { objectCount: contents.length, recent };
}

export async function isStorageHealthy(): Promise<boolean> {
  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: bucket() }));
    return true;
  } catch {
    return false;
  }
}
