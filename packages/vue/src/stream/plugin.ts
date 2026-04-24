import type { StreamingPluginOptions } from 'unhead/stream/unplugin'
import { buildStreamingPluginOptions } from 'unhead/stream/unplugin'
import { createUnplugin } from 'unplugin'

export type UnheadVueStreamingOptions = Pick<StreamingPluginOptions, 'mode'>

/**
 * Bundler-agnostic streaming SSR plugin for `@unhead/vue`.
 *
 * Vue does not need a source-level transform: per-chunk head patches are
 * emitted by `wrapStream` on the server as self-deleting inline scripts.
 * This plugin exists to wire the client streaming bootstrap (virtual iife
 * module + `transformIndexHtml` head-prepend on vite).
 */
export const unheadVueStreamingPlugin = createUnplugin<UnheadVueStreamingOptions | undefined>((options = {}) =>
  buildStreamingPluginOptions({
    framework: '@unhead/vue',
    mode: options.mode,
  }),
)
