import { Component, computed, inject, signal } from '@angular/core';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

@Component({
  selector: 'app-storage-card',
  imports: [...HlmCardImports, ...HlmButtonImports, ...HlmAlertImports, ...HlmSeparatorImports, ...HlmSpinnerImports],
  template: `
    <section hlmCard class="flex h-full flex-col border-border/60 shadow-sm">
      <div hlmCardHeader>
        <div hlmCardTitle>Storage</div>
        <div hlmCardDescription>Object storage · avatar uploads</div>
      </div>

      <div hlmCardContent class="flex flex-col gap-4">
        <div class="flex items-baseline gap-2">
          @if (state.storageLoad() === 'loading') {
            <hlm-spinner aria-label="Loading storage" />
            <span class="text-sm text-muted-foreground">Loading…</span>
          } @else if (state.storageLoad() === 'error') {
            <div hlmAlert variant="destructive">
              <div hlmAlertDescription>Could not load storage state.</div>
            </div>
          } @else {
            <span class="text-2xl font-semibold" data-test="storage-objects">{{ state.storage()?.objectCount ?? 0 }}</span>
            <span class="text-xs text-muted-foreground">objects</span>
          }
        </div>

        @if (!auth.user()) {
          <p class="text-sm text-muted-foreground">Sign in to upload a file.</p>
        } @else {
          <div class="flex flex-col gap-3">
            <label
              class="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
            >
              <span class="truncate">{{ selectedFileName() ?? 'No file chosen' }}</span>
              <span class="ml-2 shrink-0 rounded-md bg-secondary px-3 py-1 text-xs text-secondary-foreground">Choose file</span>
              <input type="file" data-feature="upload-file" accept="*" class="sr-only" (change)="onFileSelected($event)" />
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" hlmBtn data-feature="upload-selected" (click)="uploadSelected()" [disabled]="!selectedFile() || uploadingFile()">
                @if (uploadingFile()) {
                  <hlm-spinner aria-label="Uploading" />
                }
                {{ uploadingFile() ? 'Uploading…' : 'Upload selected' }}
              </button>
              <button type="button" hlmBtn variant="outline" data-feature="upload" (click)="uploadBlob()" [disabled]="uploadingBlob()">
                @if (uploadingBlob()) {
                  <hlm-spinner aria-label="Uploading sample" />
                }
                {{ uploadingBlob() ? 'Uploading…' : 'Upload sample blob' }}
              </button>
            </div>
            @if (localError()) {
              <div hlmAlert variant="destructive">
                <div hlmAlertDescription>{{ localError() }}</div>
              </div>
            }
          </div>
        }

        <div hlmSeparator></div>

        <div class="flex-1 space-y-2">
          <p class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Recent uploads</p>
          <ul class="space-y-2" aria-label="storage-recent-uploads">
            @for (obj of recentObjects(); track obj.key) {
              <li class="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm">
                <span class="truncate">{{ obj.filename }}</span>
                <span class="shrink-0 font-mono text-xs text-muted-foreground">{{ formatSize(obj.size) }}</span>
              </li>
            } @empty {
              <li class="text-sm text-muted-foreground">No uploads yet.</li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class StorageCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected readonly recentObjects = computed(() => this.state.storage()?.recent.slice(0, 5) ?? []);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFileName = computed(() => this.selectedFile()?.name ?? null);
  protected readonly uploadingFile = signal(false);
  protected readonly uploadingBlob = signal(false);
  protected readonly localError = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  async uploadSelected(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;
    this.uploadingFile.set(true);
    this.localError.set(null);
    try {
      await this.state.uploadObject(file, file.name);
      this.selectedFile.set(null);
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      this.uploadingFile.set(false);
    }
  }

  async uploadBlob(): Promise<void> {
    this.uploadingBlob.set(true);
    this.localError.set(null);
    try {
      const text = `Uploaded from the dashboard demo at ${new Date().toISOString()}`;
      const blob = new Blob([text], { type: 'text/plain' });
      await this.state.uploadObject(blob, `dashboard-upload-${Date.now()}.txt`);
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      this.uploadingBlob.set(false);
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
