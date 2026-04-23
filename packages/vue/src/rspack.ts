import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rspack'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rspack'
import { unheadVueStreamingPlugin } from './stream/plugin'

export interface UnheadVueRspackOptions extends BundlerOptions {
  streaming?: true | UnheadVueStreamingOptions | false
}

export function Unhead(options: UnheadVueRspackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadVueStreamingPlugin.rspack(streamingOpts))
  }
  return plugins
}
