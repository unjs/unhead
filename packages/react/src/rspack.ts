import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rspack'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rspack'
import { unheadReactStreamingPlugin } from './stream/plugin'

export interface UnheadReactRspackOptions extends BundlerOptions {
  /**
   * Enable streaming SSR support.
   * Set to `true` or a config object to enable.
   * @default false
   */
  streaming?: true | UnheadReactStreamingOptions | false
}

/**
 * Unified rspack plugin for `@unhead/react`.
 *
 * @example
 * ```ts
 * // rspack.config.js
 * const { Unhead } = require('@unhead/react/rspack')
 *
 * module.exports = {
 *   plugins: [...Unhead()],
 * }
 * ```
 */
export function Unhead(options: UnheadReactRspackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadReactStreamingPlugin.rspack(streamingOpts))
  }
  return plugins
}
