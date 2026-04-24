import type { UnheadFrameworkViteOptions } from '@unhead/bundler/framework'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { createFrameworkVitePlugin } from '@unhead/bundler/framework'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export type UnheadSvelteViteOptions = UnheadFrameworkViteOptions<UnheadSvelteStreamingOptions>

/**
 * Unified Vite plugin for `@unhead/svelte`.
 */
export const Unhead = createFrameworkVitePlugin<UnheadSvelteStreamingOptions>({
  framework: '@unhead/svelte',
  streamingPlugin: unheadSvelteStreamingPlugin,
})
