import type { UnpluginOptions } from './types'
import { MinifyTransform } from './MinifyTransform'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

export default (options: UnpluginOptions = {}) => {
  const plugins = [
    TreeshakeServerComposables.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...options.treeshake || {} }),
    UseSeoMetaTransform.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...options.transformSeoMeta || {} }),
  ]
  if (options.minify !== false) {
    const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
    if (minifyOpts.js || minifyOpts.css) {
      plugins.push(MinifyTransform.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...minifyOpts }))
    }
  }
  return plugins
}
