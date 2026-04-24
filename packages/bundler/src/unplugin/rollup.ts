import type { Plugin } from 'rollup'
import type { UnpluginOptions } from './types'
import { MinifyTransform } from './MinifyTransform'
import { SSRStaticReplace } from './SSRStaticReplace'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

export function Unhead(options: UnpluginOptions = {}): Plugin[] {
  const plugins: Plugin[] = []
  if (options.treeshake !== false) {
    const treeshakeOpts = typeof options.treeshake === 'object' ? options.treeshake : {}
    plugins.push(TreeshakeServerComposables.rollup({ filter: options.filter, sourcemap: options.sourcemap, ...treeshakeOpts }) as Plugin)
  }
  if (options.transformSeoMeta !== false) {
    const seoMetaOpts = typeof options.transformSeoMeta === 'object' ? options.transformSeoMeta : {}
    plugins.push(UseSeoMetaTransform.rollup({ filter: options.filter, sourcemap: options.sourcemap, ...seoMetaOpts }) as Plugin)
  }
  if (options.minify !== false) {
    const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
    if (minifyOpts.js || minifyOpts.css) {
      plugins.push(MinifyTransform.rollup({ filter: options.filter, sourcemap: options.sourcemap, ...minifyOpts }) as Plugin)
    }
  }
  plugins.push(SSRStaticReplace.rollup({}) as Plugin)
  return plugins
}
