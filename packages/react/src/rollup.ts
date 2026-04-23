import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rollup'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rollup'
import { unheadReactStreamingPlugin } from './stream/plugin'

export interface UnheadReactRollupOptions extends BundlerOptions {
  /**
   * Enable streaming SSR support.
   * Set to `true` or a config object to enable.
   * @default false
   */
  streaming?: true | UnheadReactStreamingOptions | false
}

/**
 * Unified rollup plugin for `@unhead/react`.
 *
 * @example
 * ```ts
 * // rollup.config.js
 * import { Unhead } from '@unhead/react/rollup'
 *
 * export default {
 *   plugins: [...Unhead()],
 * }
 * ```
 */
export function Unhead(options: UnheadReactRollupOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadReactStreamingPlugin.rollup(streamingOpts))
  }
  return plugins
}
