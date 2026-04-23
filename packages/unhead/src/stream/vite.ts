import type { Plugin } from 'vite'
import type { StreamingPluginOptions } from './unplugin'
import { createStreamingPlugin } from './unplugin'

export type { StreamingPluginOptions }
export { buildStreamingPluginOptions, VIRTUAL_CLIENT_ID, VIRTUAL_IIFE_ID } from './unplugin'

/**
 * Create a vite plugin for streaming SSR. Framework wrappers typically call this
 * with their own `framework`, `filter`, and `transform` baked in.
 */
export function createStreamingVitePlugin(options: StreamingPluginOptions): Plugin {
  return createStreamingPlugin.vite(options) as Plugin
}
