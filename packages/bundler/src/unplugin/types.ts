import type { MinifyTransformOptions } from './MinifyTransform'
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
  treeshake?: TreeshakeServerComposablesOptions | false
  transformSeoMeta?: UseSeoMetaTransformOptions | false
  minify?: MinifyTransformOptions | false
}

export interface VitePluginOptions extends UnpluginOptions {
  /** Inject ValidatePlugin in dev to surface head tag warnings in the console. Enabled by default, set `false` to disable. */
  validate?: boolean
  /** @internal */
  _framework?: string
}
