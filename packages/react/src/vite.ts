import type { VitePluginOptions } from '@unhead/bundler/vite'
import type { Plugin } from 'vite'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { Unhead as buildPlugins } from '@unhead/bundler/vite'
import { unheadReactStreamingPlugin } from './stream/plugin'

export interface UnheadReactViteOptions extends VitePluginOptions {
  /**
   * Enable streaming SSR support.
   * Set to `true` or a config object to enable.
   * @default false
   */
  streaming?: true | UnheadReactStreamingOptions | false
}

/**
 * Unified Vite plugin for `@unhead/react`.
 *
 * Combines build optimizations (tree-shaking, useSeoMeta transform, minification)
 * with streaming SSR support into a single plugin.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import react from '@vitejs/plugin-react'
 * import { Unhead } from '@unhead/react/vite'
 *
 * export default defineConfig({
 *   plugins: [react(), Unhead()],
 * })
 * ```
 */
export function Unhead(options: UnheadReactViteOptions = {}): Plugin[] {
  const plugins: Plugin[] = [...buildPlugins({ ...options, _framework: '@unhead/react' })]
  if (options.streaming) {
    const streamingOpts = typeof options.streaming === 'object' ? options.streaming : undefined
    plugins.push(unheadReactStreamingPlugin.vite(streamingOpts) as Plugin)
  }
  return plugins
}
