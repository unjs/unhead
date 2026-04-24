import type { UnheadFrameworkViteOptions } from '@unhead/bundler/framework'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { createFrameworkVitePlugin } from '@unhead/bundler/framework'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export type UnheadSolidViteOptions = UnheadFrameworkViteOptions<UnheadSolidStreamingOptions>

/**
 * Unified Vite plugin for `@unhead/solid-js`.
 *
 * @example
 * ```ts
 * import { Unhead } from '@unhead/solid-js/vite'
 * export default defineConfig({ plugins: [Unhead({ streaming: true }), solid()] })
 * ```
 */
export const Unhead = createFrameworkVitePlugin<UnheadSolidStreamingOptions>({
  framework: '@unhead/solid-js',
  streamingPlugin: unheadSolidStreamingPlugin,
})
