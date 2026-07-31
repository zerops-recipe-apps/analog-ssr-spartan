import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowUpRight, lucideLayers, lucideSparkles } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
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
    NgIcon,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    StatusStripComponent,
    DirectoryCardComponent,
    CacheCardComponent,
    QueueCardComponent,
    StorageCardComponent,
    SearchCardComponent,
  ],
  providers: [provideIcons({ lucideSparkles, lucideLayers, lucideArrowUpRight })],
  template: `
    <div class="relative min-h-screen">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.5_0.02_250/0.04)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0.02_250/0.04)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]"
      ></div>

      <header class="sticky top-0 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-2.5">
            <span class="icon-badge size-8 rounded-lg">
              <ng-icon name="lucideLayers" class="size-4" />
            </span>
            <span class="text-sm font-semibold tracking-tight">Analog SSR</span>
          </div>
          <nav class="flex items-center gap-2">
            <a
              href="https://analogjs.org"
              target="_blank"
              rel="noreferrer"
              class="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Analog
            </a>
            <a href="https://spartan.ng/components" target="_blank" rel="noreferrer" hlmBtn variant="outline" size="sm">
              spartan/ui
              <ng-icon name="lucideArrowUpRight" class="size-3.5" />
            </a>
          </nav>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span hlmBadge variant="secondary" class="gap-1.5">
                <ng-icon name="lucideSparkles" class="size-3" />
                Powered by spartan/ui
              </span>
              <span hlmBadge variant="outline">Zerops recipe</span>
            </div>
            <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Full-stack SSR
              <span class="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent"> showcase</span>
            </h1>
            <p class="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Better Auth on Postgres with Valkey cache, NATS activity feed, object storage avatars, and Meilisearch —
              styled with accessible
              <a href="https://spartan.ng/" class="font-medium text-primary underline-offset-4 hover:underline">spartan/ui</a>
              components.
            </p>
          </div>

          <div class="flex shrink-0 flex-wrap gap-2 lg:max-w-xs lg:justify-end">
            @for (tag of stackTags; track tag) {
              <span hlmBadge variant="outline" class="font-mono text-[11px] uppercase tracking-wide">{{ tag }}</span>
            }
          </div>
        </section>

        <app-status-strip [status]="state.status()" />

        <section class="space-y-5">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="section-label">Interactive demo</p>
              <h2 class="mt-1 text-xl font-semibold tracking-tight">Managed services dashboard</h2>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <app-directory-card />
            <app-cache-card />
            <app-queue-card />
            <app-storage-card />
            <app-search-card class="md:col-span-2 xl:col-span-1" />
          </div>
        </section>

        <footer class="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
          Built with Analog, Angular SSR, and
          <a href="https://spartan.ng/" class="text-primary underline-offset-4 hover:underline">spartan/ui</a>
          on Zerops.
        </footer>
      </main>
    </div>
  `,
})
export default class Home {
  protected readonly state = inject(DashboardStateService);

  protected readonly stackTags = ['Postgres', 'Valkey', 'NATS', 'S3', 'Meilisearch'];
}
