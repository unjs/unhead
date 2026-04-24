import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkRollupPlugin } from '@unhead/bundler/framework'
import { unheadVueStreamingPlugin } from './stream/plugin'

export type UnheadVueRollupOptions = UnheadFrameworkUnpluginOptions<UnheadVueStreamingOptions>

export const Unhead = createFrameworkRollupPlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})
