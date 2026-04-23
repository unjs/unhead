import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/webpack'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/webpack'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export interface UnheadSolidWebpackOptions extends BundlerOptions {
  /**
   * Enable streaming SSR support.
   * @default false
   */
  streaming?: true | UnheadSolidStreamingOptions | false
}

/**
 * Unified webpack plugin for `@unhead/solid-js`.
 */
export function Unhead(options: UnheadSolidWebpackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSolidStreamingPlugin.webpack(streamingOpts))
  }
  return plugins
}
