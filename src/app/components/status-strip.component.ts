import { Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import type { StatusState } from '../services/api-client';

type ServiceKey = keyof StatusState;

const SERVICE_LABELS: Record<ServiceKey, string> = {
  api: 'App',
  db: 'Postgres',
  cache: 'Valkey',
  broker: 'NATS',
  search: 'Meilisearch',
  storage: 'Object storage',
};

const SERVICE_ORDER: ServiceKey[] = ['api', 'db', 'cache', 'broker', 'search', 'storage'];

@Component({
  selector: 'app-status-strip',
  imports: [...HlmCardImports, ...HlmBadgeImports],
  template: `
    <section hlmCard class="dashboard-card overflow-visible">
      <div hlmCardHeader class="pb-3">
        <div hlmCardTitle class="section-label">Platform status</div>
        <div hlmCardDescription class="text-sm">Live health checks across all wired services</div>
      </div>
      <div hlmCardContent>
        @if (!status()) {
          <p class="text-sm text-muted-foreground">Checking services…</p>
        } @else {
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            @for (row of rows(); track row.key) {
              <div
                class="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-3 transition-colors hover:bg-muted/35"
                [attr.data-test]="'status-' + row.key"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block size-2 shrink-0 rounded-full ring-2 ring-background"
                    [class]="row.ok ? 'bg-emerald-500 shadow-[0_0_8px_oklch(0.72_0.17_155/0.6)]' : 'bg-destructive'"
                  ></span>
                  <span class="truncate text-sm font-medium">{{ row.label }}</span>
                </div>
                <span hlmBadge [variant]="row.ok ? 'secondary' : 'destructive'" class="w-fit font-mono text-[10px] uppercase">
                  {{ row.ok ? 'operational' : 'down' }}
                </span>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class StatusStripComponent {
  readonly status = input<StatusState | null>(null);

  readonly rows = computed(() => {
    const current = this.status();
    if (!current) return [];
    return SERVICE_ORDER.map((key) => ({
      key,
      label: SERVICE_LABELS[key],
      ok: current[key] === 'ok',
    }));
  });
}
