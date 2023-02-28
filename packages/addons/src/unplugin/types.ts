import type { TreeshakeServerComposablesOptions } from '@unhead/addons/src/unplugin/TreeshakeServerComposables'
import type { UseSeoMetaTransformOptions } from '@unhead/addons/src/unplugin/UseSeoMetaTransform'

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
