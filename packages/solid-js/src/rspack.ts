import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { createFrameworkRspackPlugin } from '@unhead/bundler/framework'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export type UnheadSolidRspackOptions = UnheadFrameworkUnpluginOptions<UnheadSolidStreamingOptions>

export const Unhead = createFrameworkRspackPlugin<UnheadSolidStreamingOptions>({
  framework: '@unhead/solid-js',
  streamingPlugin: unheadSolidStreamingPlugin,
})
