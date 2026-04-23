import type { UnpluginOptions as BundlerOptions } from '@unhead/bundler/rspack'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/rspack'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export interface UnheadSvelteRspackOptions extends BundlerOptions {
  streaming?: true | UnheadSvelteStreamingOptions | false
}

export function Unhead(options: UnheadSvelteRspackOptions = {}) {
  const plugins = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSvelteStreamingPlugin.rspack(streamingOpts))
  }
  return plugins
}
