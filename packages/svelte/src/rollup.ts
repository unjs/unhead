import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rollup'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rollup'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export interface UnheadSvelteRollupOptions extends BundlerOptions {
  streaming?: true | UnheadSvelteStreamingOptions | false
}

export function Unhead(options: UnheadSvelteRollupOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSvelteStreamingPlugin.rollup(streamingOpts))
  }
  return plugins
}
