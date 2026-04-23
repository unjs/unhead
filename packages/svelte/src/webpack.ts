import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/webpack'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/webpack'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export interface UnheadSvelteWebpackOptions extends BundlerOptions {
  streaming?: true | UnheadSvelteStreamingOptions | false
}

export function Unhead(options: UnheadSvelteWebpackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSvelteStreamingPlugin.webpack(streamingOpts))
  }
  return plugins
}
