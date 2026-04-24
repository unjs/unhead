import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkEsbuildPlugin } from '@unhead/bundler/framework'
import { unheadVueStreamingPlugin } from './stream/plugin'

export type UnheadVueEsbuildOptions = UnheadFrameworkUnpluginOptions<UnheadVueStreamingOptions>

export const Unhead = createFrameworkEsbuildPlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})
