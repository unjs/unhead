import type { UnheadFrameworkOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkPlugin } from '@unhead/bundler/framework'
import { unheadVueStreamingPlugin } from './stream/plugin'

export type UnheadVueOptions = UnheadFrameworkOptions<UnheadVueStreamingOptions>

/**
 * Unified bundler plugin factory for `@unhead/vue`. Returns an object with
 * per-bundler dispatch methods (`vite`, `webpack`, `rspack`, `rollup`) so a
 * single call site covers every supported builder.
 *
 * @example
 * ```ts
 * // vite:
 * import { Unhead } from '@unhead/vue/bundler'
 * export default defineConfig({ plugins: [...Unhead({ streaming: true }).vite()] })
 *
 * // nuxt kit:
 * addBuildPlugin(Unhead({ streaming: true }))
 * ```
 */
export const Unhead = createFrameworkPlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})
