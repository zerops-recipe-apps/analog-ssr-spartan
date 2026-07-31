import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { DashboardStateService } from '../services/dashboard-state.service';

@Component({
  selector: 'app-search-card',
  imports: [NgIcon, FormsModule, ...HlmCardImports, ...HlmButtonImports, ...HlmInputImports, ...HlmAlertImports, ...HlmSpinnerImports],
  providers: [provideIcons({ lucideSearch })],
  template: `
    <section hlmCard class="dashboard-card">
      <div hlmCardHeader class="flex-row items-start gap-3 space-y-0">
        <span class="icon-badge">
          <ng-icon name="lucideSearch" class="size-5" />
        </span>
        <div class="space-y-1">
          <div hlmCardTitle>Search</div>
          <div hlmCardDescription>Meilisearch · full-text user search</div>
        </div>
      </div>

      <div hlmCardContent class="flex flex-col gap-4">
        <div class="flex items-baseline gap-2">
          <span class="metric-value text-2xl" data-test="search-indexed">{{ state.searchState()?.indexedCount ?? 0 }}</span>
          <span class="metric-label">indexed documents</span>
        </div>

        <form class="flex gap-2 rounded-xl border border-border/40 bg-muted/15 p-2" (ngSubmit)="search()">
          <input hlmInput name="query" [(ngModel)]="query" placeholder="Search by name or bio…" class="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <button type="submit" hlmBtn data-feature="search" [disabled]="searching()">
            @if (searching()) {
              <hlm-spinner aria-label="Searching" />
            } @else {
              Search
            }
          </button>
        </form>

        <div class="flex-1 space-y-2">
          @if (state.searchLoad() === 'error') {
            <div hlmAlert variant="destructive">
              <div hlmAlertDescription>Search failed. Try again.</div>
            </div>
          } @else {
            @if (state.searchResults()) {
              <p class="text-xs text-muted-foreground">{{ hits().length }} match{{ hits().length === 1 ? '' : 'es' }}</p>
            }
            <ul class="space-y-2" aria-label="search-results">
              @for (hit of hits(); track hit.id) {
                <li class="list-item">
                  <span class="font-medium">{{ hit.name }}</span>
                  @if (hit.bio) {
                    <span class="text-muted-foreground"> — {{ hit.bio }}</span>
                  }
                </li>
              } @empty {
                <li class="text-sm text-muted-foreground">No matches yet — try a search above.</li>
              }
            </ul>
          }
        </div>
      </div>
    </section>
  `,
})
export class SearchCardComponent {
  protected readonly state = inject(DashboardStateService);

  protected query = '';
  protected readonly searching = signal(false);
  protected readonly hits = computed(() => this.state.searchResults()?.hits ?? []);

  async search(): Promise<void> {
    this.searching.set(true);
    try {
      await this.state.runSearch(this.query.trim());
    } finally {
      this.searching.set(false);
    }
  }
}
