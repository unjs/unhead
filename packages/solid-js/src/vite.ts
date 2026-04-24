import type { Plugin } from 'vite'
import type { UnheadSolidOptions } from './bundler'
import { Unhead as UnheadBundler } from './bundler'

export type UnheadSolidViteOptions = UnheadSolidOptions

/**
 * Vite plugin for `@unhead/solid-js`. Kept for backwards compatibility;
 * prefer the unified `@unhead/solid-js/bundler` entry which dispatches to
 * all bundlers.
 */
export function Unhead(options: UnheadSolidOptions = {}): Plugin[] {
  return UnheadBundler(options).vite()
}
