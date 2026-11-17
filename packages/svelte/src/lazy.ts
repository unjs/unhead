import type { LazyHeadOptions, LazyUnhead } from 'unhead/lazy'
import { createHead as _createHead } from 'unhead/lazy'

export { UnheadContextKey } from './context'

/**
 * The lazy head for a server rendered Svelte app. It loads the DOM runtime only when a
 * change needs it, or when `load()` runs.
 *
 * Svelte has no public signal for a component that hydrates, so every push before
 * `head.render()` counts as server rendered. The dev warning names a client only value.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: LazyHeadOptions = {}): LazyUnhead {
  return _createHead(options)
}

export type {
  LazyHeadOptions,
  LazyUnhead,
}
