import type { UnheadFrameworkViteOptions } from '@unhead/bundler/framework'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { createFrameworkVitePlugin } from '@unhead/bundler/framework'
import { unheadReactStreamingPlugin } from './stream/plugin'

export type UnheadReactViteOptions = UnheadFrameworkViteOptions<UnheadReactStreamingOptions>

/**
 * Unified Vite plugin for `@unhead/react`.
 *
 * @example
 * ```ts
 * import { Unhead } from '@unhead/react/vite'
 * export default defineConfig({ plugins: [react(), Unhead({ streaming: true })] })
 * ```
 */
export const Unhead = createFrameworkVitePlugin<UnheadReactStreamingOptions>({
  framework: '@unhead/react',
  streamingPlugin: unheadReactStreamingPlugin,
})
