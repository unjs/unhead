import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { createFrameworkRolldownPlugin } from '@unhead/bundler/framework'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export type UnheadSolidRolldownOptions = UnheadFrameworkUnpluginOptions<UnheadSolidStreamingOptions>

export const Unhead = createFrameworkRolldownPlugin<UnheadSolidStreamingOptions>({
  framework: '@unhead/solid-js',
  streamingPlugin: unheadSolidStreamingPlugin,
})
