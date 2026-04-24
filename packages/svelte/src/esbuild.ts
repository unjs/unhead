import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { createFrameworkEsbuildPlugin } from '@unhead/bundler/framework'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export type UnheadSvelteEsbuildOptions = UnheadFrameworkUnpluginOptions<UnheadSvelteStreamingOptions>

export const Unhead = createFrameworkEsbuildPlugin<UnheadSvelteStreamingOptions>({
  framework: '@unhead/svelte',
  streamingPlugin: unheadSvelteStreamingPlugin,
})
