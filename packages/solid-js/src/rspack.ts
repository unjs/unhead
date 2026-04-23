import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rspack'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rspack'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export interface UnheadSolidRspackOptions extends BundlerOptions {
  /**
   * Enable streaming SSR support.
   * @default false
   */
  streaming?: true | UnheadSolidStreamingOptions | false
}

/**
 * Unified rspack plugin for `@unhead/solid-js`.
 */
export function Unhead(options: UnheadSolidRspackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSolidStreamingPlugin.rspack(streamingOpts))
  }
  return plugins
}
