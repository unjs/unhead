import type { LazyHeadOptions, LazyUnhead } from 'unhead/lazy'
import { getOwner, sharedConfig } from 'solid-js'
import { createHead as _createHead } from 'unhead/lazy'

export { UnheadContext } from './context'

// Solid sets `sharedConfig.context` while `hydrate()` runs components against the server HTML.
// It clears it before user effects, such as `onMount()`, and a component created after
// hydration never has it. A push outside any owner, such as from the client entry, counts
// as server rendered.
function _isClientOnlyPush() {
  return !!getOwner() && !sharedConfig.context
}

/**
 * The lazy head for a server rendered Solid app. It loads the DOM runtime only when a
 * change needs it, or when `load()` runs.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: LazyHeadOptions = {}): LazyUnhead {
  return _createHead({ _isClientOnlyPush, ...options } as LazyHeadOptions)
}

export type {
  LazyHeadOptions,
  LazyUnhead,
}
