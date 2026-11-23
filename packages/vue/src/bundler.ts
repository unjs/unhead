import type { UnheadFrameworkOptions } from '@unhead/bundler/framework'
import type { UnheadVueStreamingOptions } from './stream/plugin'
import { createFrameworkPlugin } from '@unhead/bundler/framework'
import { lazyHeadSwitch } from './lazyHeadSwitch'
import { unheadVueStreamingPlugin } from './stream/plugin'

export interface UnheadVueOptions extends UnheadFrameworkOptions<UnheadVueStreamingOptions> {
  /** Defer the normal client head in Vite production builds. */
  lazyHead?: boolean
}

/**
 * Unified bundler plugin factory for `@unhead/vue`. Returns an object with
 * per-bundler dispatch methods (`vite`, `webpack`, `rspack`, `rollup`) so a
 * single call site covers every supported builder.
 *
 * @example
 * ```ts
 * // vite:
 * import { Unhead } from '@unhead/vue/bundler'
 * export default defineConfig({ plugins: [...Unhead({ streaming: true }).vite()] })
 *
 * // nuxt kit:
 * addBuildPlugin(Unhead({ streaming: true }))
 * ```
 */
const createBundler = /* @__PURE__ */ createFrameworkPlugin<UnheadVueStreamingOptions>({
  framework: '@unhead/vue',
  streamingPlugin: unheadVueStreamingPlugin,
})

export function Unhead({ lazyHead, ...options }: UnheadVueOptions = {}) {
  const bundler = createBundler(options)
  if (!lazyHead)
    return bundler
  return {
    ...bundler,
    vite() {
      // The SSR renderer already emits the patch queue. Only eager streaming
      // needs the separate executable bootstrap.
      const plugins = bundler.vite()
      for (const plugin of plugins) {
        if (plugin.name === '@unhead/vue:streaming') {
          const apply = typeof plugin.apply === 'function' ? plugin.apply : undefined
          plugin.apply = (config, env) => env.command === 'serve' && (apply?.(config, env) ?? true)
        }
      }
      return [...plugins, lazyHeadSwitch()]
    },
  }
}
