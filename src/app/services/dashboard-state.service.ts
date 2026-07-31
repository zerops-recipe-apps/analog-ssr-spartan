import { Injectable, afterNextRender, signal } from '@angular/core';
import * as api from './api-client';

export type LoadState = 'loading' | 'ready' | 'error';

const POLL_INTERVAL_MS = 500;
const POLL_CEILING_MS = 5000;

/**
 * Single shared source of live-state for every dashboard card. Each card
 * component reads its slice of these signals and calls the matching
 * refresh/mutate method -- this keeps "re-fetch the live-state value
 * immediately on trigger success" (the showcase spec's live-state rule)
 * in one place instead of duplicated per card.
 *
 * All network calls are scheduled from `afterNextRender` (browser-only).
 * Analog's production build prerenders `/` at build time, with no live
 * HTTP listener answering `/api/*` yet -- fetching eagerly from a field
 * initializer or constructor body would fail every time, the same class of
 * problem the backend pass solved by constructing its service clients
 * lazily instead of at module scope.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  readonly status = signal<api.StatusState | null>(null);
  readonly statusLoad = signal<LoadState>('loading');

  readonly directory = signal<api.UsersListResponse | null>(null);
  readonly directoryLoad = signal<LoadState>('loading');

  readonly profile = signal<api.ProfileResponse | null>(null);
  readonly cacheCounters = signal<api.CacheCounters | null>(null);
  readonly cacheBadge = signal<'HIT' | 'MISS' | null>(null);

  readonly activity = signal<api.ActivityState | null>(null);
  readonly activityLoad = signal<LoadState>('loading');

  readonly storage = signal<api.StorageState | null>(null);
  readonly storageLoad = signal<LoadState>('loading');

  readonly searchState = signal<api.SearchState | null>(null);
  readonly searchResults = signal<api.SearchUsersResponse | null>(null);
  readonly searchLoad = signal<LoadState>('loading');

  constructor() {
    afterNextRender(() => {
      void this.refreshAll();
    });
  }

  async refreshAll(): Promise<void> {
    await Promise.all([
      this.refreshStatus(),
      this.refreshDirectory(),
      this.refreshCacheCounters(),
      this.refreshActivity(),
      this.refreshStorage(),
      this.refreshSearchState(),
    ]);
  }

  async refreshStatus(): Promise<void> {
    this.statusLoad.set('loading');
    try {
      this.status.set(await api.getStatus());
      this.statusLoad.set('ready');
    } catch {
      this.statusLoad.set('error');
    }
  }

  async refreshDirectory(): Promise<void> {
    this.directoryLoad.set('loading');
    try {
      this.directory.set(await api.getUsers());
      this.directoryLoad.set('ready');
    } catch {
      this.directoryLoad.set('error');
    }
  }

  async refreshCacheCounters(): Promise<void> {
    try {
      this.cacheCounters.set(await api.getCacheState());
    } catch {
      // Supplementary metric -- the HIT/MISS badge is the load-bearing
      // proof; a failed counter refresh shouldn't surface as a card error.
    }
  }

  /** The Cache card's demo trigger -- GET /api/profile, badge from X-Cache. */
  async fetchProfile(): Promise<void> {
    try {
      const { profile, cacheState } = await api.getProfile();
      this.profile.set(profile);
      this.cacheBadge.set(cacheState);
    } finally {
      await this.refreshCacheCounters();
    }
  }

  async saveProfile(fields: { name?: string; bio?: string }): Promise<void> {
    const updated = await api.updateProfile(fields);
    this.profile.set(updated);
  }

  async removeAccount(): Promise<void> {
    await api.deleteAccount();
    this.profile.set(null);
    this.cacheBadge.set(null);
  }

  applyUploadedAvatar(avatarUrl: string): void {
    const current = this.profile();
    if (current) {
      this.profile.set({ ...current, avatarUrl });
    }
  }

  async refreshActivity(): Promise<void> {
    this.activityLoad.set('loading');
    try {
      this.activity.set(await api.getActivityState());
      this.activityLoad.set('ready');
    } catch {
      this.activityLoad.set('error');
    }
  }

  /**
   * Publish, then bounded-poll (500ms ticks, 5s ceiling) until the
   * `processed` counter advances past its pre-publish baseline. Every tick
   * also refreshes the Search card's indexed-doc count, so the queue ->
   * search convergence (the same broker event both records activity AND
   * reindexes the user) is visible on both cards within one bounded
   * window, per the showcase spec's "two-card integration is required"
   * rule -- no polling outside this window.
   */
  async publishActivity(message?: string): Promise<void> {
    const before = this.activity()?.processed ?? 0;
    await api.publishActivity(message);

    const deadline = Date.now() + POLL_CEILING_MS;
    for (;;) {
      await Promise.all([this.refreshActivity(), this.refreshSearchState()]);
      const processed = this.activity()?.processed ?? 0;
      if (processed > before || Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  async refreshStorage(): Promise<void> {
    this.storageLoad.set('loading');
    try {
      this.storage.set(await api.getStorageState());
      this.storageLoad.set('ready');
    } catch {
      this.storageLoad.set('error');
    }
  }

  async uploadObject(blob: Blob, filename: string): Promise<api.StorageObjectSummary> {
    const result = await api.uploadStorageObject(blob, filename);
    await this.refreshStorage();
    this.applyUploadedAvatar(result.url);
    return result;
  }

  async refreshSearchState(): Promise<void> {
    try {
      this.searchState.set(await api.getSearchState());
    } catch {
      // Supplementary badge -- swallow, same rationale as cache counters.
    }
  }

  async runSearch(query: string): Promise<void> {
    this.searchLoad.set('loading');
    try {
      this.searchResults.set(await api.searchUsers(query));
      this.searchLoad.set('ready');
    } catch {
      this.searchLoad.set('error');
    }
  }
}
