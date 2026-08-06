# vue-native renderer reuse research

Question: in a Vue/Nuxt app the Vue renderer is in the bundle for free. Which parts of unhead v4's bundled code can the vue adapter replace with framework code, at what byte saving, and at what parity/perf cost?

Ground rule respected throughout: v4 core stays framework-free; every candidate is evaluated as an injection seam the vue adapter would fill.

All numbers from this machine, vue 3.5.40, esbuild minify + gzip -9, vitest bench with `NODE_ENV=production` (prod vue build). Reproduce:

```sh
pnpm vitest run bench/v4-explore/vue-native/
NODE_ENV=production pnpm vitest bench --run bench/v4-explore/vue-native/
node bench/v4-explore/vue-native/measure-bytes.mjs
```

## Verdict table

| Candidate | Parity | Bytes saved (vue consumer) | Bytes cost (core seam) | Perf | Grade |
| --- | --- | --- | --- | --- | --- |
| 1a. `@vue/shared` escapeHtml | Divergent: `&#39;` vs `&#x27;`, `/` unescaped; breaks core `unescapeHtml` round trip | ~50 min | n/a | n/a | REJECT |
| 1b. `normalizeClass`/`normalizeStyle` + `parseStringStyle` via compile seam | Divergent: no class dedupe, string vs Set/Map shapes; vue is MORE correct on data-URI semicolons and CSS comments | 77 min / 26 gz | ~80 min (seam plumbing, est. from candidate 2's measured seam) | unmeasured (cold path) | REJECT |
| 2. `ssrRenderAttrs` behind a serializer seam | Divergent: `crossorigin="true"`, `&amp;` in attr values, `&#39;` titles, unsafe-name drops, double-escapes sealed attr fragments | 43 min, **-30 gz (gzip gets BIGGER)** | 80 min / 23 gz | 1.50x slower | REJECT |
| 3. `@vue/runtime-dom` vnode client | Broken: no SSR adoption (hydration mismatch corrupts head, duplicate `<title>` proven), reorders live nodes, script src patch never re-executes, htmlAttrs/bodyAttrs still hand-rolled | up to 2389 min / 1044 gz (upper bound, non-shippable) | n/a | 1.54x slower per nav | REJECT |
| 4a. Scheduler seam filled with vue `nextTick` | Identical output; flush aligns with vue's own microtask queue | 0 | 0 (seam already exists) | neutral | SHIP |
| 4b. `effect()`/ref replacing dirty plumbing | Works (batching proven) but only replaces ~5 lines; push/patch/dispose wrapping remains | ~60 min at best | glue exceeds saving | neutral | REJECT |
| 5. Other `@vue/shared` steals (hyphenate, stringifyStyle, isArray, ...) | n/a | nothing above noise | n/a | n/a | REJECT |

**Single highest-value SHIP: candidate 4a.** The vue adapter passes `scheduler: flush => nextTick(flush)` into the existing `CreateClientHeadOptions.scheduler` seam. Zero bytes, zero new API, and head flushes ride vue's own job queue instead of a parallel microtask. Everything else loses on parity, gzip, or perf.

## Evidence

### 1a. escapeHtml (`shared-fns.test.ts`)

Vue's escape set is `["'&<>]` with `'` -> `&#39;`. Ours is `[&<>"'/]` with `'` -> `&#x27;` and `/` -> `&#x2F;`.

- `escapeHtml("a'b/c")`: vue `a&#39;b/c`, v4 `a&#x27;b&#x2F;c`.
- Dual-path law: sealed plans bake OUR escaping at build time. A prebuilt `<title>` decodes through core `unescapeHtml` (TitlePlugin template contract), which only knows our entity table: `unescapeHtml(vueEscape("Tom's page"))` returns `Tom&#39;s page`, not `Tom's page`. Adopting vue's escaper means changing the build-time emitter, the core decode table, and every existing sealed plan simultaneously. Not an injection seam, a fork of the wire format.

### 1b. normalizeClass / normalizeStyle (`shared-fns.test.ts`, `measure-bytes.mjs`)

Semantics:

- Agree on flat string/array/object class forms.
- Diverge on duplicates: v4's Set dedupes (`['a','a']` -> `a`), vue keeps both (`a a`).
- Vue accepts nested arrays/objects (`['a', {b: true}]`); v4's walker throws on them. Vue is a superset here.
- Style: vue's `parseStringStyle` handles `;` inside `url(data:...;base64,...)` and strips CSS comments; v4's naive `split(';')` corrupts both (proven: `background:url(data:image/png;base64,AAA);color:red` -> `background:url(data:image/png;color:red`). Vue is more correct.
- Shape mismatch is the killer: v4 renderers and `propsToString` consume `Set`/`Map` (client tracks per-class/per-style-prop effects). Vue returns string/object, so the seam needs conversion glue both ways.

Bytes (standalone, vue external): v4 walker 387 min / 266 gz; vue-backed wrapper 310 min / 240 gz. Saving 77 min / 26 gz, before paying the compile-seam plumbing (~80 min measured for the analogous serializer seam). Net approximately zero, plus a compile-vs-sealed-plan divergence risk for exotic inputs. REJECT. The genuinely interesting takeaway is inverse: port `parseStringStyle`'s paren-aware regex INTO compile.ts as a correctness fix, independent of Vue.

### 2. ssrRenderAttrs serializer seam (`proto/server-seam.ts`, `proto/vue-attrs.ts`, `ssr-attrs.test.ts`, `ssr.bench.ts`)

Prototype: `renderSSRHeadWith(head, serializer)` as a separate export so the default serializer treeshakes out of vue-consumer bundles; `renderSSRHead` is the one-line default wrapper. Seam neutrality proven: default serializer output is byte-identical to `v4/server` on the typical page and the sealed plan path.

Vue serializer parity failures (each pinned in `ssr-attrs.test.ts`):

- Boolean coercion: v4 compile turns `crossorigin: ''` into `true`; `propsToString` emits bare ` crossorigin`. Vue only bare-renders attrs on its `isBooleanAttr` allowlist, so it emits ` crossorigin="true"`. Wrong output, not just different bytes.
- Attr escaping: vue escapes `&` in values (`href="...?a=1&amp;b=2"`); v3/v4 contract escapes quotes only.
- Sealed-plan attr fragments arrive pre-escaped; the bag re-parse sends them through vue's escaper again: ` data-x="say &quot;hi&quot;"` becomes ` data-x="say &amp;quot;hi&amp;quot;"`. Dual-path law broken in the worst way (silent double-escape).
- Titles: `&#39;` vs `&#x27;` (candidate 1a).
- Vue silently drops attr names failing `isSSRSafeAttrName` and warns; v4 renders what it was given.

Bytes: seam costs the core consumer 80 min / 23 gz. The vue consumer saves 43 min but the bundle is 30 bytes BIGGER gzipped (the removed serializer compresses better than the import glue that replaces it). Perf: 1.50x slower on the typical page (49.0k -> 32.8k renders/s; the Set/Map conversion glue plus vue's per-attr allowlist checks). Nothing to ship.

### 3. @vue/runtime-dom as the client renderer (`proto/vnode-client.ts`, `vnode-renderer.test.ts`, `nav-ops.test.ts`, `nav-loop.bench.ts`)

Prototype renders resolved tags as a keyed Fragment via `render(vnode, document.head)`, with body buckets in anchor hosts and htmlAttrs/bodyAttrs hand-rolled (they are not elements; no vnode can target `<html>`/`<body>` attrs on elements vue did not create).

Findings, each with a passing test:

- **SSR adoption: does not exist.** `render()` into a head with SSR markup appends duplicates; it has no adoption concept.
- **Hydration: corrupts the head.** `createSSRApp().mount(document.head)` mismatches immediately because the root fragment expects vue-SSR anchor comments (`<!--[-->`/`<!--]-->`) that unhead markup does not have. Dev warns `Hydration node mismatch`, recovery re-mounts alongside the SSR nodes, and the document ends with a duplicate `<title>`. Proven in-test.
- **The anchored escape hatch exists but is fragile.** If unhead SSR emitted `<!--[-->` anchors around its head block, exact-order hydration adopts cleanly (zero warnings, nodes reused; proven). But one foreign tag inside the anchor range (vite dev css, analytics snippet, browser extension) mismatches again, and head-end is exactly where third parties inject. Also requires vnode order to equal emit order forever, which collides with the next point.
- **Never-reorder violation.** Keyed diff physically moves live nodes (`insertBefore` observed, stylesheet links swapped). v4's contract says existing elements never move.
- **Script semantics.** Stable key + changed `src` patches the attribute on the same element; browsers execute a script only on first insertion, so the new src silently never runs. v4 hashes src into the tag identity and creates a fresh element.
- **Teleport path.** CSR works; hydration needs `<!--teleport start-->` anchors in the app container plus `__teleportBuffers` entries, neither of which unhead SSR output can provide. Dead end for hydration.
- **DOM efficiency: parity, not a win.** Per-nav op counts are equivalent (5 value writes + 1 title write); vue writes mostly through DOM property setters (`el.content = x` via `shouldSetAsProp`) where v4 uses `setAttribute`. Neither creates, removes, or moves nodes on stable-key navs.

Perf (jsdom, one nav per iteration, prod vue): v4 fx renderer 83.2k navs/s, vue vnode renderer 53.9k navs/s, **1.54x slower** (dev vue build: 1.14x slower). The vnode path pays vnode allocation + diff on top of the same DOM writes.

Bytes: the non-shippable vnode client bundles at 8821 min / 4171 gz vs 11210 min / 5215 gz for the real client, an upper-bound saving of 2389 min / 1044 gz. That bound is unreachable: closing the adoption, reorder, and script gaps means reimplementing precisely the code that was deleted.

### 4. Vue reactivity as invalidation (`reactivity.test.ts`)

- `scheduler: flush => nextTick(flush)` through the existing seam: works, batches, zero glue. SHIP in the vue adapter.
- Replacing the dirty flag + microtask dedupe with `shallowRef` + `effect(scheduler)`: works (one render for two pushes proven), but push/patch/dispose still need wrapping to bump the ref, which is the same shape as the existing `invalidate()` wrapping. The replaced core is ~5 lines (~60 bytes); the vue-side glue is larger than that. REJECT.

### 5. Other @vue/shared candidates

`isArray`/`hasOwn`/`isString` are single-expression aliases (0 saving). `hyphenate`/`camelize` are unused by v4 (compile lowercases, does not hyphenate). `stringifyStyle` consumes vue's object shape, not our Map (same glue problem as 1b). `escapeHtmlComment`, `getEscapedCssVarName` have no v4 counterpart. Nothing clears noise level.

## Prior art

- **@vueuse/head** (pre-unhead) rendered head tags with hand-rolled DOM writes and tracked its elements with a `<meta name="head:count">` marker; it never used the vue renderer despite living inside a vue app.
- **vue-meta 2** likewise: batched direct DOM updates, SSR tags marked with `data-vue-meta` attributes for client-side identification. Its vue-3 rewrite (vue-meta next) experimented with a teleport-style component tree and was abandoned before stabilizing.
- **Nuxt today** ships unhead's own client renderer. No mainstream vue head manager has ever shipped on the framework renderer; the adoption and reorder problems in candidate 3 are presumably why.

## File map

- `proto/server-seam.ts` serializer-injectable `renderSSRHeadWith` (the one seam worth keeping if a future serializer ever earns it)
- `proto/vue-attrs.ts` vue-backed serializer (shape conversion glue included)
- `proto/vnode-client.ts` runtime-dom head renderer prototype
- `shared-fns.test.ts` candidate 1/5 parity evidence
- `ssr-attrs.test.ts` candidate 2 parity evidence (seam neutrality + divergences)
- `vnode-renderer.test.ts` candidate 3 contract evidence
- `nav-ops.test.ts` candidate 3 DOM op counts
- `reactivity.test.ts` candidate 4 evidence
- `ssr.bench.ts`, `nav-loop.bench.ts` perf evidence
- `sizes/` + `measure-bytes.mjs` byte evidence
