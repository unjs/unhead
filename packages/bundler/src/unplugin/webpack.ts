import type { UnpluginOptions } from './types'
import { MinifyTransform } from './MinifyTransform'
import { SSRStaticReplace } from './SSRStaticReplace'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

export function Unhead(options: UnpluginOptions = {}) {
  const plugins: any[] = []
  if (options.treeshake !== false) {
    const treeshakeOpts = typeof options.treeshake === 'object' ? options.treeshake : {}
    plugins.push(TreeshakeServerComposables.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...treeshakeOpts }))
  }
  if (options.transformSeoMeta !== false) {
    const seoMetaOpts = typeof options.transformSeoMeta === 'object' ? options.transformSeoMeta : {}
    plugins.push(UseSeoMetaTransform.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...seoMetaOpts }))
  }
  if (options.minify !== false) {
    const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
    if (minifyOpts.js || minifyOpts.css) {
      plugins.push(MinifyTransform.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...minifyOpts }))
    }
  }
  plugins.push(SSRStaticReplace.webpack({}))
  return plugins
}
