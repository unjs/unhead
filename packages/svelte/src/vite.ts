import type { UnpluginOptions } from '@unhead/bundler/vite'
import type { StreamingPluginOptions } from 'unhead/stream/vite'
import type { Plugin } from 'vite'
import buildPlugins from '@unhead/bundler/vite'
import { unheadSveltePlugin } from './stream/vite'

export interface UnheadSvelteViteOptions extends UnpluginOptions {
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
 * import unhead from '@unhead/svelte/vite'
 *
 * export default defineConfig({
 *   plugins: [svelte(), unhead()],
 * })
 * ```
 */
export default function unhead(options: UnheadSvelteViteOptions = {}): Plugin[] {
  const plugins: Plugin[] = [...buildPlugins(options)]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadSveltePlugin(streamingOpts))
  }
  return plugins
}
