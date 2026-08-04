# Nuxt consumer role-play: does v4 survive contact with the framework?

Adversarial pressure-test of `packages/unhead/src/v4/*` against Nuxt's real head lifecycle. Ground truth for "what Nuxt does" was read from `nuxt@4.5.1` dist in this repo's node_modules: `head/runtime/plugins/unhead.{server,client}.js`, `head/runtime/install-client-head.js`, `head/runtime/island-head.js`, `app/plugins/prefetch-preload-tags.server.js`, and the `nuxt:meta` module setup in `dist/index.mjs` (unhead-options template, `disableDefaults: true`, plugin list). Every WORKS verdict below that can be executed is backed by `nuxt-lifecycle.test.ts` or `suspense-overlap.test.ts` in this directory (14 tests, green).

Verdict key: WORKS (test-backed unless noted), NEEDS-ADDITION (minimal change named), BROKEN (with failing snippet).

## 1. nuxt.config head + app.config: sealed plan at build time

**Nuxt needs**: `app.head` is a static object known at build time. Today Nuxt writes it into `#build/nuxt.config.mjs` and pushes it as a runtime object on both server and client. v4 should let the module seal it.

**How v4 serves it**: the Nuxt module's build step calls `emitEntryPlan` from `unhead` (build-time only import, `packages/unhead/src/v4/emit.ts`) and writes the result via `planToCode` into a virtual module. The server plugin pushes the plan; `revivePlan` in L0 accepts it with zero L1 work.

```ts
// module build step (replaces today's appHead serialization)
import { emitEntryPlan, PlanEmitError, planToCode } from 'unhead/emit'

let planCode: string | null = null
try {
  const { titleTemplate, ...sealable } = nuxt.options.app.head
  planCode = planToCode(emitEntryPlan(sealable).plan)
  // titleTemplate stays a runtime entry, see below
}
catch (e) {
  if (!(e instanceof PlanEmitError))
    throw e // anything else is a real error; PlanEmitError = bail to runtime object
}
addTemplate({ filename: 'unhead-config-plan.mjs', getContents: () => `export default ${planCode}` })

// server plugin (unhead.server)
import CONFIG_PLAN from '#build/unhead-config-plan.mjs'
head.push(CONFIG_PLAN)
head.push({ titleTemplate })
```

**The catch, found by doing it**: real `app.head` almost always carries `titleTemplate`, and `emitEntryPlan` correctly refuses it (sealing the template would strand runtime page titles untemplated). So the module must split: seal the static remainder, push `{ titleTemplate }` as a tiny runtime entry. `PlanEmitError` is the deterministic signal for this and the test proves the split renders byte-identical to pushing the whole object through L1 (the dual-path law holding at the framework level).

Second catch: the sealed plan is server-usable only. The client plugin must keep pushing the raw `appHead` object (exactly what Nuxt does today), because server `PlanTag` tuples are broken on the client (see BROKEN item B2). Plans do not currently cross the server/client boundary.

**Verdict: WORKS** (test-backed: build step, PlanEmitError split, dual-path equality, 103 hints from the artifact). The client half of the win (shipping L0-only) is blocked on B2.

## 2. Component useHead with reactive values

**Nuxt needs**: `useHead({ title: () => t.value })` re-renders the head when `t` changes. v3 does this in `@unhead/vue` with `watchEffect` + `walkResolver` + `entry.patch` (packages/vue/src/composables.ts, `clientUseHead`). v4 compile is one-shot and L1 refuses refs/functions in tag values by contract (V4_DESIGN.md 12: "function/ref values must be resolved by adapters pre-push").

**How v4 serves it**: two granularities, chosen by the bundler.

Path A, dynamic shape (fallback, always available): identical to v3. The adapter unwraps the whole input and re-pushes it; `entry.patch` sets `tags = null` and recompiles through L1.

```ts
// @unhead/vue v4 clientUseHead: same skeleton as v3, VueResolver unwraps refs
let entry
watchEffect(() => {
  const resolved = walkResolver(input, VueResolver) // plain object, no refs left
  entry ? entry.patch(resolved) : (entry = head.push(resolved, options))
})
onBeforeUnmount(() => entry.dispose())
```

Path B, static shape with dynamic strings (the dominant case): the bundler extracts a plan with holes and the adapter only watches the fill expressions. No walkResolver, no L1, refill is per-hole escape + concat.

```vue
<script setup>
const { t } = useI18n()
useHead({ title: () => t.value })
</script>
```

compiles into:

```ts
import { _useHeadFills } from '@unhead/vue'
// module-hoisted, emitted by the bundler via planToCode(plan, { fills })
const _P = [[10, 'title', ['<title>', '</title>'], 0]]
// in setup():
_useHeadFills(_P, () => [t.value])

// adapter helper, ~10 lines:
function _useHeadFills(plan, get) {
  const head = injectHead()
  const entry = head.push(plan, { fills: get() })
  watch(get, fills => entry.patch(plan, fills)) // revivePlan refill, no compile
  onBeforeUnmount(() => entry.dispose())
  return entry
}
```

`entry.patch(plan, fills)` keeps the `Array.isArray` fast path in `createCore`, so a title keystroke costs one `fillHoles` call plus a DOM diff. Test-backed on the server head (`parameterized plans` describe block: push with fills, patch with new fills, escape modes applied at fill time).

**Verdict: WORKS on the server, NEEDS-ADDITION on the client.** Path B on the client needs the `ClientPlanTag` wire format from V4_DESIGN.md 2.4 (props as data, not prebuilt html), which the prototype has not implemented; pushing server tuples into a client head is BROKEN (B2). Until then Path B is SSR-only and the client runs Path A everywhere, which is exactly v3's cost model, no regression.

## 3. SSR render, Nitro route rules, Early Hints

**Nuxt needs**: render app, collect head, `renderSSRHead(ssrContext.head, renderSSRHeadOptions)`, splice the 5-field payload into the template. Plus: Nitro route rules that add headers, and 103 Early Hints before app render finishes.

**How v4 serves it**: `renderSSRHead(head)` in `server.ts` returns the identical `{ headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs }` shape Nuxt's renderer already splices. Drop-in.

Route rules setting plain response headers never touch unhead (orthogonal, fine). Route rules that feed head content (nuxt-seo's `robots: false` style) are just a server-side `head.push` before render, which is ordinary v4.

Early Hints are the new capability and the timing works because plans exist before the app does:

```ts
// nitro plugin: 103 before a single component has rendered
import routePlans from '#build/unhead-route-plans.mjs' // per-route emitRoutePlan output
import { toEarlyHints } from 'unhead/server/early-hints'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    const plan = routePlans[event.path]
    if (plan && event.node.res.writeEarlyHints)
      event.node.res.writeEarlyHints({ link: toEarlyHints(plan) })
  })
})
```

`toEarlyHints` accepts the raw plan (zero resolve, build artifact in, RFC 8297 values out) or a live head for the per-request dynamic fallback after entries are pushed. Both paths test-backed: the sealed config plan yields exactly the preconnect + font preload and skips the icon; the live head path picks up a dynamic `fetchpriority` preload and skips stylesheets. This also subsumes Nuxt's `prefetch-preload-tags.server.js` plugin (which today re-runs `resolveTags` post-render just to fish out preload links for the payload): the same link set falls out of the plan or one resolve.

**Verdict: WORKS** (test-backed for both hint paths and the payload shape). True pre-render 103 requires the route-plan build artifact; per-request dynamic links can only hint after push, which is inherent, not a v4 defect.

## 4. Hydration and the claims-manifest question

**Nuxt needs**: client boots on SSR HTML, every component re-runs useHead, zero duplicate elements, zero forced reflow, and crucially Nuxt PAUSES head DOM writes until `app:suspense:resolve` (`install-client-head.js`: `pauseDOMUpdates` via the v3 `dom:beforeRender` hook).

**How v4 serves it**: lazy adoption (no work at `createHead`, elements matched by identity inside the first flush) plus the injectable scheduler, which replaces the `dom:beforeRender` hook entirely:

```ts
// unhead.client plugin, v4 shape
let flush: (() => void) | null = null
let paused = true
const head = createHead({ scheduler: (f) => { flush = f } })
const syncHead = () => { paused = false; flush?.() }
nuxtApp.hooks.hook('page:start', () => { paused = true })
nuxtApp.hooks.hook('page:finish', () => { !nuxtApp.isHydrating && syncHead() })
nuxtApp.hooks.hook('app:suspense:resolve', syncHead)
nuxtApp.hooks.hook('app:error', syncHead)
```

Test-backed: the lifecycle test hydrates a JSDOM built from the SSR payload, re-pushes appHead plus both component entries, holds the flush, then releases it and asserts head child count is unchanged and the SSR `<meta name=description>` node is literally the same object through hydration, a reactive patch, and a route navigation.

**Claims manifest vs DOM parsing** (state requirements only; another agent is benching): a manifest serialized into the Nuxt payload would need, to fully replace `adopt()`:

1. Per rendered element, in DOM order per bucket (head/bodyOpen/bodyClose): the identity `d` and the dupe index (`d`, `d:1`, ...). This is the whole `els` map without attribute reads or identity recomputation.
2. The set of unhead-managed `htmlAttrs`/`bodyAttrs` props, plus managed class tokens and style keys (so the first reclaim never strips user or third-party attrs).
3. The pre-unhead `document.title` (the `FX_TITLE` undo payload).
4. Nothing else: weights are not needed (append-only renderer), props are not needed (tags re-carry them), entry boundaries are not needed.

What it buys over DOM parsing: `adopt()` recomputes identity from attributes with a deliberately partial mirror (`domIdentity`) and hash fallback; V4_DESIGN.md 12 already lists the known misses (base, alternate+hreflang, keyed metas fall back to hash and get re-created instead of adopted). A manifest is exact by construction. Cost: roughly 15 to 30 B per tag in the payload, and a hard invariant that the manifest and markup never desync (streaming appends after the shell make this non-trivial). The cheaper fix for the known misses is exporting `compile.ts identity()` to the client, also already noted in the design.

**Verdict: WORKS** today via lazy adoption (test-backed); manifest is an optimization with the state requirements above, not a correctness need, except for the hash-fallback tag classes where either the manifest or the shared `identity()` export is required to avoid re-created elements.

## 5. SPA navigation: Suspense overlap

**Nuxt needs**: with Suspense, the destination page's setup (and its `useHead`) runs before the departing page unmounts, and Nuxt additionally defers `entry.dispose()` until the page transition promise settles (`install-client-head.js` wraps `head.push` to intercept dispose). The head must get push-B-then-dispose-A right.

**How v4 serves it**: dedupe is computed from the live entries map on every resolve. While both entries are alive, sorted order is (w, o) ascending and at equal weight the later tag replaces the slot winner, so B wins every contested identity during the overlap. Disposing A afterwards only deletes A's entry; B's tags are untouched. There is no state carried between resolves that A's death could clobber.

Test-backed in `suspense-overlap.test.ts`, five tests: later-entry-wins during overlap and after dispose (title, description, cross-entry arrayable og:image replacement, per-prop htmlAttrs class union then handover); the departing page patching mid-overlap cannot steal identities back (entry seq is stable); an old entry with `tagPriority: 'critical'` correctly holds the title until dispose, then hands over; at the DOM layer the shared `<meta name=description>` element is the same node through push-B, overlap render, and dispose-A (no remove+recreate flicker) and surplus arrayable elements are reclaimed; and push-B plus dispose-A inside one tick coalesce into a single scheduled flush with the merged final state.

**Verdict: WORKS** (test-backed). `head.swap(group, plan, fills)` from V4_DESIGN.md 2.5 remains the nicer primitive for route-level plans, but plain push/dispose ordering is already correct.

## 6. Server components / islands

**Nuxt needs**: island head data crosses the network as serialized payload (`NuxtIslandResponse.head`), not function calls, and the server plugin freezes `head.push` during island rendering (`island-head.js freezeHead`).

**How v4 serves it**: sealed plans with fills ARE the serialization format. An island component's static-shape head compiles once at build to a plan; per-request values travel as the fills array; the receiving side pushes data:

```ts
// island response
{ "head": { "plan": [[100, "meta:og:image", ["<meta property=\"og:image\" content=\"", "\">"], 1]],
            "fills": ["https://cdn.example.com/og/about.png"] } }

// receiving head (server render or client island update)
head.push(payload.plan, { fills: payload.fills })
```

Test-backed: the island plan + fills survive `JSON.parse(JSON.stringify(...))` and render correctly (fill-less `planToCode` output is valid JSON by construction). `freezeHead` also still works because v4's `push` is a plain own property, wrap-and-restore is test-backed.

**Verdict: WORKS** on the server (test-backed). Client-side island head updates hit B2 like everything else plan-shaped on the client.

## 7. Plugin surface: v3 hooks used by Nuxt and Nuxt SEO, mapped

Hooks actually exercised by the ecosystem (Nuxt core: `install-client-head.js`; schema-org: `packages/schema-org/src/plugin.ts` in this repo; nuxt-seo-utils: templateParams/infer/canonical):

| v3 hook | Consumer | v4 home | Status |
|---|---|---|---|
| `dom:beforeRender` (shouldRender pause) | Nuxt core | `createHead({ scheduler })`, Nuxt holds the flush | WORKS, test-backed (section 4) |
| `entries:updated` | stream client head | client: scheduler; but no public invalidate for non-entry state | NEEDS-ADDITION, see below |
| `entries:resolve` (enumerate all entries) | schema-org | `resolve` slot + `ctx.head.entries` iteration; `resolve()` populates every `e.tags` before plugin slots run, so compiled tags are readable there | WORKS, test-backed |
| `entries:normalize` (per-entry tag collect) | schema-org | per-entry `tags` slot (cached with the entry) | WORKS (slot exists in core) |
| `tags:resolve` (mutate resolved set) | schema-org, nuxt-seo-utils | `resolve` slot + `ctx.patch` copy-on-write | WORKS, test-backed |
| `tags:afterResolve` (merge/cleanup after others) | schema-org | registration-ordered `resolve` slots; register last | WORKS with caveat: no guaranteed post-phase if user plugins register later; add a `resolvePost` slot only if a real consumer needs ordering guarantees |
| `ssr:render` / `ssr:rendered` | MinifyPlugin, devtools | NONE. Design 4.1 specifies an `ssr` slot; `core.ts` implements only init/entry/tags/resolve | NEEDS-ADDITION: `ssr` slot array invoked in `renderSSRHead` (Nuxt itself can wrap `renderSSRHead`, but plugins shipped by modules cannot) |
| `dom:rendered` | devtools, og-image dev | NONE. Design lists `rendered`; not implemented | NEEDS-ADDITION: `rendered` slot after `renderDOM`/`renderSSRHead` (~30 B) |
| `script:updated` | useScript consumers | per-instance listener arrays (design 4.3); scripts not ported yet | pending port, per plan |

The schema-org mapping is the one that could not be hand-waved, so the lifecycle test implements it: a single `resolve`-slot plugin enumerates `head.entries` for `nodes` props across all live entries (the `entries:resolve` role), then patches the one deduped `script:key:schema-org` winner with the merged `@graph` JSON (the `tags:resolve` role). Cross-entry merge, `nodes` prop stripping, and dispose semantics (a disposed entry's nodes vanish next resolve, matching v3's per-cycle graph reset) all pass.

TemplateParams, InferSeoMeta, Canonical are already ported in `plugins.ts` and test-backed here with nuxt-seo-shaped inputs. Two warts found:

- `InferSeoMetaPlugin` leaves its `data-infer=""` marker attribute in the rendered output; v3 emitted clean tags. Cosmetic, should strip on patch.
- `useTemplateParams(head, params).patch()` mutates the side store without invalidating: on the client nothing marks the head dirty, so a params-only change (Nuxt updating `%siteName` on route change) never repaints, and Nuxt's `syncHead` calling `head.render()` is a no-op because `head.dirty` is false. Needs either a public `invalidate()` on `ClientHead` (the closure exists in `createHead`, it is just not exposed) or params-as-marker-entry. This is the same missing primitive as `entries:updated` above; one exposed `invalidate()` covers both.

**Verdict: WORKS for everything Nuxt and nuxt-seo ship today** (test-backed), **NEEDS-ADDITION** for: exposed `invalidate()`, `ssr` slot, `rendered` slot. No BROKEN mappings.

## 8. useHeadSafe and XSS

**Nuxt needs**: `useHeadSafe` for user-influenced input. Question: does v4 compile need a safe-mode allowlist, or do escape modes cover it?

**Answer: escape modes are necessary but not sufficient; the allowlist is still required, and it needs no core support.** What compile-time escaping covers: title text (`escapeHtml`), attr values (quote escaping), script JSON (`<`), `</script` neutering, hole fills per fixed mode. What it cannot cover, because these are semantically valid values: `innerHTML` is trusted by contract (`F_RAW`), `href="javascript:..."` is a legal attribute value, `on*` props render as live listeners on the client and as `onload="..."` attributes on the server, `http-equiv` metas can redirect. Same story as v3, which is why v3 has `SafeInputPlugin`.

v4's shape for it (per design section 6): a pure input filter at the call site, before push, zero plugins, zero core bytes for non-users:

```ts
// @unhead/vue
export function useHeadSafe(input, options) {
  return useHead(sanitizeSafeInput(input), options) // + wrap patch the same way
}
```

Test-backed with a hostile input: `</title><script>` title (neutralized by escape mode alone), `onload` and `http-equiv` metas, `javascript:` hrefs on both allowed and disallowed rels, raw `innerHTML` script (all removed by the allowlist), while legitimate quoted content and the canonical link pass through. The v3 `safeSchema` allowlist ports as data.

**Verdict: NEEDS-ADDITION**, minimal: port the v3 `SafeInputPlugin` allowlist as a standalone `sanitizeSafeInput(input)` function in L2 (`unhead/safe` or inside the adapters). No core change; escape modes already carry the value-level half.

## Core bugs found (since FIXED; see V4_DESIGN.md section 13: B1 e6b4597b, B2 953a74eb, invalidate() 771e0cc8, identity() export 1e63531b)

### B1: TitlePlugin mangles sealed titles under a runtime titleTemplate

`TitlePlugin.resolve` reads `title.c` as raw text, but a `F_PREBUILT` title tuple's `c` is the full `<title>...</title>` html. Any sealed entry containing a `title` combined with any runtime `titleTemplate` (the single most common Nuxt configuration: bundler seals the page's static `useHead({ title })`, app.vue owns the template) produces corrupt, unescaped output:

```ts
import { emitEntryPlan } from 'unhead/src/v4/emit'
import { createHead, renderSSRHead } from 'unhead/src/v4/server'

it('sealed title + runtime titleTemplate', () => {
  const head = createHead({ disableDefaults: true })
  head.push(emitEntryPlan({ title: 'About' }).plan)
  head.push({ titleTemplate: '%s · Acme' })
  expect(renderSSRHead(head).headTags).toBe('<title>About · Acme</title>')
  // actual: '<title>About</title> · Acme'  (verified on this branch)
  // ' · Acme' leaks outside the element; with a hole-filled title the raw
  // fill also re-renders without the template
})
```

Fix directions: teach TitlePlugin to decode prebuilt titles (strip the wrapper, re-wrap on patch), or emit title tuples with the raw text in a side slot, or have `emitEntryPlan` refuse to seal bare titles the way it already refuses titleTemplate. Until fixed, a Nuxt bundler transform must treat `title` like `titleTemplate`: never seal it. `emitRoutePlan` is unaffected when the template is also static (it folds both at build).

### B2: server plans are broken on the client head (no ClientPlanTag)

`revivePlan` encodes no tag-type id for head-position tuples (`f = F_PREBUILT | pos << 4`), which the SSR renderer never needs (prebuilt html concats into buckets). The client renderer, however, reads `f & F_ID`, gets `0` (`T_TITLE`), and every head-position plan tag clobbers `document.title` with escaped html:

```ts
import { createHead } from 'unhead/src/v4/client'
import { emitEntryPlan } from 'unhead/src/v4/emit'

it('server plan on a client head', () => {
  const doc = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window.document
  const head = createHead({ document: doc })
  head.push(emitEntryPlan({ meta: [{ name: 'description', content: 'A' }] }).plan)
  head.render()
  expect(doc.head.innerHTML).toBe('<meta name="description" content="A">')
  // actual: '<title>&lt;meta name="description" content="A"&gt;</title>'
  // (verified on this branch): id bits absent -> T_TITLE -> doc.title = html
})
```

This blocks: sealed appHead on the client, client fills (section 2 Path B), and client-side island head updates. `ClientPlanTag` (design 2.4: `[w, d, t, props, c?, pos?, html?, adoptD?]`) is specified but unimplemented. Minimum viable: implement client tuple revival, and until then make `revivePlan` on a `ssr: false` core throw in dev instead of silently corrupting the title.

## Prioritized core changes before a Nuxt adapter is feasible

1. **B2: ClientPlanTag revival** (or dev-mode throw as a stopgap). Blocks the entire client half of the compiler story: sealed appHead, fills path, island updates. Everything else in this document degrades gracefully; this one corrupts pages silently.
2. **B1: prebuilt-title awareness in TitlePlugin** (or emitter refusal to seal bare titles). The failing combination is Nuxt's default configuration shape; a bundler that seals page entries will hit it on day one.
3. **Expose `invalidate()` on ClientHead.** Without it, `useTemplateParams().patch()` and any future non-entry state (stream head, script status) cannot repaint; Nuxt's `syncHead` no-ops on a clean dirty flag. It is one property assignment in `createHead`.
4. **`ssr` and `rendered` plugin slots** (design 4.1, dropped by the prototype). MinifyPlugin, devtools, and og-image dev tooling have no home without them; Nuxt can wrap `renderSSRHead` but third-party unhead plugins cannot.
5. **Export compile's `identity()` for adoption** (design 12 known divergence) or ship the claims manifest: base, `alternate+hreflang`, and keyed metas currently hash-fall-back and get re-created instead of adopted on hydration.
6. Cosmetic: strip `data-infer` markers from InferSeoMetaPlugin output; document that `emitEntryPlan` consumers must split `titleTemplate` (and, until B1, `title`) out of sealable input.

Not blocking: `head.swap` plan groups (push/dispose ordering is already correct, section 5), `resolvePost` slot (no current consumer), streaming port (explicitly sequenced later in the design).

## @unhead/vue v4 adapter sketch

File-level surface, mirroring what Nuxt imports today (`unheadVueComposablesImports`, `@unhead/vue/client`, `@unhead/vue/server`):

| File | Exports | Notes | Est. gz |
|---|---|---|---|
| `install.ts` | `createHead` (client+server wrappers), `injectHead`, `headSymbol`, `VueHeadPlugin` | wraps v4 `createHead`, adds `app.use` install, provides via `headSymbol`; server variant threads `disableDefaults` | ~250 B |
| `resolver.ts` | `VueResolver` | unchanged from v3 (unref/toValue walk) | ~150 B |
| `composables.ts` | `useHead`, `useHeadSafe`, `useSeoMeta`, `_useHeadFills` | `useHead`: ssr = direct push; client = watchEffect + walkResolver + patch, onBeforeUnmount dispose, KeepAlive via deactivated ref (v3 skeleton, unchanged semantics). `_useHeadFills`: the 10-line fills helper from section 2, target of the bundler rewrite. `useSeoMeta`: wraps v4 `unpackSeoMetaInput` at the call site (treeshakes when the bundler lowers it). `useHeadSafe`: `sanitizeSafeInput` wrapper | ~500 B |
| `safe.ts` | `sanitizeSafeInput` | v3 safeSchema as data, pure function | ~350 B, only for useHeadSafe users |
| `scripts.ts` | `useScript` | ports once v4 scripts land | deferred |
| `index.ts` | re-exports + types (`UseHeadInput` etc.) | types only | 0 B |

Total for a typical app (no safe, no scripts): roughly 0.9 to 1.0 kB gz on top of the v4 client core, versus about 1.3 kB for v3 `@unhead/vue`, and the fills path removes `walkResolver` executions from every static-shape component. The Nuxt module keeps its exact current file layout (`unhead.server` / `unhead.client` plugins, `install-client-head`, island freeze), swapping the `dom:beforeRender` pause for the scheduler seam and the appHead object push for the sealed plan on the server.
