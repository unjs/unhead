import type { InlineScriptTransformOptions, MinifyTransformOptions } from './MinifyTransform'
import type { TreeshakeServerComposablesOptions } from './TreeshakeServerComposables'
import type { UseSeoMetaTransformOptions } from './UseSeoMetaTransform'
import type { V4PlanTransformOptions } from './V4PlanTransform'

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
  /**
   * Transpile static inline scripts to the bundler's browser target.
   *
   * Enabled by default for Vite, where the resolved `build.target` is
   * inherited automatically. Set to `false` to opt out or provide an object
   * to override the target.
   */
  transformInlineScripts?: InlineScriptTransformOptions | false
  experimental?: {
    /**
     * Compile static v4 Vue `useHead` objects to sealed plan tuples.
     *
     * This is an explicit compiled-profile contract. Revived plans contain
     * final HTML, so entry/tags/resolve plugins that expect loose props, such
     * as CanonicalPlugin and InferSeoMetaPlugin, cannot inspect or rewrite
     * them. Finalize those transformations before emission or use only
     * plugins that are plan-aware. Server only unless `client: true`.
     */
    v4Plans?: false | (V4PlanTransformOptions & { profile: 'compiled' })
  }
}

export interface VitePluginOptions extends UnpluginOptions {
  /** Vite DevTools integration (dev-only). Enabled by default, set `false` to disable. */
  devtools?: UnheadDevtoolsOptions | false
  /** Inject ValidatePlugin in dev to surface head tag warnings in the console. Enabled by default, set `false` to disable. */
  validate?: boolean
  /**
   * @internal
   * @deprecated Pass via the `internal` second argument of `Unhead()` instead.
   * Retained as a passthrough so existing framework wrappers keep working.
   */
  _framework?: string
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
