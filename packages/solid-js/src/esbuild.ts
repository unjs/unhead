import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadSolidStreamingOptions } from './stream/plugin'
import { createFrameworkEsbuildPlugin } from '@unhead/bundler/framework'
import { unheadSolidStreamingPlugin } from './stream/plugin'

export type UnheadSolidEsbuildOptions = UnheadFrameworkUnpluginOptions<UnheadSolidStreamingOptions>

export const Unhead = createFrameworkEsbuildPlugin<UnheadSolidStreamingOptions>({
  framework: '@unhead/solid-js',
  streamingPlugin: unheadSolidStreamingPlugin,
})
