import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkRspackPlugin } from '@unhead/bundler/framework'
import { unheadVueStreamingPlugin } from './stream/plugin'

export type UnheadVueRspackOptions = UnheadFrameworkUnpluginOptions<UnheadVueStreamingOptions>

export const Unhead = createFrameworkRspackPlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})
