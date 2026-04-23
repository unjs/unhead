import type { Plugin } from 'vite'
import type { UnheadReactStreamingOptions } from './plugin'
import { unheadReactStreamingPlugin } from './plugin'

export type { UnheadReactStreamingOptions }
export { unheadReactStreamingPlugin } from './plugin'

/**
 * @deprecated Use `Unhead({ streaming: true })` from `@unhead/react/vite` instead.
 * The `@unhead/react/stream/vite` subpath and `unheadReactPlugin` export will be
 * removed in a future major release.
 */
export function unheadReactPlugin(options?: UnheadReactStreamingOptions): Plugin {
  return unheadReactStreamingPlugin.vite(options) as Plugin
}

export default unheadReactPlugin
