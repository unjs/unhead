import type { ReactNode } from 'react'
import type { LazyHeadOptions, LazyUnhead } from 'unhead/lazy'
import { createElement, useEffect } from 'react'
import { createHead as _createHead } from 'unhead/lazy'
import { UnheadContext } from './context'

/**
 * The lazy head for a server rendered React app. It loads the DOM runtime only when a
 * change needs it, or when `load()` runs.
 *
 * React has no public signal for a component that hydrates, so every push before the
 * provider marks the end of hydration counts as server rendered. The dev warning names
 * a client only value.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: LazyHeadOptions = {}): LazyUnhead {
  return _createHead(options)
}

export interface UnheadProviderProps {
  children: ReactNode
  value: LazyUnhead
}

/**
 * Provides the lazy head to `useHead()`, and marks the end of hydration.
 *
 * `useHead()` adds its entry in an effect. React runs the effects of every child before the
 * effect of this provider, so the provider calls `head.render()` once the entries of the
 * hydrated page exist.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
export function UnheadProvider({ children, value }: UnheadProviderProps) {
  useEffect(() => {
    value.render()
  }, [value])
  return createElement(UnheadContext.Provider, { value }, children)
}

export type {
  LazyHeadOptions,
  LazyUnhead,
}
