import type { Plugin } from 'vite'
import type { InternalFrameworkContext, VitePluginOptions } from './types'
import { unheadDevtools } from '../devtools/vite'
import { CompileTransform, resolveCompileOptions } from './CompileTransform'
import { CreateHeadTransform, createHeadTransformContext } from './CreateHeadTransform'
import { MinifyTransform, resolveMinifyTransformOptions } from './MinifyTransform'
import { SSRStaticReplace } from './SSRStaticReplace'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { InternalFrameworkContext, VitePluginOptions }

/**
 * Vite plugin factory that composes the core Unhead build-time transforms
 * (tree-shake, seo-meta, inline-script transform, minify, SSR static replace,
 * devtools).
 *
 * Framework packages (e.g. `@unhead/vue/vite`) should not call this directly;
 * use the `createFrameworkVitePlugin` helper in `./framework` which threads
 * `_framework` correctly without exposing it on public options.
 */
export function Unhead(options: VitePluginOptions = {}, internal: InternalFrameworkContext = {}): Plugin[] {
  const plugins: Plugin[] = []
  const ctx = createHeadTransformContext()
  const framework = internal.framework ?? options._framework

  if (options.treeshake !== false) {
    const treeshakeOpts = typeof options.treeshake === 'object' ? options.treeshake : {}
    plugins.push(TreeshakeServerComposables.vite({ filter: options.filter, sourcemap: options.sourcemap, ...treeshakeOpts }))
  }
  const seoMetaOpts = typeof options.transformSeoMeta === 'object' ? options.transformSeoMeta : {}
  const seoMeta = options.transformSeoMeta !== false && UseSeoMetaTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...seoMetaOpts })
  const compileOpts = resolveCompileOptions(options.compile, framework)
  // Compile runs after it, so a call it rewrites compiles as the `useHead` call that a build
  // without compile renders, in its tag order. Compile takes the calls it leaves.
  if (seoMeta)
    plugins.push(seoMeta)
  const minifyTransformOptions = resolveMinifyTransformOptions(options)
  if (minifyTransformOptions) {
    plugins.push(MinifyTransform.vite({
      filter: options.filter,
      sourcemap: options.sourcemap,
      ...minifyTransformOptions,
    }))
  }
  // Compile reads the minified inline content
  if (compileOpts)
    plugins.push(CompileTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, importPaths: seoMetaOpts.importPaths, ...compileOpts }))

  // Register runtime plugins into the shared context
  if (options.validate !== false) {
    const pluginsSource = framework ? `${framework}/plugins` : 'unhead/plugins'
    ctx.addRuntimePlugin({
      import: { name: 'ValidatePlugin', source: pluginsSource, as: '__unhead_validate' },
      client: '_h.use(__unhead_validate({ root: __ROOT__ }))',
      server: '_h.use(__unhead_validate({ root: __ROOT__ }))',
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
