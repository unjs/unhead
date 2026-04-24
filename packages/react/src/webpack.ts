import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { createFrameworkWebpackPlugin } from '@unhead/bundler/framework'
import { unheadReactStreamingPlugin } from './stream/plugin'

export type UnheadReactWebpackOptions = UnheadFrameworkUnpluginOptions<UnheadReactStreamingOptions>

export const Unhead = createFrameworkWebpackPlugin<UnheadReactStreamingOptions>({
  framework: '@unhead/react',
  streamingPlugin: unheadReactStreamingPlugin,
})
