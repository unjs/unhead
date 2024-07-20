import type { Plugin } from 'vite'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'
import type { UnpluginOptions } from './types'

export type { UnpluginOptions }

export default (options: UnpluginOptions = {}): Plugin[] => {
  return [
    TreeshakeServerComposables.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.treeshake }),
    UseSeoMetaTransform.vite({ filter: options.filter, sourcemap: options.sourcemap, ...options.transformSeoMeta }),
  ]
}
