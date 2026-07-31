import { Injectable, afterNextRender, signal } from '@angular/core';
import { createAuthClient } from 'better-auth/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Bridges Better Auth's client onto Angular. Better Auth ships no Angular
 * adapter (only React/Vue/Svelte/Solid client entrypoints) -- `better-auth/
 * client`'s `createAuthClient` is the framework-agnostic base every one of
 * those adapters wraps: a `path-to-object` proxy that turns the server's
 * route tree into callable methods (`signUp.email`, `signIn.email`,
 * `signOut`, `getSession`) plus a nanostores `useSession` atom for reactive
 * frameworks. This service uses the plain promise-based methods only (not
 * the nanostores atom) and republishes the result through an Angular
 * `signal`, so the rest of the app reads session state the same way it
 * reads every other piece of server state -- one reactive primitive, not
 * two bridged together.
 *
 * The client is constructed lazily, inside `afterNextRender` (browser-only
 * by construction -- these callbacks never run during SSR or Analog's
 * build-time prerender of `/`). Better Auth's client sets up focus/online/
 * broadcast-channel listeners as soon as it's created, all of which assume
 * `window`; the same class of bug the backend pass hit constructing its
 * Valkey/S3/Meilisearch clients at module scope before runtime env existed.
 *
 * `baseURL` is built from `window.location.origin` at construction time,
 * NOT a bare relative path. Better Auth's client validates `baseURL` as a
 * parseable absolute URL up front (it needs an origin to resolve every
 * route against) -- passing `'/api/auth'` fails immediately with "Invalid
 * base URL: /api/auth. Please provide a valid base URL.", surfaced as the
 * client's own `error.message` on the very first call, not a network
 * failure. `window.location.origin` is exactly the right absolute origin
 * here since this is a monolith (SPA + API on one Nitro server) -- no
 * cross-origin cookie or CORS concern the way a split frontend/backend
 * recipe would have.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private client: ReturnType<typeof createAuthClient> | undefined;

  readonly user = signal<AuthUser | null>(null);
  readonly initializing = signal(true);

  constructor() {
    afterNextRender(() => {
      void this.refresh();
    });
  }

  private getClient(): ReturnType<typeof createAuthClient> {
    this.client ??= createAuthClient({ baseURL: `${window.location.origin}/api/auth` });
    return this.client;
  }

  async refresh(): Promise<void> {
    try {
      const { data } = await this.getClient().getSession();
      this.user.set(data?.user ? { id: data.user.id, name: data.user.name, email: data.user.email } : null);
    } catch {
      this.user.set(null);
    } finally {
      this.initializing.set(false);
    }
  }

  async signUp(name: string, email: string, password: string): Promise<void> {
    const { error } = await this.getClient().signUp.email({ name, email, password });
    if (error) {
      throw new Error(error.message ?? 'Sign-up failed');
    }
    await this.refresh();
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.getClient().signIn.email({ email, password });
    if (error) {
      throw new Error(error.message ?? 'Sign-in failed');
    }
    await this.refresh();
  }

  async signOut(): Promise<void> {
    await this.getClient().signOut();
    this.user.set(null);
  }

  /**
   * Clears local session state without calling the server sign-out route.
   * Used after DELETE /api/profile, which already invalidates the session
   * server-side (cascaded FK delete on the `session` table) -- a follow-up
   * sign-out call would just be authenticating a session that's already
   * gone.
   */
  clearLocalSession(): void {
    this.user.set(null);
  }
}
