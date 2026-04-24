import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkWebpackPlugin } from '@unhead/bundler/framework'
import { unheadVueStreamingPlugin } from './stream/plugin'

export type UnheadVueWebpackOptions = UnheadFrameworkUnpluginOptions<UnheadVueStreamingOptions>

export const Unhead = createFrameworkWebpackPlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})
