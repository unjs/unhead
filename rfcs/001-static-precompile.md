# RFC 001: Static precompile transform (experimental)

Status: draft, targeting v3 behind `experimental: { precompile: true }`, default-on in v4.

The big v4 lever: static `useHead`/`useSeoMeta` object literals compile at build time into pre-normalized tag arrays, and the runtime skips `walkResolver`/`normalizeProps` for them entirely. This document nails the precompiled-entry contract crossing `push()` before any transform code is written. Everything here reflects the codebase state after the unified transform pipeline (#831), the per-environment targeting fix (#829), and the SSR default-init hoist (#828), which is the closest existing precedent for sharing pre-normalized tags safely.

## 1. What gets compiled

Input: the first argument of `useHead()` / `useSeoMeta()` calls proven to come from unhead (ScopeTracker provenance, identical to the pipeline's existing rules), where the argument is an object literal whose leaves are all statically decodable: string/number/boolean/null literals, safe unary numerics, expression-free template literals, arrays, and plain objects with static non-prototype keys, recursively. `useSeoMeta` is first lowered to `useHead` shape by the existing seoMeta phase, then precompiled.

Bail rules mirror the seoMeta MEDIA_KEYS handling: any dynamic value (identifier, ref, computed, getter, method, spread, computed key, call, member expression) bails that entry to runtime. Bailing is per call: sibling calls in the same module compile independently. `useHeadSafe` is out of scope for v1 (its whitelist semantics would have to be reproduced at build time; revisit after soak).

## 2. The wire format crossing `push()`

The transform replaces the object literal with a marker object:

```ts
useHead({ _c: 1, t: [/* compiled tags */] })
```

Each compiled tag is the JSON-serializable projection of what `normalizeEntryToTags` produces today (`packages/unhead/src/utils/normalize.ts`): lowercased tag/attr names, parsed keys, `_d` from `dedupeKey`, and class/style pre-split — encoded as arrays (`class: ['a', 'b']`, `style: [['color', 'red']]`) because `Set`/`Map` don't survive JSON and must not be shared across head instances anyway.

JSON-serializability is a hard requirement: streaming SSR serializes `e.input` verbatim into suspense chunks (`renderSSRHeadSuspenseChunk`), and the client stream consumer pushes it back through `push()`. A marker object flows through that path unchanged; the client runtime revives it the same way the server does.

## 3. Runtime contract: revive at resolve, not at push

`push()` stores the input untouched (no new branch there — `patch()` and `dispose()` semantics stay identical; a `patch()` with a plain object simply loses the marker and takes the normalize path).

The integration point is the existing `if (!e._tags)` branch in `resolveTags` (`packages/unhead/src/utils/resolve.ts`). For a marker input, instead of `normalizeEntryToTags`, the runtime **revives**: one fresh object per tag (spread), `Set`/`Map` construction only where class/style are present. Everything else in that branch runs unchanged:

- `entries:normalize` hooks still fire, over the revived (fresh, mutable) tags — plugins like the legacy `DeprecationsPlugin` keep working with zero guards. This deliberately avoids the guard complexity #828 needed, because revived tags are per-head copies, not a shared module-scope array.
- `_w` is assigned at resolve via `weightFn` (it is environment- and options-dependent — capo on server, default on client — so it must never be baked in at build time; this is the same lesson as #828's `tagWeight` guard).
- `_p` is assigned at resolve from `e._i` (unknowable at build time).
- `_d` ships precompiled and is kept, unless an `entries:normalize` hook is registered, in which case `_d`/`_h` are recomputed after the hook (a hook may have mutated props).

What's skipped, and where the win comes from: `walkResolver`, `normalizeProps`, key parsing, class/style splitting, `unpackMeta` — the recursive normalize machinery. Revival is a flat structural copy.

## 4. propResolvers

Revival skips propResolvers. This is safe exactly when every registered resolver is identity for plain static JSON values — the `_static` marker contract introduced in #828 (`PropResolver._static`; `VueResolver` and the built-in server `on*` resolver are marked). Compiled values are plain JSON by construction (bail rules), so `_static` resolvers are provably no-ops on them.

Runtime rule: if any registered propResolver lacks `_static`, the head cannot accept precompiled entries — resolve falls back by throwing in dev with a message naming the resolver, and in prod treating the revived tags as final (documented limitation of the experimental flag). There is no silent wrong output: the transform is opt-in, and the incompatibility is loud in dev. We do not carry the original input alongside the compiled tags — doubling the payload would erase the size story.

## 5. Pipeline phase order

Inside the unified pipeline walk: treeshake → seoMeta lowering → **precompile** → minify. Precompile subsumes minify for entries it compiles: `innerHTML`/`textContent` strings are passed through the configured minifier during serialization (async, reusing the pending-minifications pattern), so the minify phase must skip nodes inside precompiled ranges exactly like treeshake-claimed ranges today. Otherwise the whole-object replacement edit and the inner string edit would trip the overlap detector.

## 6. Output identity (the non-negotiable)

Dual paths MUST be output-identical. Verification, using the two patterns already proven in this repo:

- Differential test: every fixture input rendered via (a) untransformed runtime path and (b) precompiled path, asserting byte-identical SSR output and identical resolved-tag structures — the #831 differential harness extended with a render step.
- Property test: fuzz object literals from the supported grammar (fast-check is already a dev dependency), transform, render both paths, compare. This is what caught the real index-derivation bug in #830; treat it as required, not optional.
- Hook-interaction tests: `entries:normalize` mutation applies identically in both paths; dedupe/merge across a precompiled and a runtime entry behaves identically.

## 7. Size budget

Compiled tag arrays repeat structural keys (`"tag"`, `"props"`, `"_d"`) that the source object didn't have. Gzip largely absorbs repetition, but this must be measured, not assumed: gate on the `vue-client-seo` bundle fixtures and the self-contained fixtures from #826 — compiled output must be gzip neutral-or-better on the static SEO fixture. If it isn't, evaluate a tuple encoding (`['meta', props, d]`) before shipping; do not ship a size regression behind a perf flag.

## 8. Rollout

- v3: `experimental: { precompile: true }` plugin option, off by default. Runtime marker handling ships unconditionally (it's additive and tiny); the transform only fires behind the flag.
- v4: flip the default; the runtime normalize path stays as the fallback for dynamic entries, hooks-heavy setups, and non-static propResolvers. Only after a full deprecation cycle can normalize be demoted further.

## 9. Open questions

- Marker key choice (`_c`) needs a collision audit against user inputs; consider `Symbol.for` on the runtime side with the JSON marker only as the wire form.
- Whether `useServerHead` entries (server-only, treeshaken from client) are worth compiling at all — they never hit the client bundle, and SSR normalize cost for them is already amortized by `e._tags` caching within a request. Measure before adding.
- Interaction with the resolver-allocation work (PR in flight): if capability flags land, revival should reuse them rather than re-checking `_hooks` directly.
