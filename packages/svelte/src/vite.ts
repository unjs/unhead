import type { Plugin } from 'vite'
import type { UnheadSvelteOptions } from './bundler'
import { Unhead as UnheadBundler } from './bundler'

export type UnheadSvelteViteOptions = UnheadSvelteOptions

/**
 * Vite plugin for `@unhead/svelte`. Kept for backwards compatibility;
 * prefer the unified `@unhead/svelte/bundler` entry which dispatches to
 * all bundlers.
 */
export function Unhead(options: UnheadSvelteOptions = {}): Plugin[] {
  return UnheadBundler(options).vite()
}
