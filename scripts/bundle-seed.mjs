// Bundles scripts/seed.mjs (+ its pg / ioredis / meilisearch / aws-sdk
// dependencies) into a single self-contained seed.cjs at the repo root,
// mirroring bundle-migrate.mjs -- the prod deployFiles list ships only
// dist/analog plus these two bundled scripts, no node_modules.
import { build } from 'esbuild';

await build({
  entryPoints: ['scripts/seed.mjs'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'seed.cjs',
});
