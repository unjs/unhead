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
