import type { StreamingPluginOptions } from './unplugin'
import { createStreamingPlugin } from './unplugin'

export type { StreamingPluginOptions }

/**
 * Create a webpack plugin for streaming SSR. Framework wrappers typically call this
 * with their own `framework`, `filter`, and `transform` baked in.
 */
export function createStreamingWebpackPlugin(options: StreamingPluginOptions) {
  return createStreamingPlugin.webpack(options)
}
