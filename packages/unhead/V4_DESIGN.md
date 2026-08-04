# Unhead v4 Core Design

Status: rev 2, post insight-review. Scope: `packages/unhead` only. Experimental rebuild, no migration or legacy support. Framework packages and bundler follow later; this doc only constrains them where a contract crosses the package boundary.

Rev 2 folds in four review streams: an adversarial design review, empirical V8 microbenchmarks (scripts in scratchpad `v8bench/`, portable to `bench/`), a prior-art survey (Next/Svelte 5/Qwik/React 19/capo/Astro), and sourcemap-level bundle forensics of the v3 core. Measured numbers below come from those; nothing in the optimization ledger is asserted without data.

## 0. Goals and measured budgets

Bundle forensics (sourcemap attribution of the real bench builds) established: v3 client = 5,493 B gz with `renderDOMHead` 1,480 (27%), `resolve` 1,386, `normalize`+`walkResolver` 1,004, `dedupe` 417, Set tables 317. Deleting the "easy list" (hookable plumbing, string hooks, sanitize pass, precompute guards) was measured at only −305 B client / −398 B server. Conclusion: **the budget requires replacing the three big modules, not trimming them**. hookable itself is external in the bench configs and costs 375 B gz real-world, not the folklore 600.

| Bundle | v3 measured | v4 target | Confidence (from forensics) |
|---|---|---|---|
| L0 strict client core | n/a | ≤ 2,100 B gz | anchored: #857 sealed csr = 1,769, eager = 2,305 |
| L0+L1 client (default `unhead` + `/client`) | 5,493 B | ≤ 3,200 B gz | tight, zero slack: sums to 2,650–2,950 |
| L0+L1 server | 5,029 B | ≤ 2,500 B gz | comfortable: sums to 2,100–2,400 |
| L0 strict server | n/a | ≤ 1,500 B gz | stringify ~500 + dedupe/sort ~450 + head ~300 |
| Sealed compiled profiles | #857: 869–2,305 B | keep | measured in #857 CI |

Perf targets, gated by `bench/perf-ci.mjs`: SSR create+resolve+render and client hydration mount measurably faster; the two benches worth new CI gates are microtask batching (measured 24x on 20-push hydration) and identity caching (measured 4.6x on dedupe).

Non-goals: v3 API compat, streaming redesign (ported as-is onto the new core), framework adapters, docs.

## 1. Layering: L0 / L1 / L2

The reframe that unlocks the strict core: **dedupe rules, capo weights, and prop normalization are all just functions that compute two fields (`d`, `w`) and clean `p`/`c`. The core never needs the rules, only the results.**

```
L0  unhead/core       strict: accepts Tag[]/plans only. Map dedupe by caller-provided d,
                      (w,o) sort, DOM diff renderer, SSR bucket concat, microtask scheduler,
                      plugin slot arrays. No normalize, no dedupe semantics, no capo table,
                      no meta knowledge, no titleTemplate.
L1  unhead            authoring: useHead + the loose-input compiler (normalizeProps, dedupeKey
                      rules, priority aliases, capo on server, titleTemplate as a built-in
                      resolve micro-plugin). Emits L0 Tags. ~1.0–1.3 kb gz.
L2  subpaths          plugins, useSeoMeta expander, useHeadSafe sanitizer, scripts, stream,
                      parser, validate.
```

- The default `unhead` entry is L0+L1 together: same loose `useHead` DX as v3 for SPA and no-bundler users.
- The bundler transform replaces statically analyzable L1 calls with plans, so compiled apps ship L0 only. This mirrors Next.js's `export const metadata` contract: static input is build-time sealed, dynamic input pays runtime.
- The loose normalizer is the single largest size lever (~700–1,000 B gz measured), which is why it lives in L1 as an import, never in L0.
- Hand-authored L0 input with wrong `d`/`w` is a footgun by contract; `unhead/validate` (dev) asserts plan invariants.

Three structural decisions carry over from rev 1:

1. **Compiler-first.** The canonical internal representation is the compiled plan (PR #857 tuple format, numeric tag ids). Runtime L1 is an adapter that must produce identical output, property-tested.
2. **Slots, not a hook bus.** Plugin = object of optional named functions in flat per-slot arrays. Capability bits replace hook-registry introspection.
3. **Cost lives at the call site.** `useSeoMeta`/`useHeadSafe` import their machinery directly; nothing global.

## 2. Data model

### 2.1 Tag ids and bitmask classes

```ts
const TAG_NAMES = ['title', 'base', 'meta', 'link', 'style', 'script', 'noscript', 'htmlAttrs', 'bodyAttrs', 'titleTemplate'] as const
const enum T { Title, Base, Meta, Link, Style, Script, Noscript, HtmlAttrs, BodyAttrs, TitleTemplate }

const ELEMENT = 1 << T.Base | 1 << T.Meta | 1 << T.Link | 1 << T.Style | 1 << T.Script | 1 << T.Noscript
const SELF_CLOSING = 1 << T.Base | 1 << T.Meta | 1 << T.Link
const INNER_CONTENT = 1 << T.Title | 1 << T.Style | 1 << T.Script | 1 << T.Noscript | 1 << T.TitleTemplate
const UNIQUE = 1 << T.Title | 1 << T.Base | 1 << T.TitleTemplate
// usage: ELEMENT >> id & 1
```

Measured: bitmask classification is 8.4x faster than the six v3 `Set.has` checks (1.8 vs 15 ns/tag) and removes ~150–180 B gz net (const.ts attributes 317 B gz, but `MetaTagsArrayable` survives in L1 for meta compilation). There is no `MERGE` mask and no `templateParams` tag type; see 2.3 and 5.4.

### 2.2 Tag shape

```ts
interface Tag {
  f: number // bits 0-3 type id | 4-5 position (0 head, 1 bodyOpen, 2 bodyClose) | 6 c-is-innerHTML | 7 arrayable | 8 unmanaged | 9-15 plugin-reserved
  w: number // weight, computed at compile time (capo on server, priority aliases on client)
  o: number // order: entrySeq * 4096 + tagIndex  — multiply, NOT <<: shift wraps at 2^31; multiply is exact to 2^53
  d: string // identity; '' = positionally unique
  p: Props | null // attrs, final render-ready values; class as Set<string>, style as Map<string, string>
  c: string | null // textContent or innerHTML per f bit 6, escaping already applied
}
```

- Created once, fully populated, single allocation site. V8 natives verification showed v3-style post-stamping only produces 2 shared hidden classes (transitions replay), so the measured access penalty is just 1.3x on nanosecond loads: the monomorphic literal is kept for IC hygiene and to prevent *conditional* shape divergence, and we do not claim a benchmark win from this row.
- Sort comparator: `(a, b) => a.w - b.w || a.o - b.o`. Measured 1.5x vs string-involved comparison. The packed single-key variant (`w * 2^24 + o`) measured identical (NOISE) and risks precision/SMI questions; **rejected**.
- `f` bit 8 `unmanaged` (stolen from React 19's prop-presence escape hatch): tag is emitted/appended but never deduped, diffed, or removed. Cheaper than plugin machinery for "just render this".
- Plugins mutate values, never shape. Provenance (devtools `_source`) lives in a `WeakMap` sidecar, not on the struct.

### 2.3 Identity, and per-prop attribute explosion

Dedupe identity keeps v3's semantic rules (they encode HTML meaning), computed at compile time, cached, never rebuilt per render (measured: cached `d` makes dedupe 4.6x faster). Identity stays a string: numeric hashing measured 2.7x *worse* (fnv at insert) and carries collision risk.

**htmlAttrs/bodyAttrs are exploded per prop at compile time, universally.** `useHead({ htmlAttrs: { lang: 'fr', class: 'a b' } })` compiles to tags with `d = 'htmlAttrs:lang'`, `'htmlAttrs:class:a'`, `'htmlAttrs:class:b'` (position bits mark attr-target). This is what #857's server plans already do; making it the only representation means:

- Merge semantics fall out of ordinary dedupe: class/style union = distinct keys, override = same key. The MERGE bitmask, the prop-merge branch in dedupe (v3's Set/Map union code), and `tagDuplicateStrategy` are all deleted.
- The plan format and the runtime format stop having mismatched identity granularity (rev 1 bug: a runtime `htmlAttrs` bag could never collide with a plan's `htmlAttrs:lang`).

Arrayable metas (`og:image` etc.) carry `f` bit 7, set at compile time from the L1 table; dedupe appends instead of replacing. The per-render regex+Set test from v3 dies. DOM element ids for N tags sharing `d`: synthesized as `d`, `d:1`, `d:2` in sorted order (stable across re-renders, so adoption survives; port of v3's dupeKeyCounter).

### 2.4 Wire format: compiled plans

PR 857's tuples, with tag name slot replaced by the numeric id:

```ts
type ServerPlanTag = [w: number, d: string, html: string, pos?: 0 | 1 | 2 | 3 | 4] // 3/4 = html/body attr
type ClientPlanTag = [w: number, d: string, t: number, props: Record<string, string | number | boolean | null>, c?: string, pos?: 1 | 2, html?: 1, adoptD?: string]
```

Plans are accepted by the default heads (`push` detects `Array.isArray`), revived into `Tag` structs by a ~15-line loop. Sealed profiles (`server-unique`, `snapshot`, `client-csr`, `client-deferred`) remain separate compile-or-error entries.

**Parameterized plans (holes).** `useHead({ title: post.title, meta: [...static] })` is the dominant real-world dynamic shape (static structure, dynamic strings); #857 bails it to runtime entirely. v4's wire format supports it natively: the html/value slot may be a segment array with implicit holes between segments, plus a packed escape-mode word (2 bits per hole: text, attr, json):

```ts
// <title>{post.title}</title> compiles to:
[w, 'title', ['<title>', '</title>'], /* modes */ 0b00]
head.push(PLAN_7, [post.title]) // fill = per-hole escape + concat, no L1
entry.patch([nextTitle]) // refill, still no L1
```

Client plans carry holes in prop values and `c`; identity holes (an `href`-keyed link `d`) use the same segment encoding. Escape mode is fixed at compile time, so filling is one switch per hole; escaping at fill time is the security-critical invariant. Holes ship in wire format v1: retrofitting would change tuple arity and break every emitted plan.

**The dual-path law**: for any static input, `revive(compile_buildtime(input))` and `compileL1(input)` produce identical `Tag[]`, property-tested over the transform fixtures, SSR output byte-identical.

### 2.5 Entries and the patch contract

```ts
interface Entry {
  i: number // monotonic sequence
  input: unknown // raw object or plan
  tags: Tag[] | null // compile cache; null = dirty
  o: EntryOptions | null
}
```

**Plan entries downgrade on patch.** `entry.patch(input)` always receives runtime objects (reactive adapters re-push plain objects), so a patched plan entry sets `tags = null` and recompiles through L1. Consequences, stated honestly:

- The default client bundle always contains the L1 adapter; plans avoid *executing* it, never *shipping* it.
- The bundler may fully seal (treeshake L1) only for entries it can prove are never patched: object literal input and the entry handle unused syntactically. Sealed profiles enforce this by contract instead.

The SSR default-init entry ships as a module-hoisted frozen plan (`DEFAULT_PLAN`), per-prop exploded, so a user `htmlAttrs.lang` override beats `htmlAttrs:lang` through plain dedupe with zero special-casing.

**Plan groups (reserved).** Entries accept an optional group id, and `head.swap(group, plan, fills?)` atomically disposes the group's entries and pushes the new plan in one flush. This is the primitive route-level head graphs need (router integrations swap the destination route's pre-merged plan on navigation); reserving it now costs ~40 B and keeps whole-route compiled plans disposable as a unit, which is what makes cross-entry build-time dedupe safe (build-time losers never need runtime resurrection because compiled route entries only die by group swap).

## 3. Pipeline

```
push(input)      plan → revive to tags; object → tags = null (lazy L1 compile)
compileEntry     L1: loose input → Tag[] (walk/unwrap, normalize, escape, d + w) + plugin `tags` slot; cached until patch
resolve()        collect → sort(w, o) → dedupe Map → titleTemplate (L1 micro-plugin) → plugin `resolve` slot
render           client: microtask-batched DOM diff | server: bucket concat
```

- Dedupe winners: first tag at lowest `w`; at equal `w` highest `o`; arrayable bit appends. Container: `Object.create(null)` measured 1.3x faster than `Map` at 60 keys; use it unless plugin ergonomics demand Map (byKey is exposed to plugins; decide in impl, both measured fine).
- Sanitization (invalid names, empty props/content, script escaping) happens at compile time per entry, cached. Render assumes clean tags.
- Resolved array: allocate `new Array(n)` from the dedupe-map size and write by index (measured 2.4x over push); fresh arrays each render (array reuse measured 1.24x *slower*, an anti-optimization).
- Compile-path prop iteration uses `for-in` (measured 1.7x over `Object.keys`, 4.6x over `Object.entries`); spread is fine for prop copies (V8 fast-paths it, 1.37x over `Object.assign`).

### 3.1 Client render scheduling

Mutations set a dirty flag and schedule one render on `queueMicrotask`. Measured on a 20-push hydration: 72.3 µs sync-per-push → 3.0 µs batched, **24x, the largest verified win in the design**. `head.render()` flushes synchronously and cancels the scheduled tick (answers the test-ergonomics question); dispose-before-flush renders once, correctly, or not at all if nothing changed. Microtasks run before paint, so no visual staleness; Vue/React schedulers compose (our flush runs after theirs).

**The scheduler is injectable** (~40 B seam): `createHead({ scheduler: flush => queueMicrotask(flush) })`. One option answers three needs: sync flushing in tests, aligning head mutations inside a View Transition's update callback (a title/theme-color change straddling snapshot capture visibly double-changes), and future Navigation-API pre-commit integration (apply the destination route's plan before the nav commits). Optional `bfcache: true` (~60 B) hooks `pageshow` + `event.persisted` to mark the head dirty on restore, reconciling state patched while frozen; no head manager handles this today.

## 4. Plugin system

### 4.1 Slots

```ts
interface HeadPlugin {
  key: string
  init?: (head: Unhead) => void // may push entries, use() other plugins
  entry?: (entry: Entry, head: Unhead) => void // raw input, pre-compile (promises, validation)
  tags?: (tags: Tag[], entry: Entry, head: Unhead) => Tag[] | void // per-entry, cached with the entry
  resolve?: (ctx: ResolveCtx) => void // full deduped list, every render
  ssr?: (ctx: { tags: Tag[], options: SSROptions }) => void
  rendered?: (ctx: { head: Unhead, html?: SSRHeadPayload }) => void
}
interface ResolveCtx {
  tags: Tag[]
  byKey: Map<string, Tag>
  shared: Record<string, unknown> // cross-plugin state (replaces head._templateParams back-channels); per-resolve lifetime
  patch: (tag: Tag, changes: Partial<Tag>) => Tag // copy-on-write, see below
  head: Unhead
}
```

All slots sync. Async work re-enters via `entry.patch`/`invalidate` (the promises pattern). Registration order; `use()` dedupes by `key`.

**Copy-on-write via `ctx.patch`** (rev 2 change): rev 1 reproduced v3's cliff where any resolve plugin forces a defensive clone of every tag every render. Instead, cached entry tags are frozen in dev; a resolve plugin mutates through `ctx.patch(tag, { c })`, which clones the tag, swaps it into `tags`/`byKey`, and returns it. The wholesale `cloneTagsInPlace` disappears; plugins pay per tag touched, not per tag resolved. Schema-org stops deleting entry caches to force renormalization: it collects via `entry`/`tags` slots into `ctx.shared` and emits its ld+json in `resolve`.

### 4.2 Capability bits

```ts
const enum Cap { Entry = 1, Tags = 2, Resolve = 4, SSR = 8, Rendered = 16 }
```

Maintained by `use()`. `Cap.Tags` registered after entries exist invalidates compile caches once, at registration (the explicit, one-time cliff). Shared frozen plans (`DEFAULT_PLAN`, `PreparedTemplate`) are handed out by reference when no `Cap.Tags | Cap.Resolve`; with `ctx.patch` in place even that clone guard mostly vanishes.

Benchmark honesty (measured): slot arrays vs a string hook bus is 16–55 ns per resolve, invisible next to a 2 µs sort. The real reasons to delete the hook bus are 375 B gz (hookable, measured tree-shaken) and killing promise plumbing (177 → 21 ns per dispatch, and a class of async-hook bugs). The ledger states this as a size win.

### 4.3 v3 consumer mapping

| Consumer | v4 home |
|---|---|
| FlatMetaPlugin, SafeInputPlugin | deleted; direct imports inside `useSeoMeta` / `useHeadSafe` |
| DeprecationsPlugin, legacy entry, AliasSortingPlugin `before:/after:` | deleted |
| TemplateParamsPlugin | `resolve` + `ctx.shared` |
| InferSeoMetaPlugin | `init` + `resolve` (byKey) |
| CanonicalPlugin | `resolve` |
| MinifyPlugin | `ssr` |
| PromisesPlugin | `entry` + re-entry via patch |
| ValidatePlugin | dev-only `createHead` wrapper subpath; static-input validation moves to bundler diagnostics (plans carry no authoring shape), runtime validate sees only dynamic entries. Gains capo's validation rules: invalid-tag-terminates-head, meta-CSP-disables-preload-scanner (Web Almanac: 22% of mobile pages have invalid head markup; no competitor warns on this) |
| schema-org | `init` + `entry`/`tags` collect + `resolve` emit |
| devtools | `tags` + `resolve` + `rendered`; provenance via WeakMap sidecar |
| streaming | no hooks; entries map remains the flush buffer. New: ship a bot-UA fallback option (`htmlLimitedBots` pattern) that forces full head in the shell for non-JS crawlers — Next 15.2 shipped streaming metadata without it and broke Slack/Twitter unfurls |
| `script:updated` | per-instance listener array on the script object |

SSR promise inputs render nothing, same as v3; documented, with sealed snapshot mode as the answer for static cases.

## 5. Renderers

### 5.1 DOM: zero work until first mutation, never reorder

Two contracts stolen from prior art, both code-deleting:

1. **Qwik-style init**: client `createHead` does no head scan, no adoption, no render. The SSR'd head is inert HTML until the first dirty flush; adoption (matching pre-rendered elements by `d`) runs lazily inside that first flush only. A page that never mutates its head pays approximately zero JS. This directly funds the mount-time target.
2. **Never reorder existing elements**: `w` is an SSR-emit concern only. Client diff appends new elements in sorted position among unhead-owned siblings but never moves adopted or foreign nodes. Evidence: moving a live `<link rel=stylesheet>` is remove+reinsert (full recalc, browser-divergent refetch); the preload scanner reads the byte stream, so post-load reordering has zero benefit. If devtools ever demands reorder, gate it behind `Element.moveBefore()` feature detection.

Adoption matching: identity `d` against server-rendered `data-hid`-style markers; for positional tags (`d === ''`), lazily hash props (v3 `hashTag` port). Optional compile-emitted plan-hash marker (Svelte 5 pattern) upgrades adoption to O(1) lookup; dev mode fails loudly when expected markers are missing (Svelte's silent-skip caused real duplicate-tag bugs, #12531).

Side-effect tracking (rev 2 correction from measurement): rev 1's `[kind, el, key]` tuple records allocate ~35% *more* than v3's closures and are speed-neutral. The winning encoding, measured 2.2x faster with near-zero per-effect allocation, is **one flat stride-3 array per render** (`fx.push(kind, elOrTarget, key)`), undone by a single switch loop walking backwards. Event listeners keep a small keyed registry (handler identity comparison + `data-*fired` replay semantics port from v3).

**Strict-CSP mode** (~120 B, opt-in): `createHead({ security: { nonce, trustedTypes: true } })`. The renderer stamps `el.nonce` on every script/style it creates, and `innerHTML` writes route through a lazily created Trusted Types policy (`trustedTypes.createPolicy('unhead', ...)`), making unhead the first head manager that works under `require-trusted-types-for 'script'`. Nonces are per-request render state, never in plans, so sealed plans stay static.

### 5.2 SSR

Single pass, 5 buckets, built with `str +=` (measured 6.5x over array-push-join; V8 rope strings make concat nearly free). Escaping contract unchanged from v3 (title escaped, innerHTML trusted with `</tag` neutered at compile, attr values escape `"` only) with one measured tweak: guard attr escaping with `.includes('"')` first, 3x on the clean-value common case. Plan tags carrying prebuilt html concat directly. The capo weight table lives in L1-server, evaluated at compile; the client never ships it. Per-prop attr tags concat into the `htmlAttrs`/`bodyAttrs` buckets. When `security.nonce` is set, script/style emission appends the attr at stringify time.

`transformHtmlTemplate` + parser port unchanged; `PreparedTemplate` becomes a plain frozen plan push.

## 6. Composables and subpaths

- `useHead(head, input, opts)`: L1 compile + push. Options: `{ position?, transform? }` where `transform: (tags: Tag[]) => Tag[]` is the per-entry extension point.
- `useSeoMeta`: imports the flat-meta expander directly, compiles to meta tags pre-push; bundler lowers it to `useHead` so the expander treeshakes out of compiled apps. No plugin.
- `useHeadSafe`: imports the sanitizer as an entry `transform`. No plugin.
- `useScript`: ports with per-instance status listeners; proxy/scope/triggers untouched.

| Subpath | Layer | Contents |
|---|---|---|
| `unhead/core` | L0 | strict head: plans/Tags in, render out |
| `unhead` | L0+L1 | `useHead`, `useSeoMeta`, `useHeadSafe`, define helpers, types |
| `unhead/client`, `unhead/server` | L0+L1 | `createHead` per target; server adds capo, stringify, `transformHtmlTemplate`, `DEFAULT_PLAN` |
| `unhead/compiled/*` | L0 | #857 sealed profiles |
| `unhead/plugins` | L2 | templateParams, inferSeoMeta, canonical, minify, promises |
| `unhead/validate` | L2 dev | createHead wrapper + capo validation rules + plan invariant asserts |
| `unhead/scripts`, `/scripts/triggers` | L2 | useScript |
| `unhead/stream/{server,client}` | L2 | streaming + bot-UA shell fallback |
| `unhead/parser` | L2 | prepared templates |
| `unhead/server/early-hints` | L2 | `toEarlyHints(headOrPlan)` / `toLinkHeader()` (see 11) |
| deleted | | `/legacy`, `/minify` (into plugins), public `/utils` grab-bag |

## 7. Optimization ledger (measured)

Verdicts from the microbenchmark suite (Node 24 / V8 13.x, realistic 60-tag heads, natives-verified where noted):

| Change | Measured | Verdict | Ships because |
|---|---|---|---|
| Microtask render batching | 72.3 → 3.0 µs per 20-push hydration (24x) | REAL | biggest win; new CI gate |
| Compile-time identity caching | dedupe 3.76 → 0.82 µs (4.6x) | REAL | new CI gate |
| Set tables → bitmasks | 15 → 1.8 ns/tag (8.4x); ~150–180 B gz | REAL | perf + size |
| Numeric (w,o) comparator | 1.5x vs string compare | REAL | perf |
| Packed single sort key | equal to two-field (±3%) | NOISE | **rejected** |
| Monomorphic Tag literal | access 1.3x; stamping converges to 2 shared maps | MARGINAL | IC hygiene + simplicity, not speed |
| Side-effect flat stride-3 array | 2.2x vs closures; tuple records were 1.07x and +35% alloc | REAL (flat only) | rev 1's tuple encoding **corrected** |
| Slot arrays replace hookable | 16–55 ns/resolve (noise); 375 B gz + async plumbing removal | SIZE | honesty: not a speed win |
| Numeric identity hashing | 2.7x worse | rejected | collision risk + slower |
| SSR `str +=` buckets | 6.5x vs array-join | REAL | new |
| Attr escape quote-guard | 3x on clean values | REAL | new |
| `for-in` prop iteration | 1.7–4.6x vs keys/entries | REAL | new |
| `new Array(n)` + indexed write | 2.4x vs push | REAL | new |
| Array reuse across renders | 1.24x slower | rejected | anti-optimization |
| `Object.create(null)` dedupe bag | 1.3x vs Map | MARGINAL | impl choice, either fine |

Rule stands: every row lands with before/after from `bench/` in the PR; the microbenchmark scripts get ported into `bench/v8/` for re-runs.

## 8. Testing and gates

- **Dual-path property test**: buildtime plan revived == L1 compiled, deep-equal; SSR output byte-identical, over all transform fixtures.
- **Behavior parity suite**: port v3's dedupe/sort/merge/dom tests as semantics spec; per-prop attr explosion must reproduce every merge test's observable output.
- **Perf gates**: microtask-batch and identity-cache benches added to `perf-ci.mjs`; existing e2e benches re-baselined only at review.
- **Size gates**: `bench/bundle` grows L0-client, L0+L1-client, L0+L1-server fixtures with the section 0 budgets enforced.
- **Adoption failure is loud in dev**: missing markers/mismatched SSR state warns instead of silently re-rendering.

## 9. Open questions

1. `byKey` container: `Object.create(null)` vs `Map` once plugin ergonomics are real (measured close).
2. Plan-hash adoption markers: emit always, or only under a bundler flag? (Byte cost in HTML vs O(1) adoption.)
3. `ctx.shared` currently per-resolve; templateParams may want a per-head cache slot. Decide when porting it.
4. Sealed profiles: keep in-package (`unhead/compiled/*`) for the dual-path law's testability. Confirm with #857 merge plan.
5. `before:/after:` priority strings are deleted; grep nuxt-modules ecosystem before final to size the blast radius.

## 10. Implementation order

1. **L0 core + server** (Tag model, plan revive incl. hole filling, dedupe/sort, SSR stringify): benchable against v3 via `ssr-*-e2e` immediately; strict server floor (~1.2–1.5 kb) validates the layering before any DOM work.
2. **L1 compiler** (loose input → Tags, dedupe rules, capo, titleTemplate micro-plugin) + dual-path property tests against #857's transform.
3. **L0 DOM renderer** (lazy adoption, append-only, flat side-effect array, injectable scheduler, strict-CSP mode), ported test-first from v3's dom suite.
4. **Slots + plugin ports** (templateParams, canonical, inferSeoMeta, minify, promises), validate wrapper with capo rules.
5. **Composables** (seoMeta expander, safe transform), scripts port, early-hints adapter.
6. **Stream port** (+ bot-UA shell fallback), then bundler alignment: numeric-id plan emit with holes, cross-entry route pre-merge, route→head manifest export, inside the single-parse pipeline.

## 11. Innovation track

Graded output of three ideation passes (platform frontier, compilation endgame, 2026 discovery landscape). Items already merged into the core sections above: holes (2.4), plan groups + swap (2.5), injectable scheduler + bfcache (3.1), strict-CSP mode (5.1/5.2), bot-UA streaming fallback (4.3), capo validation rules (4.3).

### Ship in v4 (this package)

| Idea | Why unhead, why now |
|---|---|
| **103 Early Hints from plans** (`unhead/server/early-hints`, ~300 B) | The head manager is the only component knowing the final deduped, weighted link set; static plans make the hint set knowable per route at build time with zero per-request resolve. `toEarlyHints(plan): string[]` for `writeEarlyHints`, `toLinkHeader()` for Cloudflare's automatic 103 conversion. Emit `preconnect`+`preload` only, skip nonce-bearing links, keep the tags in the head (103 is advisory). No head manager does this. |
| **Parameterized plans / holes** | Wire-format-v1 blocking (see 2.4); converts the dominant CMS shape from full-runtime to fill-and-concat. |
| **Compiled `document.title` binding pilot** (bundler flag) | When titleTemplate is static and `title`'s identity is uncontested, emit a direct `document.title` write bound to the framework's reactivity, skipping the entire pipeline. Guarded by a ~100 B identity **claims table** on the head: compiled bindings register their `d`; if a runtime tag ever claims it, L0 takes ownership and the binding demotes. Title is the highest-frequency dynamic head value; this is the beachhead for general compiled bindings. The claims table doubles as the micro-frontend head-coordination point. |
| **Cross-entry route pre-merge** (bundler) | Constant-fold a route's static entries into one plan with winner rules and static titleTemplate applied at build; SSR resolve becomes concat. No shadow state: merged tags keep true `d`/`w`, so runtime entries override via ordinary dedupe. Compiler refuses when build-config plugins register `Cap.Tags`/`Cap.Resolve`. Safe because compiled route entries dispose only via group swap. |

### Design now, ship later

- **Speculation rules as first-class** (`useSpeculation`): Chrome-shipping, WHATWG-upstreaming, Safari behind flag; it is a head JSON script whose cross-component merge is exactly our dedupe problem. Reserve the JSON-merge dedupe strategy for same-`d` script tags in the design; ship the L2 module when Safari lands.
- **General compiled bindings**: needs a closed route graph from the framework (code splitting breaks graph-wide identity proofs); the claims table shipped with the title pilot makes this a bundler-only upgrade later.
- **Route-level head graphs**: `head.swap` is reserved (2.5); plan-per-route emit and nav-time two-pointer merge live in router integrations.
- **Route→head manifest export** (bundler): the compiled plans per route, exported as a build artifact. This is the enabling primitive for the ecosystem surfaces below and costs the runtime nothing.

### Ecosystem surfaces enabled (Nuxt SEO / separate products, not this package)

- **Unfurl verification CI**: assert og:image byte size (WhatsApp ~600 KB limit), content type, dimensions, absolute URLs per platform matrix (WhatsApp/iMessage/Discord/Slack/X/Bluesky) against the route manifest without booting the app. No mainstream tool does presence + bytes in CI.
- **Rich-results schema validation at build**: required-fields-per-type rules (Google deprecated 7 types in 2025-2026; schema-dts is types-only and stale). Sold as rich-results correctness; evidence says schema does not buy AI citations (Ahrefs 1,885-page study).
- **Head consumption telemetry**: join edge logs with the manifest: which bot classes fetched which routes, stale-unfurl detection (og:image changed but no unfurler re-fetch), dead-tag reports.
- Cheap protocol coverage in L1 types/useSeoMeta: `fediverse:creator` (Mastodon 4.3, real adoption), Bluesky card-baking cache semantics documented, `fc:miniapp`.

### Rejected with evidence

llms.txt (Ahrefs: 97% of 137k files receive zero bot requests; no vendor consumes it), noai/noimageai metas (no major vendor honors), resumable head-state serialization (30–60 B/tag HTML cost vs single-digit-µs lazy scan), client-side capo reordering via `moveBefore` (zero preload-scanner benefit post-load; devtools-only), WASM L1 compiler (boundary cost + bytes on µs-scale string work), scheduler.yield in renderer (60-tag renders are µs).

## 12. Prototype findings (v4/core-experiment branch, 2026-08-04)

Working prototype at `packages/unhead/src/v4/` (core, compile, server, client, seo, plugins, early-hints), 69 tests in `bench/v4-*.test.ts`, benches in `bench/v4-*.bench.ts`.

Scorecard vs v3 (same workloads, SSR output byte-identical where testable):

| Axis | Result |
|---|---|
| SSR e2e: runtime / plans / sealed | 1.6-2.4x / 3.8-6x / 5.6-11x |
| DOM mount+dispose / patch / 50-patch flush | ~2.9x / 2.4-3.5x / 161x |
| Plugins (templateParams+inferSeo+canonical) | 2.6x vs v3 same plugins |
| Server gz: default / sealed | 3,818 (v3 4,973) / 1,851 |
| Client gz | 4,976 (v3 5,483) |

Budget status: sealed profiles beat targets; defaults remain above (server 3.8k vs 2.5k target, client 5.0k vs 3.2k). Measured verdict from the size pass: the remaining L1 bytes are irreducible v3 semantics (dedupe rules, capo, coercion) that resist table-driven compression post-gzip; hitting the default targets likely requires moving semantics to the compiler (cross-entry pre-merge default-on) rather than more code golf. Reverted-with-data: bitmask membership tables cost +13 gz vs `id===T_X` chains (gzip wins), full slots cache +97 gz.

Slot API revisions earned by the plugin ports:
1. `ctx.patch` on a `d: ''` tag is a silent no-op; add dev-mode warn.
2. Reinstate `ctx.shared` (dropped in the prototype): raw-title recovery and templateParams needed back-channels without it.
3. `ctx.tags: (Tag | Tag[])[]` makes every plugin write a flatten helper; expose flat iteration.
4. Per-entry flags (`processTemplateParams` opt-in/out) need the designed `entry`/`tags` slots; prototype only has `resolve`.
5. Lone titleTemplate converts to title but keeps `d: 'titleTemplate'`; consumers probe two keys.

Known conscious divergences vs v3 (documented in tests): capo weights for importmap/speculationrules/textContent-script edge paths; htmlAttrs per-prop explosion skips boolean coercion; `{ innerHTML: null }` JSON quirk; function/ref values must be resolved by adapters pre-push; `templateParams` input key replaced by `useTemplateParams()`. DOM adoption identity gaps: base, alternate+hreflang, keyed metas fall back to hash (re-created, not adopted); fix by exporting compile's identity().

### 12.1 Emitter + slot revision round (commits 7e7ad25d, 0e5359ce)

`emit.ts` implements the compiler contract: `emitEntryPlan` (holes as private-use-area tokens pushed through the real compile pipeline, dual-path by construction), `emitRoutePlan` (cross-entry pre-merge with true d/w), `planToCode`, `PlanEmitError` as the bundler's deterministic bail signal. 142 tests total on the branch.

Wire-format spec changes required before freezing v1 (found by the dual-path corpus):
1. RESOLVED. `PlanTag` carries the arrayable flag in the existing pos slot: `pf = pos | 8` marks arrayable, `pf & 7` is the position, so tuple arity is unchanged. `revivePlan` decodes bit 3 into `F_ARRAYABLE` (`(pf & 8) << 4`); the emitter no longer folds arrayable groups or throws on interleaved ones, it emits per-tag tuples with the flag.
2. Attr fragments need class/style folding at emit (single fragment per attr under coarse `d`); per-token tuples would emit duplicate `class` attributes. Residual: runtime class pushes alongside sealed attr fragments duplicate the attr in renderSSRHead — bucket merge needs to parse or key prebuilt fragments.
3. Hole fill escaping is now contract-exact: text mode == SSR title escaping (& < > " ' /), json mode escapes backslash/quote/`<` so fills cannot corrupt the JSON document. Both fixed in core fillHoles.
4. Weight bakes at emit; holes in weight-feeding props (async/defer/src) freeze the token-derived weight, `rel`/`type` holes throw.
5. Lone folded titleTemplate re-keys to `d: 'title'` so runtime titles can override.

Slot API state: ctx.shared/each/patch-warn/entry/tags all landed (+118B gz server, dev warn is 0B prod via NODE_ENV DCE). TitlePlugin stays a plugin (sealed profiles must not pay for it) but is an L1 contract: registered first, publishes `shared.title` and `shared.titleResolved`. Plan revival is now lazy (first resolve) so the registration cliff covers plan entries.

Current sizes (gz): server 3,966 / client 5,165 / sealed 1,982. Sealed crept +131 from slot plumbing in createCore across the round; if sealed budget tightens, split createCore into a slotless base for sealed profiles.
