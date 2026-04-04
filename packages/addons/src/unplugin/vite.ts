import type { Plugin } from 'vite'
import type { UnpluginOptions } from './types'
import { MinifyTransform } from './MinifyTransform'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

export default (options: UnpluginOptions = {}): Plugin[] => {
  const plugins: Plugin[] = [
    TreeshakeServerComposables.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.treeshake }),
    UseSeoMetaTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.transformSeoMeta }),
  ]
  if (options.minify !== false) {
    const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
    if (minifyOpts.jsMinifier || minifyOpts.cssMinifier) {
      plugins.push(MinifyTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...minifyOpts }))
    }
  }
  return plugins
}
