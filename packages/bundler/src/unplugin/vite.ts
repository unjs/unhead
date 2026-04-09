import type { Plugin } from 'vite'
import type { VitePluginOptions } from './types'
import { CreateHeadTransform, createHeadTransformContext } from './CreateHeadTransform'
import { MinifyTransform } from './MinifyTransform'
import { SSRStaticReplace } from './SSRStaticReplace'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { VitePluginOptions }

export function Unhead(options: VitePluginOptions = {}): Plugin[] {
  const plugins: Plugin[] = []
  const ctx = createHeadTransformContext()
  const framework = options._framework

  if (options.treeshake !== false) {
    const treeshakeOpts = typeof options.treeshake === 'object' ? options.treeshake : {}
    plugins.push(TreeshakeServerComposables.vite({ filter: options.filter, sourcemap: options.sourcemap, ...treeshakeOpts }))
  }
  if (options.transformSeoMeta !== false) {
    const seoMetaOpts = typeof options.transformSeoMeta === 'object' ? options.transformSeoMeta : {}
    plugins.push(UseSeoMetaTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...seoMetaOpts }))
  }
  if (options.minify !== false) {
    const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
    if (minifyOpts.js || minifyOpts.css) {
      plugins.push(MinifyTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...minifyOpts }))
    }
  }

  // Register runtime plugins into the shared context
  if (options.validate !== false) {
    const pluginsSource = framework ? `${framework}/plugins` : 'unhead/plugins'
    ctx.addRuntimePlugin({
      import: { name: 'ValidatePlugin', source: pluginsSource, as: '__unhead_validate' },
      client: '_h.use(__unhead_validate({ root: __ROOT__ }))',
    })
  }

  // Replace head.ssr with static boolean for tree-shaking
  plugins.push(SSRStaticReplace.vite({}))

  // Single transform handles all createHead() wrapping
  plugins.push(CreateHeadTransform(ctx))

  return plugins
}
