# Unhead v4 Migration Guide

Audience: **plugin authors and advanced integrators**. App-facing APIs (`useHead`, `useSeoMeta`, `useHeadSafe`) and rendered HTML output are unchanged.

## Incremental tag resolution (dedupe state lives on the head)

`resolveTags()` no longer rebuilds, sorts, and dedupes the full tag list on every render. Dedupe state is maintained incrementally on the head instance and only entries that changed since the last render (push / patch / dispose / invalidated `_tags`) are reprocessed.

What this means for plugin authors:

- **Normalized entry tags (`entry._tags`) are cached and shared across renders.** Never mutate tags you received from a previous resolve outside the documented hooks. Deleting `entry._tags` still forces a re-normalization of that entry (this remains the supported invalidation escape hatch).
- **`entries:resolve` context**: the `tagMap` and `tags` properties of the hook context were previously the live (empty) containers used by the subsequent dedupe pass; pre-seeding them affected output. They are now inert placeholders kept only for type compatibility. Use the `entries` array (this is what all known plugins do).
- **`dedupeTags(ctx)` is deprecated.** The full-list dedupe helper is retained for compatibility but is no longer used by the resolve pipeline and will be removed later in the v4 cycle.
- A new internal field `head._dq` holds the dedupe state. It is internal; do not touch it.

Behavior (winner selection, merge strategy, same-entry flat-meta arrays, capo ordering, title templates) is unchanged and covered by the existing test fixtures byte-for-byte.

## Immutable resolved tags

Resolved tags passed to tag-level hooks (`tags:beforeResolve`, `tags:resolve`, `tags:afterResolve`, `ssr:render`, `ssr:rendered`, `dom:rendered`) are now **shared, immutable objects**. Outside production they are `Object.freeze`-d, so in-place mutation throws in dev and test.

To change a tag, replace the array element with a new object:

```ts
// v3 (in-place mutation)
'tags:resolve'({ tags }) {
  for (const tag of tags) {
    if (tag.tag === 'meta' && tag.props.name === 'description')
      tag.props.content = rewrite(tag.props.content)
  }
}

// v4 (replacement)
'tags:resolve'({ tags }) {
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]
    if (tag.tag === 'meta' && tag.props.name === 'description')
      tags[i] = { ...tag, props: { ...tag.props, content: rewrite(tag.props.content) } }
  }
}
```

Notes:

- `ctx.tags` (the array itself) is per-render and yours to reorder, push to, splice, or reassign (`ctx.tags = ...`).
- `ctx.tagMap` is a **read-only snapshot** of deduped winners keyed by dedupe key, built before hooks run. It is not updated when you replace array elements; treat it as a lookup aid only.
- The `_nonMutating` hook marker and the per-render defensive clone machinery are gone — they are no longer needed.
- First-party plugins (`TemplateParamsPlugin`, `InferSeoMetaPlugin`, `CanonicalPlugin`, `MinifyPlugin`, `AliasSortingPlugin`, `@unhead/schema-org`) have been rewritten to the replacement style; use them as reference implementations.

## One sync `tags:resolve` hook

The three tag-resolution phases are collapsed into a single synchronous hook. Async tag hooks are no longer supported on the render path (renders have been synchronous since v3; async hooks silently raced the output).

Rename map:

| v3 hook | v4 equivalent |
| --- | --- |
| `tags:beforeResolve` | `tags:resolve` with plugin `order: -10` |
| `tags:resolve` | `tags:resolve` (unchanged name; now sync-only) |
| `tags:afterResolve` | `tags:resolve` with plugin `order: 50`+ |
| `tag:normalise` | removed (was never called) |
| `dom:renderTag` | removed (deprecated in v3) |

Plugins now accept an `order` option (number, lower runs earlier, default `0`; equal orders run in registration order) to sequence their callbacks against other plugins:

```ts
defineHeadPlugin({
  key: 'my-plugin',
  order: -10, // run before TemplateParamsPlugin etc.
  hooks: {
    'tags:resolve': (ctx) => { /* ... */ },
  },
})
```

First-party orders for reference: `InferSeoMetaPlugin` -10, most plugins 0, `AliasSortingPlugin` 50, devtools 90, validation 100.

Other hot-path hooks (`entries:normalize`, `ssr:beforeRender`, `ssr:render`, `ssr:rendered`, `dom:beforeRender`, `dom:rendered`) are also called synchronously without promise chaining — returned promises are ignored. `entries:resolve` keeps async support for `PromisesPlugin`-style input resolution.

If you need async work, do it at the entry level (e.g. `PromisesPlugin`, or resolve your data before calling `useHead`).

### Fixed: schema.org graph race

`@unhead/schema-org`'s `tags:resolve` hook was `async`; since the render pipeline became synchronous in v3 (#629), the JSON-LD graph could be rendered as an empty `<script>` because the hook's work landed after rendering. The hook is now synchronous and the graph always renders. If you snapshot rendered output that includes `schema-org-graph` scripts, expect the (previously missing) JSON-LD payload to appear.
