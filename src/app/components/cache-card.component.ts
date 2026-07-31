import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDatabase } from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

@Component({
  selector: 'app-cache-card',
  imports: [
    NgIcon,
    FormsModule,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmTextareaImports,
    ...HlmLabelImports,
    ...HlmBadgeImports,
    ...HlmAvatarImports,
    ...HlmAlertImports,
    ...HlmSpinnerImports,
  ],
  providers: [provideIcons({ lucideDatabase })],
  template: `
    <section hlmCard class="dashboard-card">
      <div hlmCardHeader class="flex-row items-start gap-3 space-y-0">
        <span class="icon-badge">
          <ng-icon name="lucideDatabase" class="size-5" />
        </span>
        <div class="space-y-1">
          <div hlmCardTitle>Cache</div>
          <div hlmCardDescription>Valkey · read-through session cache</div>
        </div>
      </div>

      <div hlmCardContent class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-4 rounded-xl border border-border/40 bg-muted/15 p-4">
          <div class="flex flex-col gap-0.5">
            <span class="metric-value text-2xl" data-test="cache-hits">{{ state.cacheCounters()?.hits ?? 0 }}</span>
            <span class="metric-label">hits</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="metric-value text-2xl" data-test="cache-misses">{{ state.cacheCounters()?.misses ?? 0 }}</span>
            <span class="metric-label">misses</span>
          </div>
          @if (state.cacheBadge(); as badge) {
            <span
              hlmBadge
              class="ml-auto font-mono uppercase"
              [variant]="badge === 'HIT' ? 'default' : 'secondary'"
              data-test="cache-state-badge"
            >
              {{ badge }}
            </span>
          } @else {
            <span hlmBadge variant="outline" class="ml-auto font-mono" data-test="cache-state-badge">—</span>
          }
        </div>

        @if (!auth.user()) {
          <p class="text-sm text-muted-foreground">Sign in from the Directory card to view and edit your profile.</p>
        } @else {
          <div class="flex items-center gap-3">
            <hlm-avatar class="h-12 w-12">
              @if (!avatarBroken() && state.profile()?.avatarUrl; as avatarUrl) {
                <img hlmAvatarImage [src]="avatarUrl" alt="Avatar" (error)="onAvatarError()" />
              }
              <span hlmAvatarFallback class="bg-muted text-sm font-semibold">{{ initial() }}</span>
            </hlm-avatar>
            <button type="button" hlmBtn data-feature="cache-fetch" (click)="viewProfile()" [disabled]="fetching()">
              @if (fetching()) {
                <hlm-spinner aria-label="Loading profile" />
              }
              {{ fetching() ? 'Loading…' : 'View profile' }}
            </button>
          </div>

          @if (state.profile(); as profile) {
            <form class="flex flex-col gap-3" (ngSubmit)="save()">
              <div class="space-y-2">
                <label hlmLabel for="edit-name">Name</label>
                <input hlmInput id="edit-name" name="editName" [(ngModel)]="editName" />
              </div>
              <div class="space-y-2">
                <label hlmLabel for="edit-bio">Bio</label>
                <textarea hlmTextarea id="edit-bio" name="editBio" [(ngModel)]="editBio" rows="2"></textarea>
              </div>
              <p class="text-xs text-muted-foreground">{{ profile.email }}</p>
              @if (localError()) {
                <div hlmAlert variant="destructive">
                  <div hlmAlertDescription>{{ localError() }}</div>
                </div>
              }
              <div class="flex items-center justify-between gap-2">
                <button type="submit" hlmBtn [disabled]="saving()">
                  @if (saving()) {
                    <hlm-spinner aria-label="Loading profile" />
                  }
                  {{ saving() ? 'Saving…' : 'Save changes' }}
                </button>
                <button type="button" hlmBtn variant="ghost" class="text-destructive" data-feature="delete-account" (click)="deleteAccount()">
                  Delete account
                </button>
              </div>
            </form>
          }
        }
      </div>
    </section>
  `,
})
export class CacheCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected editName = '';
  protected editBio = '';
  protected readonly saving = signal(false);
  protected readonly fetching = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected readonly initial = computed(() => {
    const source = this.state.profile()?.name ?? this.auth.user()?.name ?? '?';
    return source.charAt(0).toUpperCase();
  });

  protected readonly avatarBroken = signal(false);

  constructor() {
    effect(() => {
      const profile = this.state.profile();
      if (profile) {
        this.editName = profile.name;
        this.editBio = profile.bio ?? '';
      }
      this.avatarBroken.set(false);
    });
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }

  async viewProfile(): Promise<void> {
    this.fetching.set(true);
    this.localError.set(null);
    try {
      await this.state.fetchProfile();
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not load profile');
    } finally {
      this.fetching.set(false);
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.localError.set(null);
    try {
      await this.state.saveProfile({ name: this.editName.trim(), bio: this.editBio.trim() });
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteAccount(): Promise<void> {
    if (!confirm('Delete your account? This cannot be undone.')) return;
    try {
      await this.state.removeAccount();
      this.auth.clearLocalSession();
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not delete account');
    }
  }
}
