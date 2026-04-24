import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { createFrameworkRspackPlugin } from '@unhead/bundler/framework'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export type UnheadSvelteRspackOptions = UnheadFrameworkUnpluginOptions<UnheadSvelteStreamingOptions>

export const Unhead = createFrameworkRspackPlugin<UnheadSvelteStreamingOptions>({
  framework: '@unhead/svelte',
  streamingPlugin: unheadSvelteStreamingPlugin,
})
