# Real-browser demo: v3 vs v4 hydration and page-switch performance

Three static pages, one shared workload (the `bench/v4/fixtures.ts` page: ~45 tags across 7 entries), measured in a real headless Chromium via `dev-browser`. No JSDOM anywhere.

- `index-v3.html`: head SSR-rendered by the v3 server renderer, hydrated by the v3 client (`packages/unhead/src/client`). v3 renders synchronously on every push/patch; that is its shipped behavior.
- `index-v4.html`: head SSR-rendered by the v4 server renderer, hydrated by the v4 client (`packages/unhead/src/v4/client`) with a no-op injected scheduler and explicit `head.render()` flushes, so hydration is 7 pushes + one flush and each navigation is one flush.
- `index-v4-sealed.html`: the compiled-app story. The whole route head is pre-merged at build time by `emit.ts` `emitRoutePlan` into one sealed plan whose only dynamic values are 6 fill holes (title, description, canonical, og:title, og:description, og:url). SSR renders the plan through the real v4 server; navigation is `patch(plan, newFills)`.

Each page hydrates (performance.mark around createHead + pushes + flush), then runs 50 simulated page switches alternating two route states (About vs Blog: title, description, canonical, og:title, og:description, og:url), counting head DOM mutations with a `MutationObserver` on `document.head` (childList + attributes + subtree + characterData; characterData is needed to see title text swaps). Results land in `window.__RESULTS__` and are rendered into the page body.

## Results

Median of 5 runs each, headless Chromium (dev-browser managed), 2026-08-04, branch `v4/core-experiment`. Per-switch ms is the 50-switch loop total divided by 50 (Chromium quantizes `performance.now` to ~100us, so individual switch timings are too coarse).

| page | hydrate ms | avg switch ms | mutations/switch | hydrate mutations | js raw B | js gzip B |
|---|---|---|---|---|---|---|
| v3 | 0.90 | 0.060 | 12.0 | 26 | 18305 | 7013 |
| v4 | 0.50 | 0.040 | 6.0 | 0 | 15388 | 6525 |
| v4-sealed | 0.10 | 0.014 | 6.0 | 0 | 6335 | 2108 |

All three pages end with identical heads (33 head children before and after hydration, no duplicated tags, final title correct). Bundle sizes are the full page script (implementation + shared demo harness + workload data), esbuild bundle + minify, so the interesting number is the delta between rows, not the absolute.

### Mutation forensics (single switch, `attributeOldValue` probe)

- v4 and v4-sealed: exactly the 6 real changes (5 attribute writes + 1 title text swap).
- v3: the same 6 real changes plus 6 spurious rewrites of unchanged values on every render: `script[defer]`, `link[crossorigin]` (boolean props compare `'' !== true` against the adopted attribute), and `og:image:width/height`, `twitter:image:width/height` (numeric props compare `'1200' !== 1200`). v3's write guard is `getAttribute(k) !== v` without normalizing the tag-side value, so boolean and number props are rewritten every render, forever.
- v3 hydration performs 26 head mutations against an SSR head it fully matches (same root cause plus `data-hid` bookkeeping); v4 hydration performs zero (lazy adoption, no-op verified writes).

### Honest caveats

- The v4 prototype's client renderer cannot render sealed plans today: `revivePlan` leaves the type-id bits of `f` at zero for head-position prebuilt tuples, so a plan pushed on the client hits the `id === T_TITLE` branch in `renderDOM` and writes raw HTML into `document.title`. `F_PREBUILT` is only handled in `server.ts` and `early-hints.ts`. The sealed page therefore uses `src/sealed-runtime.ts`, a ~40-line demo-local client over the real emitted PlanTag wire format (adopt hole-bearing elements by identity, patch fills onto them). Its numbers are the ceiling for a real `client-csr` sealed profile, not the numbers of shipped code.
- `emitRoutePlan` refuses a static titleTemplate over a dynamic title by design, so the sealed build drops the template and pre-applies it into the title fills (`About · Harlan Wilton`), same as the fixtures' `SEALED_PAGE_PLAN`.
- The v3/v4 pages patch a single page-level entry that carries title + description + canonical + og overrides so all three implementations swap the same 6 values per navigation.
- Sub-millisecond timings at this scale are all "fast enough"; the structural numbers (mutations per switch, hydrate mutations, bundle bytes) are the durable comparison.

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
