import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { DashboardStateService } from '../services/dashboard-state.service';

@Component({
  selector: 'app-search-card',
  imports: [FormsModule, ...HlmCardImports, ...HlmButtonImports, ...HlmInputImports, ...HlmAlertImports, ...HlmSpinnerImports],
  template: `
    <section hlmCard class="flex h-full flex-col border-border/60 shadow-sm">
      <div hlmCardHeader>
        <div hlmCardTitle>Search</div>
        <div hlmCardDescription>Meilisearch · full-text user search</div>
      </div>

      <div hlmCardContent class="flex flex-col gap-4">
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-semibold" data-test="search-indexed">{{ state.searchState()?.indexedCount ?? 0 }}</span>
          <span class="text-xs text-muted-foreground">indexed documents</span>
        </div>

        <form class="flex gap-2" (ngSubmit)="search()">
          <input hlmInput name="query" [(ngModel)]="query" placeholder="Search by name or bio…" class="flex-1" />
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
                <li class="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm">
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
