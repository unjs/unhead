import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadReactStreamingOptions } from './stream/plugin'
import { createFrameworkEsbuildPlugin } from '@unhead/bundler/framework'
import { unheadReactStreamingPlugin } from './stream/plugin'

export type UnheadReactEsbuildOptions = UnheadFrameworkUnpluginOptions<UnheadReactStreamingOptions>

export const Unhead = createFrameworkEsbuildPlugin<UnheadReactStreamingOptions>({
  framework: '@unhead/react',
  streamingPlugin: unheadReactStreamingPlugin,
})
