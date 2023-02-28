import type { BaseTransformerTypes } from '@unhead/addons/src/unplugin/types'
import type { TreeshakeServerComposablesOptions } from './TreeshakeServerComposables'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import type { UseSeoMetaTransformOptions } from './UseSeoMetaTransform'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'
import type { Plugin } from 'vite'

export default (options: {
  treeshake?: TreeshakeServerComposablesOptions
  transformSeoMeta?: UseSeoMetaTransformOptions
} & BaseTransformerTypes = {}): Plugin[] => {
  return [
    TreeshakeServerComposables.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.treeshake || {} }),
    UseSeoMetaTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.transformSeoMeta || {} }),
  ]
}
