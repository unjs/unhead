import type { VitePluginOptions } from '@unhead/bundler/vite'
import type { Plugin } from 'vite'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/vite'
import { unheadVueStreamingPlugin } from './stream/plugin'

export interface UnheadVueViteOptions extends VitePluginOptions {
  /**
   * Enable streaming SSR support.
   * @default false
   */
  streaming?: true | UnheadVueStreamingOptions | false
}

/**
 * Unified Vite plugin for `@unhead/vue`.
 */
export function Unhead(options: UnheadVueViteOptions = {}): Plugin[] {
  const plugins: Plugin[] = [...buildPlugins({ ...options, _framework: '@unhead/vue' })]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadVueStreamingPlugin.vite(streamingOpts) as Plugin)
  }
  return plugins
}
