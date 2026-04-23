import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rollup'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rollup'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export interface UnheadSolidRollupOptions extends BundlerOptions {
  /**
   * Enable streaming SSR support.
   * @default false
   */
  streaming?: true | UnheadSolidStreamingOptions | false
}

/**
 * Unified rollup plugin for `@unhead/solid-js`.
 */
export function Unhead(options: UnheadSolidRollupOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSolidStreamingPlugin.rollup(streamingOpts))
  }
  return plugins
}
