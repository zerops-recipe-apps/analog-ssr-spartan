// Bundles scripts/migrate.mjs (+ its `pg` dependency) into a single
// self-contained migrate.cjs at the repo root. The prod deployFiles list
// ships only `dist/analog` (Nitro's self-contained server output) and this
// file — no node_modules — so the migration script must carry its own
// dependency (pg) inline. CJS output avoids relying on the deploy
// container having "type": "module" resolution set up outside package.json.
import { build } from 'esbuild';

await build({
  entryPoints: ['scripts/migrate.mjs'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'migrate.cjs',
});
