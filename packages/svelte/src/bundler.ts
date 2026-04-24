import type { UnheadFrameworkOptions } from '@unhead/bundler/framework'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { createFrameworkPlugin } from '@unhead/bundler/framework'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export type UnheadSvelteOptions = UnheadFrameworkOptions<UnheadSvelteStreamingOptions>

/**
 * Unified bundler plugin factory for `@unhead/svelte`. Returns an object
 * with per-bundler dispatch methods (`vite`, `webpack`, `rspack`, `rollup`).
 */
export const Unhead = createFrameworkPlugin<UnheadSvelteStreamingOptions>({
  framework: '@unhead/svelte',
  streamingPlugin: unheadSvelteStreamingPlugin,
})
