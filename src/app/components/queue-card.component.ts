import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRadio } from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

@Component({
  selector: 'app-queue-card',
  imports: [
    NgIcon,
    FormsModule,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmAlertImports,
    ...HlmSeparatorImports,
    ...HlmSpinnerImports,
  ],
  providers: [provideIcons({ lucideRadio })],
  template: `
    <section hlmCard class="dashboard-card">
      <div hlmCardHeader class="flex-row items-start gap-3 space-y-0">
        <span class="icon-badge">
          <ng-icon name="lucideRadio" class="size-5" />
        </span>
        <div class="space-y-1">
          <div hlmCardTitle>Queue</div>
          <div hlmCardDescription>NATS · queue-group activity feed</div>
        </div>
      </div>

      <div hlmCardContent class="flex flex-col gap-4">
        <div class="flex gap-6 rounded-xl border border-border/40 bg-muted/15 p-4">
          <div class="flex flex-col gap-0.5">
            <span class="metric-value text-2xl" data-test="queue-pending">{{ state.activity()?.pending ?? 0 }}</span>
            <span class="metric-label">pending</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="metric-value text-2xl" data-test="queue-processed">{{ state.activity()?.processed ?? 0 }}</span>
            <span class="metric-label">processed</span>
          </div>
        </div>

        @if (!auth.user()) {
          <p class="text-sm text-muted-foreground">Sign in to publish an activity event.</p>
        } @else {
          <form class="flex flex-col gap-3" (ngSubmit)="publish()">
            <div class="space-y-2">
              <label hlmLabel for="activity-message">Message</label>
              <input hlmInput id="activity-message" name="message" [(ngModel)]="message" placeholder="Optional message" maxlength="200" />
            </div>
            <button type="submit" hlmBtn data-feature="publish" [disabled]="publishing()" class="self-start">
              @if (publishing()) {
                <hlm-spinner aria-label="Publishing" />
              }
              {{ publishing() ? 'Publishing…' : 'Publish activity' }}
            </button>
            @if (localError()) {
              <div hlmAlert variant="destructive">
                <div hlmAlertDescription>{{ localError() }}</div>
              </div>
            }
          </form>
        }

        <div hlmSeparator></div>

        <div class="flex-1 space-y-2">
          <p class="section-label">Recent events</p>
          <ul class="space-y-2" aria-label="queue-recent-events">
            @for (entry of recentEvents(); track entry.timestamp + entry.userId) {
              <li class="list-item">
                <span class="font-mono text-xs text-muted-foreground">{{ entry.type }}</span>
                <span class="font-medium">{{ entry.name }}</span>
                @if (entry.message) {
                  <span class="text-muted-foreground"> "{{ entry.message }}"</span>
                }
              </li>
            } @empty {
              <li class="text-sm text-muted-foreground">No activity yet.</li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class QueueCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected message = '';
  protected readonly publishing = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected readonly recentEvents = computed(() => this.state.activity()?.recent.slice(0, 5) ?? []);

  async publish(): Promise<void> {
    this.publishing.set(true);
    this.localError.set(null);
    try {
      await this.state.publishActivity(this.message.trim() || undefined);
      this.message = '';
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      this.publishing.set(false);
    }
  }
}
