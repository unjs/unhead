import type { Plugin } from 'vite'
import type { InternalFrameworkContext, VitePluginOptions } from './types'
import { unheadDevtools } from '../devtools/vite'
import { CreateHeadTransform, createHeadTransformContext } from './CreateHeadTransform'
import { UnheadTransforms } from './createTransformPipeline'
import { SSRStaticReplace } from './SSRStaticReplace'

export type { VitePluginOptions }

/**
 * Vite plugin factory that composes the core Unhead build-time transforms
 * (tree-shake, seo-meta, minify, SSR static replace, devtools).
 *
 * Framework packages (e.g. `@unhead/vue/vite`) should not call this directly;
 * use the `createFrameworkVitePlugin` helper in `./framework` which threads
 * `_framework` correctly without exposing it on public options.
 */
export function Unhead(options: VitePluginOptions = {}, internal: InternalFrameworkContext = {}): Plugin[] {
  const plugins: Plugin[] = []
  const ctx = createHeadTransformContext()
  const framework = internal.framework ?? options._framework

  const common = { filter: options.filter, sourcemap: options.sourcemap }
  const treeshake = options.treeshake !== false
    && { ...common, ...(typeof options.treeshake === 'object' ? options.treeshake : {}) }
  const seoMeta = options.transformSeoMeta !== false
    && { ...common, ...(typeof options.transformSeoMeta === 'object' ? options.transformSeoMeta : {}) }
  const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
  const minify = options.minify !== false && !!(minifyOpts.js || minifyOpts.css)
    && { ...common, ...minifyOpts }
  if (treeshake || seoMeta || minify) {
    // Single-parse pipeline for the treeshake, seoMeta and minify concerns.
    plugins.push(UnheadTransforms.vite({ treeshake, seoMeta, minify }))
  }

  // Register runtime plugins into the shared context
  if (options.validate !== false) {
    const pluginsSource = framework ? `${framework}/plugins` : 'unhead/plugins'
    ctx.addRuntimePlugin({
      import: { name: 'ValidatePlugin', source: pluginsSource, as: '__unhead_validate' },
      client: '_h.use(__unhead_validate({ root: __ROOT__ }))',
    })
  }

  // Devtools registers its own runtime plugins via ctx during configResolved
  if (options.devtools !== false) {
    const devtoolsOpts = typeof options.devtools === 'object' ? options.devtools : {}
    plugins.push(unheadDevtools({ ...devtoolsOpts, _ctx: ctx }))
  }

  // Replace head.ssr with static boolean for tree-shaking
  plugins.push(SSRStaticReplace.vite({}))

  // Single transform handles all createHead() wrapping
  plugins.push(CreateHeadTransform(ctx))

  return plugins
}
