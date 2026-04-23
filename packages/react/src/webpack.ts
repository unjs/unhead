import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/webpack'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/webpack'
import { unheadReactStreamingPlugin } from './stream/plugin'

export interface UnheadReactWebpackOptions extends BundlerOptions {
  /**
   * Enable streaming SSR support.
   * Set to `true` or a config object to enable.
   * @default false
   */
  streaming?: true | UnheadReactStreamingOptions | false
}

/**
 * Unified webpack plugin for `@unhead/react`.
 *
 * @example
 * ```ts
 * // webpack.config.js
 * const { Unhead } = require('@unhead/react/webpack')
 *
 * module.exports = {
 *   plugins: [...Unhead()],
 * }
 * ```
 */
export function Unhead(options: UnheadReactWebpackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadReactStreamingPlugin.webpack(streamingOpts))
  }
  return plugins
}
