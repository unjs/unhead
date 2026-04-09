import type { VitePluginOptions } from '@unhead/bundler/vite'
import type { StreamingPluginOptions } from 'unhead/stream/vite'
import type { Plugin } from 'vite'
import { Unhead as buildPlugins } from '@unhead/bundler/vite'
import { unheadSolidPlugin } from './stream/vite'

export interface UnheadSolidViteOptions extends VitePluginOptions {
  /**
   * Enable streaming SSR support.
   * Set to `true` or a config object to enable.
   * @default false
   */
  streaming?: true | Pick<StreamingPluginOptions, 'mode'> | false
}

/**
 * Unified Vite plugin for `@unhead/solid-js`.
 *
 * Combines build optimizations (tree-shaking, useSeoMeta transform, minification)
 * with streaming SSR support into a single plugin.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import solid from 'vite-plugin-solid'
 * import { Unhead } from '@unhead/solid-js/vite'
 *
 * export default defineConfig({
 *   plugins: [Unhead(), solid()],
 * })
 * ```
 */
export function Unhead(options: UnheadSolidViteOptions = {}): Plugin[] {
  const plugins: Plugin[] = [...buildPlugins({ ...options, _framework: '@unhead/solid-js' })]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSolidPlugin(streamingOpts))
  }
  return plugins
}
