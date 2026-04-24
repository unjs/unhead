import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { createFrameworkRollupPlugin } from '@unhead/bundler/framework'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export type UnheadSolidRollupOptions = UnheadFrameworkUnpluginOptions<UnheadSolidStreamingOptions>

export const Unhead = createFrameworkRollupPlugin<UnheadSolidStreamingOptions>({
  framework: '@unhead/solid-js',
  streamingPlugin: unheadSolidStreamingPlugin,
})
