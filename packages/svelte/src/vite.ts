import type { VitePluginOptions } from '@unhead/bundler/vite'
import type { Plugin } from 'vite'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/vite'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export interface UnheadSvelteViteOptions extends VitePluginOptions {
  /**
   * Enable streaming SSR support.
   * @default false
   */
  streaming?: true | UnheadSvelteStreamingOptions | false
}

/**
 * Unified Vite plugin for `@unhead/svelte`.
 */
export function Unhead(options: UnheadSvelteViteOptions = {}): Plugin[] {
  const plugins: Plugin[] = [...buildPlugins({ ...options, _framework: '@unhead/svelte' })]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSvelteStreamingPlugin.vite(streamingOpts) as Plugin)
  }
  return plugins
}
