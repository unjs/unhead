import type { Plugin } from 'vite'
import type { UnheadSvelteStreamingOptions } from './plugin'
import { unheadSvelteStreamingPlugin } from './plugin'

export type { UnheadSvelteStreamingOptions }
export { unheadSvelteStreamingPlugin } from './plugin'

/**
 * @deprecated Use `Unhead({ streaming: true }).vite()` from `@unhead/svelte/bundler` instead.
 * The `@unhead/svelte/stream/vite` subpath and `unheadSveltePlugin` export will be
 * removed in a future major release.
 */
export function unheadSveltePlugin(options?: UnheadSvelteStreamingOptions): Plugin {
  return unheadSvelteStreamingPlugin.vite(options) as Plugin
}

export default unheadSveltePlugin
