# analog-ssr-spartan-app

Analog SSR + Better Auth showcase styled with [spartan/ui](https://spartan.ng/) on Zerops — Postgres, Valkey, NATS, object storage, and Meilisearch wired end to end.

## Zerops service facts

- HTTP port: dev `5173` (Vite) / prod `3000` (Nitro SSR server)
- Runtime base: `nodejs@24` (dev + prod)
- Managed services: Postgres, Valkey, NATS, Meilisearch, object storage

## Zerops dev

`setup: dev` idles on `zsc noop --silent`; the agent starts the dev server.

- Dev command: `npm run dev -- --host 0.0.0.0`
- Preview prod build locally: `npm run build && npm run preview`

**All platform operations go through the Zerops development workflow via `zcp` MCP tools. Do not shell out to `zcli`.**

## Spartan UI

- Helm components live under `libs/ui/` (generated via `@spartan-ng/cli`).
- Theme tokens are in `src/styles.css` — Zerops teal primary on the spartan zinc/vega base.
- SSR requires `@spartan-ng/**` in `vite.config.ts` `ssr.noExternal` and `vite-tsconfig-paths` for `@spartan-ng/helm/*` aliases.

## Notes

- `BETTER_AUTH_SECRET` is set at recipe import (project-level env), not in `zerops.yaml`.
- Prod migrations ship as bundled `migrate.cjs` / `seed.cjs` (no `node_modules` at runtime).
