import type { UnheadFrameworkUnpluginOptions } from '@unhead/bundler/framework'
import type { UnheadSvelteStreamingOptions } from './stream/plugin'
import { createFrameworkRolldownPlugin } from '@unhead/bundler/framework'
import { unheadSvelteStreamingPlugin } from './stream/plugin'

export type UnheadSvelteRolldownOptions = UnheadFrameworkUnpluginOptions<UnheadSvelteStreamingOptions>

export const Unhead = createFrameworkRolldownPlugin<UnheadSvelteStreamingOptions>({
  framework: '@unhead/svelte',
  streamingPlugin: unheadSvelteStreamingPlugin,
})
