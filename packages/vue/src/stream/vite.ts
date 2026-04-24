import type { Plugin } from 'vite'
import type { UnheadVueStreamingOptions } from './plugin'
import { unheadVueStreamingPlugin } from './plugin'

export type { UnheadVueStreamingOptions }
export { unheadVueStreamingPlugin } from './plugin'

/**
 * @deprecated Use `Unhead({ streaming: true }).vite()` from `@unhead/vue/bundler` instead.
 * The `@unhead/vue/stream/vite` subpath and `unheadVuePlugin` export will be
 * removed in a future major release.
 */
export function unheadVuePlugin(options?: UnheadVueStreamingOptions): Plugin {
  return unheadVueStreamingPlugin.vite(options) as Plugin
}

export default unheadVuePlugin
