# Real-browser demo: v3 vs v4 hydration and page-switch performance

Three static pages, one shared workload (the `bench/v4/fixtures.ts` page: ~45 tags across 7 entries), measured in a real headless Chromium via `dev-browser`. No JSDOM anywhere.

- `index-v3.html`: head SSR-rendered by the v3 server renderer, hydrated by the v3 client (`packages/unhead/src/client`). v3 renders synchronously on every push/patch; that is its shipped behavior.
- `index-v4.html`: head SSR-rendered by the v4 server renderer, hydrated by the v4 client (`packages/unhead/src/v4/client`) with a no-op injected scheduler and explicit `head.render()` flushes, so hydration is 7 pushes + one flush and each navigation is one flush.
- `index-v4-sealed.html`: the compiled-app story on shipped code. The whole route head is pre-merged at build time by `emit.ts` `emitRoutePlan` into one sealed plan whose only dynamic values are 6 fill holes (title, description, canonical, og:title, og:description, og:url). SSR renders the plan through the real v4 server; the client is the real sealed profile, `attachDom(createCore({ ssr: false }))` plus `installPlanRenderer` from `client-plans.ts` (no L1 compiler; esbuild metafile attribution shows compile.ts contributes only its `identity` fn, ~590 B raw). Navigation is `patch(plan, newFills)`.

Each page hydrates (performance.mark around createHead + pushes + flush), then runs 50 simulated page switches alternating two route states (About vs Blog: title, description, canonical, og:title, og:description, og:url), counting head DOM mutations with a `MutationObserver` on `document.head` (childList + attributes + subtree + characterData; characterData is needed to see title text swaps). Results land in `window.__RESULTS__` and are rendered into the page body.

## Results

Median of 5 runs each, headless Chromium (dev-browser managed), 2026-08-04, branch `v4/core-experiment` at `eabdbc42` (client-plans renderer shipped). Per-switch ms is the 50-switch loop total divided by 50 (Chromium quantizes `performance.now` to ~100us, so individual switch timings are too coarse).

| page | hydrate ms | avg switch ms | mutations/switch | hydrate mutations | js raw B | js gzip B |
|---|---|---|---|---|---|---|
| v3 | 0.90 | 0.060 | 12.0 | 26 | 18678 | 7147 |
| v4 | 0.40 | 0.034 | 6.0 | 0 | 15822 | 6792 |
| v4-sealed | 0.60 | 0.030 | 6.0 | 1 | 15035 | 6072 |

Bundle sizes are the full page script (implementation + shared demo harness + workload/plan data), esbuild bundle + minify, so the interesting number is the delta between rows, not the absolute. The sealed bundle's library portion is ~8.8k raw (client.ts 3.9k + core.ts 2.6k + client-plans.ts 1.7k + identity 0.6k); the plan JSON itself is 3.5k raw.

### Mutation forensics (single switch, `attributeOldValue` probe)

- v4 and v4-sealed: exactly the 6 real changes (5 attribute writes + 1 title text swap).
- v3: the same 6 real changes plus 6 spurious rewrites of unchanged values on every render: `script[defer]`, `link[crossorigin]` (boolean props compare `'' !== true` against the adopted attribute), and `og:image:width/height`, `twitter:image:width/height` (numeric props compare `'1200' !== 1200`). v3's write guard is `getAttribute(k) !== v` without normalizing the tag-side value, so boolean and number props are rewritten every render, forever.
- v3 hydration performs 26 head mutations against an SSR head it fully matches (same root cause plus `data-hid` bookkeeping); v4 hydration performs zero (lazy adoption, no-op verified writes).

### Sealed-profile hydration bugs found in this run (shipped `client-plans.ts`)

Head childElementCount stays 33 -> 33 through the sealed first flush, but script accounting (`document.scripts` before/after hydrate) shows adoption is not clean:

1. Keyed prebuilt scripts are replaced, not adopted. The analytics script (`data-hid="analytics"`, d `script:key:analytics`) is found by adoption, but `renderPrebuilt` treats it as changed because adopted elements carry no `_uhc`, and its changed-script policy is replace-never-mutate. Result: one `childList HEAD +SCRIPT -SCRIPT` mutation per hydrate and a re-executed analytics script in a real app.
2. Keyless prebuilt src scripts are duplicated. The bodyClose `module.js` / `legacy.js` tuples have `d: ''` (plain src scripts get no compile identity), so `renderPrebuilt` keys them as `pb:<html>` while adoption keyed the SSR elements by `hashTag` props. No match, fresh elements appended: `document.scripts` goes 5 -> 7 on every sealed hydrate (double fetch + double execution in a real app). The inline JSON payload script is fine (`script:content:` identity matches both sides).

The v4 loose page has neither problem (both sides hash the same pseudo-tag). Fix directions: seed `_uhc` (or an attr-level equality check) before invoking the replace policy, and give prebuilt tuples the same hash fallback identity that adoption uses.

### Honest caveats

- `emitRoutePlan` refuses a static titleTemplate over a dynamic title by design, so the sealed build drops the template and pre-applies it into the title fills (`About · Harlan Wilton`), same as the fixtures' `SEALED_PAGE_PLAN`.
- The v3/v4 pages patch a single page-level entry that carries title + description + canonical + og overrides so all three implementations swap the same 6 values per navigation.
- Sub-millisecond timings at this scale are all "fast enough"; the structural numbers (mutations per switch, hydrate mutations, script counts, bundle bytes) are the durable comparison.
- An earlier revision of this demo (commit f4a36925, before client-plans existed) used a ~40-line demo-local plan patcher for the sealed page; it measured 0.10 ms hydrate / 0.014 ms per switch / 2.1k gz total page script. Those numbers remain the ceiling a minimal fill-patching profile could reach; the shipped renderer buys full plan generality (element creation, reclaim, attr-level refill sync) for the difference.

## How to run

```sh
# 1. build (artifacts stay out of git; default output /tmp/v4demo, or:)
V4DEMO_OUT=/tmp/v4demo node bench/v4-explore/demo/build.mjs

# 2. serve the dist dir
cd /tmp/v4demo/dist && python3 -m http.server 8791 --bind 127.0.0.1 &

# 3. drive a real Chromium (5 runs per page, screenshots + results JSON
#    land in ~/.dev-browser/tmp/)
dev-browser --headless --timeout 180 run bench/v4-explore/demo/measure.browser.js

# 4. medians table
node bench/v4-explore/demo/summarize.mjs \
  ~/.dev-browser/tmp/unhead-results.json /tmp/v4demo/dist/sizes.json
```

Each page also exposes `window.__NAV__(toRouteB)` for manual poking and mutation forensics in devtools.
