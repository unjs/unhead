import type { StreamingPluginOptions } from './unplugin'
import { createStreamingPlugin } from './unplugin'

export type { StreamingPluginOptions }

/**
 * Create a rollup plugin for streaming SSR. Framework wrappers typically call this
 * with their own `framework`, `filter`, and `transform` baked in.
 */
export function createStreamingRollupPlugin(options: StreamingPluginOptions) {
  return createStreamingPlugin.rollup(options)
}
