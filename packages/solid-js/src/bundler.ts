import type { UnheadFrameworkOptions } from '@unhead/bundler/framework'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { createFrameworkPlugin } from '@unhead/bundler/framework'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export type UnheadSolidOptions = UnheadFrameworkOptions<UnheadSolidStreamingOptions>

/**
 * Unified bundler plugin factory for `@unhead/solid-js`. Returns an object
 * with per-bundler dispatch methods (`vite`, `webpack`, `rspack`, `rollup`).
 *
 * @example
 * ```ts
 * import { Unhead } from '@unhead/solid-js/bundler'
 * export default defineConfig({ plugins: [...Unhead({ streaming: true }).vite(), solid()] })
 * ```
 */
export const Unhead = createFrameworkPlugin<UnheadSolidStreamingOptions>({
  framework: '@unhead/solid-js',
  streamingPlugin: unheadSolidStreamingPlugin,
})
