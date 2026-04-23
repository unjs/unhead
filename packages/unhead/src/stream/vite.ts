import type { Plugin } from 'vite'
import type { StreamingPluginOptions } from './unplugin'
import { createStreamingPlugin as _createStreamingPlugin } from './unplugin'

export type { StreamingPluginOptions }
export { buildStreamingPluginOptions, VIRTUAL_CLIENT_ID, VIRTUAL_IIFE_ID } from './unplugin'

/**
 * @deprecated Import from `unhead/stream/unplugin` instead and call `.vite(options)`
 * on the returned unplugin instance. The `unhead/stream/vite` subpath will be
 * removed in a future major release.
 *
 * ```ts
 * // Before
 * import { createStreamingPlugin } from 'unhead/stream/vite'
 * const plugin = createStreamingPlugin({ framework, filter, transform })
 *
 * // After
 * import { createStreamingPlugin } from 'unhead/stream/unplugin'
 * const plugin = createStreamingPlugin.vite({ framework, filter, transform })
 * ```
 */
export function createStreamingPlugin(options: StreamingPluginOptions): Plugin {
  return _createStreamingPlugin.vite(options) as Plugin
}
