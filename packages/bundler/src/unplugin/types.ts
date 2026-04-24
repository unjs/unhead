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
  /** Vite DevTools integration (dev-only). Enabled by default, set `false` to disable. */
  devtools?: UnheadDevtoolsOptions | false
  /** Inject ValidatePlugin in dev to surface head tag warnings in the console. Enabled by default, set `false` to disable. */
  validate?: boolean
}

/**
 * Internal extension carrying the framework package name (e.g. `@unhead/vue`)
 * so the base bundler factory can import runtime plugins from the right path.
 * Never exposed on public option types; framework wrappers pass this via
 * the factory helpers in `./framework`.
 *
 * @internal
 */
export interface InternalFrameworkContext {
  framework?: string
}

export interface UnheadDevtoolsOptions {}
