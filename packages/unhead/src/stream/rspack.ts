import type { StreamingPluginOptions } from './unplugin'
import { createStreamingPlugin } from './unplugin'

export type { StreamingPluginOptions }

/**
 * Create an rspack plugin for streaming SSR. Framework wrappers typically call this
 * with their own `framework`, `filter`, and `transform` baked in.
 */
export function createStreamingRspackPlugin(options: StreamingPluginOptions) {
  return createStreamingPlugin.rspack(options)
}
