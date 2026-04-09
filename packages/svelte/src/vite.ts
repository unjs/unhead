import type { VitePluginOptions } from '@unhead/bundler/vite'
import type { StreamingPluginOptions } from 'unhead/stream/vite'
import type { Plugin } from 'vite'
import { Unhead as buildPlugins } from '@unhead/bundler/vite'
import { unheadSveltePlugin } from './stream/vite'

export interface UnheadSvelteViteOptions extends VitePluginOptions {
  /**
   * Enable streaming SSR support.
   * Set to `true` or a config object to enable.
   * @default false
   */
  streaming?: true | Pick<StreamingPluginOptions, 'mode'> | false
}

/**
 * Unified Vite plugin for `@unhead/svelte`.
 *
 * Combines build optimizations (tree-shaking, useSeoMeta transform, minification)
 * with streaming SSR support into a single plugin.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { svelte } from '@sveltejs/vite-plugin-svelte'
 * import { Unhead } from '@unhead/svelte/vite'
 *
 * export default defineConfig({
 *   plugins: [Unhead(), svelte()],
 * })
 * ```
 */
export function Unhead(options: UnheadSvelteViteOptions = {}): Plugin[] {
  const plugins: Plugin[] = [...buildPlugins({ ...options, _framework: '@unhead/svelte' })]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSveltePlugin(streamingOpts))
  }
  return plugins
}
