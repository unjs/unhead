import type { Plugin } from 'vite'
import type { UnpluginOptions } from './types'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

export type { UnpluginOptions }

export default (options: UnpluginOptions = {}): Plugin[] => {
  return [
    TreeshakeServerComposables.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.treeshake }),
    UseSeoMetaTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.transformSeoMeta }),
  ]
}
