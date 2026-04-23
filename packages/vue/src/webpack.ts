import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/webpack'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/webpack'
import { unheadVueStreamingPlugin } from './stream/plugin'

export interface UnheadVueWebpackOptions extends BundlerOptions {
  streaming?: true | UnheadVueStreamingOptions | false
}

export function Unhead(options: UnheadVueWebpackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadVueStreamingPlugin.webpack(streamingOpts))
  }
  return plugins
}
