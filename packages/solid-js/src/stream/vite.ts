import type { Plugin } from 'vite'
import type { UnheadSolidStreamingOptions } from './plugin'
import { unheadSolidStreamingPlugin } from './plugin'

export type { UnheadSolidStreamingOptions }
export { unheadSolidStreamingPlugin } from './plugin'

/**
 * @deprecated Use `Unhead({ streaming: true })` from `@unhead/solid-js/vite` instead.
 * The `@unhead/solid-js/stream/vite` subpath and `unheadSolidPlugin` export will be
 * removed in a future major release.
 */
export function unheadSolidPlugin(options?: UnheadSolidStreamingOptions): Plugin {
  return unheadSolidStreamingPlugin.vite(options) as Plugin
}

export default unheadSolidPlugin
