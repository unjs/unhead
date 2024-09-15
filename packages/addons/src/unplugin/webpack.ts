import type { UnpluginOptions } from './types'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

export default (options: UnpluginOptions = {}) => {
  return [
    TreeshakeServerComposables.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...options.treeshake || {} }),
    UseSeoMetaTransform.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...options.transformSeoMeta || {} }),
  ]
}
