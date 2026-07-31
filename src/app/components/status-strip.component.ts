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
    <section hlmCard class="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
      <div hlmCardHeader class="flex flex-row flex-wrap items-center gap-x-6 gap-y-3 pb-4">
        <div hlmCardTitle class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Platform status</div>
        @for (row of rows(); track row.key) {
          <span class="flex items-center gap-2 text-sm" [attr.data-test]="'status-' + row.key">
            <span
              class="inline-block h-2 w-2 rounded-full ring-2 ring-background"
              [class]="row.ok ? 'bg-emerald-500' : 'bg-destructive'"
            ></span>
            <span class="font-medium">{{ row.label }}</span>
            <span hlmBadge [variant]="row.ok ? 'secondary' : 'destructive'" class="font-mono text-[10px] uppercase">
              {{ row.ok ? 'ok' : 'down' }}
            </span>
          </span>
        }
        @if (!status()) {
          <span class="text-sm text-muted-foreground">Checking services…</span>
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
