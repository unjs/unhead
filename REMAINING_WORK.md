# v4 SSR perf — remaining work

Branch `v4/ssr-perf`, based on `perf/resolve-pipeline` (PR #776). Rebase onto `main` once #776 merges.

## Done (committed)

1. **Incremental dedupe** (`64e1c088`) — dedupe state (`head._dq`) maintained across renders; render diffs entries by tag-array identity and refolds only changed buckets; same-shape patches swap winners in place without resorting. SPA patch+render 63k → 81k/s (+28%).
2. **Immutable resolved tags** (`51301887`) — hooks replace array elements instead of mutating; `needsClone`/`_nonMutating` machinery deleted; tags frozen outside production. Fixed a v3 race where schema-org's async hook lost the JSON-LD graph (empty script since #629) — the e2e snapshot updated accordingly.
3. **Single sync `tags:resolve`** (`138dcb82`) — three tag phases collapsed; plugin `order` option (lower first); render-path hooks called without promise chaining. Rename map in MIGRATION.md.
4. + 5. **Static entry sharing + SSR string cache** (`e4496c82`) — caller-provided `staticCache` store (options bag, no new exported API, no module-level state, per user direction); init entries inferred via purity tracking + second-head sighting, pushed entries opt in with `{ static: true }`; pre-sanitized frozen tags carry a symbol box that lazily caches rendered HTML.

### Measured (NODE_ENV=production, vs post-#776 baseline)

| Metric | Baseline | Now |
| --- | --- | --- |
| Typical request (app+page head, with staticCache) | 9.75us | 6.2us (-36%) |
| Retained per head | 9.3 KB | 6.8 KB |
| SPA same-shape patch+render | 63k/s | 81k/s |
| schema e2e | 4.6k ops/s | ~5.0k ops/s (now renders full graph) |
| no-schema e2e / simple / useSeoMeta x50 | — | flat to +6% |

Targets not yet met: 2x core renderSSRHead, <2KB retained, <3us/request (need items below).

## In flight: item 6 bundle breaks (committed WIP, tests RED)

Done in this commit: `unhead/legacy` + `@unhead/vue/legacy` deleted; deprecated `renderSSRHead` export removed (use `head.render()`; options via `createServerRenderer(opts)(head)`); `ValidatePlugin` moved `unhead/plugins` → `unhead/validate` (bundler dev-injection updated to import from `unhead/validate`); `transformHtmlTemplate`/`transformHtmlTemplateRaw` moved to new `unhead/transform` subpath (package exports, build entry, vitest aliases updated).

**Known failures to fix (~188 tests):**
- The `renderSSRHead(head)` → `head.render()` codemod only covered `*.ts`; `*.tsx` test files (react package) still call the removed export. Rerun the same codemod with `--include=*.tsx` (codemod script pattern is in the session, trivial regex: `renderSSRHead(X)` → `X.render()` + import cleanup).
- `packages/unhead/test/unit/plugins/deprecations.test.ts` tests the deleted `unhead/legacy` DeprecationsPlugin — delete the test file (and any vue legacy tests importing `@unhead/vue/legacy`).
- `test/exports.test.ts` export-surface snapshots need `-u` (legacy/renderSSRHead/ValidatePlugin/transformHtmlTemplate moves are intentional).
- Re-run full suite + `vue-tsc` after; then MIGRATION.md needs an item-6 section (rename/move table).

## Not started

- **Bundle size regression (priority).** Items 1-5 added ~+3.5KB raw / +1.4KB gz to every measured bundle (server now 14.2KB/5.7KB vs 10.7KB/4.3KB on v3 main). Target is back UNDER v3 main. Item 6's structural moves help dist module size but not the treeshaken bundles — the new resolve/static machinery is all statically reachable. This is item 8's job.
- **Item 8: minimal-gzip re-architecture** (user-requested). Keep `use*` public API + rendered output; restructure internals for smallest gz. Ideas: collapse staticEntry/sanitize/resolve into one module with shared helpers, make static-entry support pluggable-but-default-in-server-only, golf the dedupe engine, audit what client bundle pulls (it should not pay for SSR-only code paths).
- **Item 7: AST build-time transforms.** Extend `@unhead/bundler` to detect provably-static `useHead`/`useSeoMeta`/app-head inputs, hoist them to module scope and inject `{ static: true }` (and/or emit pre-normalized tags) so per-component static heads hit the staticCache without runtime detection. The `{ static: true }` options-bag flag was designed as the transform's target.
- **useSeoMeta blessed-path break** (item 6 leftover): make the bundler transform the primary path; runtime `unpackMeta`/`FlatMetaPlugin` stays as no-build fallback but shouldn't be statically pulled by `unhead` main entry consumers who never call `useSeoMeta`.
- **Measurement debt:** CPU profile (esbuild 20k-iteration loop, self-time by function), GC-pause count over 200k simulated requests, and a final before/after table for the PR. Bench commands and the per-request harness used: `/tmp/per-request.mjs`, `/tmp/repeat-render.mjs` (recreate: app-head+page-head request loop; patch+render loop).

## Notes / decisions made with the user

- No new exported APIs for static entries; options bag only (`staticCache` create-option + `static` entry option). State must hang off explicit objects, not module scope; user inputs must never be mutated/frozen.
- Inference is gated to init entries + explicit `static` pushes so regular per-page entries pay zero overhead (a global-inference version regressed useSeoMeta x50 by ~18%).
- `entries:normalize` hooks (schema-org) disable sharing for that head — those hooks rely on per-render side effects.
- Same-identity patch permanently disqualifies an input from sharing (mutation evidence).
- Existing fixtures stayed byte-identical except the schema-org e2e snapshot (deliberate bug fix) and hook-contract tests.
