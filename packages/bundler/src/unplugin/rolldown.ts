import type { UnpluginOptions } from './types'
import { MinifyTransform } from './MinifyTransform'
import { SSRStaticReplace } from './SSRStaticReplace'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

/**
 * Rolldown plugin set. Mirrors the rollup entry; Rolldown reuses the rollup
 * plugin API surface via unplugin's rollup adapter until unplugin ships a
 * dedicated rolldown builder.
 */
export function Unhead(options: UnpluginOptions = {}): any[] {
  const plugins: any[] = []
  if (options.treeshake !== false) {
    const treeshakeOpts = typeof options.treeshake === 'object' ? options.treeshake : {}
    plugins.push(TreeshakeServerComposables.rollup({ filter: options.filter, sourcemap: options.sourcemap, ...treeshakeOpts }))
  }
  if (options.transformSeoMeta !== false) {
    const seoMetaOpts = typeof options.transformSeoMeta === 'object' ? options.transformSeoMeta : {}
    plugins.push(UseSeoMetaTransform.rollup({ filter: options.filter, sourcemap: options.sourcemap, ...seoMetaOpts }))
  }
  if (options.minify !== false) {
    const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
    if (minifyOpts.js || minifyOpts.css) {
      plugins.push(MinifyTransform.rollup({ filter: options.filter, sourcemap: options.sourcemap, ...minifyOpts }))
    }
  }
  plugins.push(SSRStaticReplace.rollup({}))
  return plugins
}
