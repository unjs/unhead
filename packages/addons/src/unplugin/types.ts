import type { TreeshakeServerComposablesOptions } from './TreeshakeServerComposables'
import type { UseSeoMetaTransformOptions } from './UseSeoMetaTransform'

export interface BaseTransformerTypes {
  sourcemap?: boolean
  filter?: {
    exclude?: RegExp[]
    include?: RegExp[]
  }
}

export interface UnpluginOptions extends BaseTransformerTypes {
  treeshake?: TreeshakeServerComposablesOptions
  transformSeoMeta?: UseSeoMetaTransformOptions
}
