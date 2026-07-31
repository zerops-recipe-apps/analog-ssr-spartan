/**
 * Thin fetch wrappers over this app's own `/api/*` routes (relative URLs --
 * same-origin monolith, so no base-URL configuration and no CORS surface).
 * Deliberately plain `fetch`, not Angular `HttpClient`: every call here is
 * scheduled from browser-only code (see `dashboard-state.service.ts` and
 * `auth.service.ts`), so none of it needs to participate in Analog's
 * server-side render -- there's no request-context/cookie-forwarding need
 * that would justify pulling in `HttpClient` + RxJS for what's otherwise a
 * handful of typed async/await calls feeding Signals.
 */

export interface StatusState {
  api: 'ok';
  db: 'ok' | 'down';
  cache: 'ok' | 'down';
  broker: 'ok' | 'down';
  search: 'ok' | 'down';
  storage: 'ok' | 'down';
}

export interface DirectoryUser {
  id: string;
  name: string;
  bio: string | null;
  createdAt: string;
}

export interface UsersListResponse {
  total: number;
  users: DirectoryUser[];
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface CacheCounters {
  hits: number;
  misses: number;
}

export interface ActivityEntry {
  type: 'signup' | 'profile_update' | 'ping';
  userId: string;
  name: string;
  message?: string;
  timestamp: string;
  processedAt: string;
}

export interface ActivityState {
  pending: number;
  processed: number;
  recent: ActivityEntry[];
}

export interface StorageObjectSummary {
  key: string;
  filename: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface StorageState {
  objectCount: number;
  recent: StorageObjectSummary[];
}

export interface SearchHit {
  id: string;
  name: string;
  bio: string;
}

export interface SearchUsersResponse {
  query: string;
  hits: SearchHit[];
  estimatedTotalHits: number;
}

export interface SearchState {
  indexedCount: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function asJson<T>(res: Response): Promise<T> {
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export async function getStatus(): Promise<StatusState> {
  return asJson<StatusState>(await fetch('/api/status'));
}

export async function getUsers(): Promise<UsersListResponse> {
  return asJson<UsersListResponse>(await fetch('/api/users'));
}

export async function getProfile(): Promise<{
  profile: ProfileResponse;
  cacheState: 'HIT' | 'MISS' | null;
}> {
  const res = await fetch('/api/profile', { credentials: 'same-origin' });
  const cacheState = res.headers.get('X-Cache') as 'HIT' | 'MISS' | null;
  const profile = await asJson<ProfileResponse>(res);
  return { profile, cacheState };
}

export async function updateProfile(fields: { name?: string; bio?: string }): Promise<ProfileResponse> {
  return asJson<ProfileResponse>(
    await fetch('/api/profile', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }),
  );
}

export async function deleteAccount(): Promise<{ deleted: true; id: string }> {
  return asJson(await fetch('/api/profile', { method: 'DELETE', credentials: 'same-origin' }));
}

export async function getCacheState(): Promise<CacheCounters> {
  return asJson<CacheCounters>(await fetch('/api/cache/state'));
}

export async function publishActivity(message?: string): Promise<{ published: true; type: 'ping' }> {
  return asJson(
    await fetch('/api/activity/publish', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message ? { message } : {}),
    }),
  );
}

export async function getActivityState(): Promise<ActivityState> {
  return asJson<ActivityState>(await fetch('/api/activity/state'));
}

export async function uploadStorageObject(blob: Blob, filename: string): Promise<StorageObjectSummary> {
  const form = new FormData();
  form.append('file', blob, filename);
  return asJson<StorageObjectSummary>(
    await fetch('/api/storage/upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    }),
  );
}

export async function getStorageState(): Promise<StorageState> {
  return asJson<StorageState>(await fetch('/api/storage/state'));
}

export async function searchUsers(query: string): Promise<SearchUsersResponse> {
  return asJson<SearchUsersResponse>(await fetch(`/api/search/users?q=${encodeURIComponent(query)}`));
}

export async function getSearchState(): Promise<SearchState> {
  return asJson<SearchState>(await fetch('/api/search/state'));
}
