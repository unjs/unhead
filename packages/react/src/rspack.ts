import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { createFrameworkRspackPlugin } from '@unhead/bundler/framework'
import { unheadReactStreamingPlugin } from './stream/plugin'

export type UnheadReactRspackOptions = UnheadFrameworkUnpluginOptions<UnheadReactStreamingOptions>

export const Unhead = createFrameworkRspackPlugin<UnheadReactStreamingOptions>({
  framework: '@unhead/react',
  streamingPlugin: unheadReactStreamingPlugin,
})
