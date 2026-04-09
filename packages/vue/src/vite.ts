import type { VitePluginOptions } from '@unhead/bundler/vite'
import type { StreamingPluginOptions } from 'unhead/stream/vite'
import type { Plugin } from 'vite'
import { Unhead as buildPlugins } from '@unhead/bundler/vite'
import { unheadVuePlugin } from './stream/vite'

export interface UnheadVueViteOptions extends VitePluginOptions {
  /**
   * Enable streaming SSR support.
   * Set to `true` or a config object to enable.
   * @default false
   */
  streaming?: true | Pick<StreamingPluginOptions, 'mode'> | false
}

/**
 * Unified Vite plugin for `@unhead/vue`.
 *
 * Combines build optimizations (tree-shaking, useSeoMeta transform, minification)
 * with streaming SSR support into a single plugin.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import vue from '@vitejs/plugin-vue'
 * import { Unhead } from '@unhead/vue/vite'
 *
 * export default defineConfig({
 *   plugins: [vue(), Unhead()],
 * })
 * ```
 */
export function Unhead(options: UnheadVueViteOptions = {}): Plugin[] {
  const plugins: Plugin[] = [...buildPlugins({ ...options, _framework: '@unhead/vue' })]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadVuePlugin(streamingOpts))
  }
  return plugins
}
