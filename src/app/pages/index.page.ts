import { Component, inject } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { DashboardStateService } from '../services/dashboard-state.service';
import { StatusStripComponent } from '../components/status-strip.component';
import { DirectoryCardComponent } from '../components/directory-card.component';
import { CacheCardComponent } from '../components/cache-card.component';
import { QueueCardComponent } from '../components/queue-card.component';
import { StorageCardComponent } from '../components/storage-card.component';
import { SearchCardComponent } from '../components/search-card.component';

@Component({
  selector: 'app-home',
  imports: [
    ...HlmBadgeImports,
    StatusStripComponent,
    DirectoryCardComponent,
    CacheCardComponent,
    QueueCardComponent,
    StorageCardComponent,
    SearchCardComponent,
  ],
  template: `
    <div class="relative min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.12_185/0.18),transparent_65%)]"
      ></div>

      <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-2">
            <span hlmBadge variant="secondary" class="w-fit">Powered by spartan/ui</span>
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Analog SSR + Spartan</h1>
            <p class="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Better Auth on Postgres with Valkey cache, NATS activity feed, object storage avatars, and Meilisearch —
              styled with accessible <a href="https://spartan.ng/" class="font-medium text-primary underline-offset-4 hover:underline">spartan/ui</a> components.
            </p>
          </div>
          <a
            href="https://spartan.ng/components"
            target="_blank"
            rel="noreferrer"
            class="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Browse spartan components →
          </a>
        </header>

        <app-status-strip [status]="state.status()" />

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <app-directory-card />
          <app-cache-card />
          <app-queue-card />
          <app-storage-card />
          <app-search-card class="md:col-span-2 xl:col-span-1" />
        </div>
      </main>
    </div>
  `,
})
export default class Home {
  protected readonly state = inject(DashboardStateService);
}
