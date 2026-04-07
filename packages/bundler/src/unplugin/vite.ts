import type { Plugin } from 'vite'
import type { UnpluginOptions } from './types'
import { MinifyTransform } from './MinifyTransform'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

export default (options: UnpluginOptions = {}): Plugin[] => {
  const plugins: Plugin[] = []
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
  return plugins
}
