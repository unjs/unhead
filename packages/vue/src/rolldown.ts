import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkRolldownPlugin } from '@unhead/bundler/framework'
import { unheadVueStreamingPlugin } from './stream/plugin'

export type UnheadVueRolldownOptions = UnheadFrameworkUnpluginOptions<UnheadVueStreamingOptions>

export const Unhead = createFrameworkRolldownPlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})
