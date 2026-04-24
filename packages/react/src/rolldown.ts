import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { createFrameworkRolldownPlugin } from '@unhead/bundler/framework'
import { unheadReactStreamingPlugin } from './stream/plugin'

export type UnheadReactRolldownOptions = UnheadFrameworkUnpluginOptions<UnheadReactStreamingOptions>

export const Unhead = createFrameworkRolldownPlugin<UnheadReactStreamingOptions>({
  framework: '@unhead/react',
  streamingPlugin: unheadReactStreamingPlugin,
})
