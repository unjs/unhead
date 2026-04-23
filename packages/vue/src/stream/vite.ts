import type { StreamingPluginOptions } from 'unhead/stream/vite'
import { createStreamingPlugin } from 'unhead/stream/vite'

/**
 * Vite plugin for Vue streaming SSR support.
 *
 * Registers the streaming iife/client virtual modules and injects the
 * bootstrap via `transformIndexHtml`. No SFC source transform is required:
 * per-chunk head updates are emitted by `wrapStream` on the server as
 * self-deleting inline scripts.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { unheadVuePlugin } from '@unhead/vue/stream/vite'
 *
 * export default {
 *   plugins: [unheadVuePlugin()],
 * }
 * ```
 */
export function unheadVuePlugin(options?: Pick<StreamingPluginOptions, 'mode'>) {
  return createStreamingPlugin({
    framework: '@unhead/vue',
    // No-op transform: per-chunk head patches are emitted by wrapStream on
    // the server. The filter/transform options are required by the factory;
    // we pass a never-matching regex so the transform hook is never invoked.
    filter: /$^/,
    transform: () => null,
    mode: options?.mode,
  })
}

export default unheadVuePlugin
