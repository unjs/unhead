import type { BaseTransformerTypes } from '@unhead/addons/src/unplugin/types'
import type { TreeshakeServerComposablesOptions } from './TreeshakeServerComposables'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import type { UseSeoMetaTransformOptions } from './UseSeoMetaTransform'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export default (options: {
  treeshake?: TreeshakeServerComposablesOptions
  transformSeoMeta?: UseSeoMetaTransformOptions
} & BaseTransformerTypes = {}) => {
  return [
    TreeshakeServerComposables.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...options.treeshake || {} }),
    UseSeoMetaTransform.webpack({ filter: options.filter, sourcemap: options.sourcemap, ...options.transformSeoMeta || {} }),
  ]
}
