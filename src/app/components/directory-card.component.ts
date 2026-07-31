import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

@Component({
  selector: 'app-directory-card',
  imports: [
    FormsModule,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmSeparatorImports,
    ...HlmSpinnerImports,
  ],
  template: `
    <section hlmCard class="flex h-full flex-col border-border/60 shadow-sm">
      <div hlmCardHeader>
        <div hlmCardTitle>Directory</div>
        <div hlmCardDescription>Postgres · public user list</div>
      </div>

      <div hlmCardContent class="flex flex-col gap-4">
        <div class="flex items-end gap-3">
          @if (state.directoryLoad() === 'loading') {
            <hlm-spinner aria-label="Loading directory" />
            <span class="text-sm text-muted-foreground">Loading directory…</span>
          } @else if (state.directoryLoad() === 'error') {
            <div hlmAlert variant="destructive">
              <div hlmAlertTitle>Could not load directory</div>
              <div hlmAlertDescription>Check Postgres connectivity and try again.</div>
            </div>
          } @else {
            <span class="text-4xl font-semibold tracking-tight" data-test="items-count">{{ state.directory()?.total ?? 0 }}</span>
            <span class="pb-1 text-sm text-muted-foreground">registered users</span>
          }
        </div>

        @if (auth.user(); as user) {
          <div class="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
            <span class="text-sm">
              Signed in as <strong class="text-foreground">{{ user.name }}</strong>
            </span>
            <button type="button" hlmBtn variant="outline" size="sm" data-feature="sign-out" (click)="signOut()">Sign out</button>
          </div>
        } @else {
          <div class="flex flex-col gap-4">
            <div class="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1">
              <button
                type="button"
                hlmBtn
                [variant]="mode() === 'sign-up' ? 'default' : 'ghost'"
                size="sm"
                class="flex-1"
                (click)="toggleMode('sign-up')"
              >
                Create account
              </button>
              <button
                type="button"
                hlmBtn
                [variant]="mode() === 'sign-in' ? 'default' : 'ghost'"
                size="sm"
                class="flex-1"
                (click)="toggleMode('sign-in')"
              >
                Sign in
              </button>
            </div>

            <form class="flex flex-col gap-3" (ngSubmit)="submit()">
              @if (mode() === 'sign-up') {
                <div class="space-y-2">
                  <label hlmLabel for="auth-name">Name</label>
                  <input hlmInput id="auth-name" name="name" [(ngModel)]="name" required placeholder="Ada Lovelace" />
                </div>
              }
              <div class="space-y-2">
                <label hlmLabel for="auth-email">Email</label>
                <input hlmInput id="auth-email" name="email" type="email" [(ngModel)]="email" required placeholder="you@example.com" />
              </div>
              <div class="space-y-2">
                <label hlmLabel for="auth-password">Password</label>
                <input hlmInput id="auth-password" name="password" type="password" [(ngModel)]="password" required placeholder="••••••••" />
              </div>
              @if (localError()) {
                <div hlmAlert variant="destructive">
                  <div hlmAlertDescription>{{ localError() }}</div>
                </div>
              }
              <button
                type="submit"
                hlmBtn
                class="w-full"
                [attr.data-feature]="mode() === 'sign-up' ? 'create-item' : 'sign-in'"
                [disabled]="submitting()"
              >
                @if (submitting()) {
                  <hlm-spinner aria-label="Loading directory" />
                }
                {{ submitting() ? 'Working…' : mode() === 'sign-up' ? 'Create account' : 'Sign in' }}
              </button>
            </form>
          </div>
        }

        <div hlmSeparator></div>

        <div class="flex-1 space-y-2">
          <p class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Newest members</p>
          <ul class="space-y-2" aria-label="directory-users">
            @for (u of recentUsers(); track u.id) {
              <li class="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm">
                <span class="font-medium">{{ u.name }}</span>
                @if (u.bio) {
                  <span class="text-muted-foreground"> — {{ u.bio }}</span>
                }
              </li>
            } @empty {
              <li class="text-sm text-muted-foreground">No users yet — create the first account above.</li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class DirectoryCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected readonly mode = signal<'sign-up' | 'sign-in'>('sign-up');
  protected readonly submitting = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected name = '';
  protected email = '';
  protected password = '';

  protected readonly recentUsers = computed(() => this.state.directory()?.users.slice(0, 5) ?? []);

  toggleMode(next: 'sign-up' | 'sign-in'): void {
    this.mode.set(next);
    this.localError.set(null);
  }

  async submit(): Promise<void> {
    this.localError.set(null);
    this.submitting.set(true);
    try {
      if (this.mode() === 'sign-up') {
        await this.auth.signUp(this.name.trim(), this.email.trim(), this.password);
      } else {
        await this.auth.signIn(this.email.trim(), this.password);
      }
      this.password = '';
      await this.state.refreshDirectory();
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      this.submitting.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
