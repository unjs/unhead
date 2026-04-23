import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rollup'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rollup'
import { unheadVueStreamingPlugin } from './stream/plugin'

export interface UnheadVueRollupOptions extends BundlerOptions {
  streaming?: true | UnheadVueStreamingOptions | false
}

export function Unhead(options: UnheadVueRollupOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadVueStreamingPlugin.rollup(streamingOpts))
  }
  return plugins
}
