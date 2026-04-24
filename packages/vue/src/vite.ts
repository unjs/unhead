import type { UnheadFrameworkViteOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkVitePlugin } from '@unhead/bundler/framework'
import { unheadVueStreamingPlugin } from './stream/plugin'

export type UnheadVueViteOptions = UnheadFrameworkViteOptions<UnheadVueStreamingOptions>

/**
 * Unified Vite plugin for `@unhead/vue`. Combines build-time transforms
 * with optional streaming SSR support.
 *
 * @example
 * ```ts
 * import { Unhead } from '@unhead/vue/vite'
 * export default defineConfig({ plugins: [Unhead({ streaming: true })] })
 * ```
 */
export const Unhead = createFrameworkVitePlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})
