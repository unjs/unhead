import type { InlineScriptTransformOptions, MinifyTransformOptions } from './MinifyTransform'
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
  /**
   * Transpile static inline scripts to the bundler's browser target.
   *
   * Enabled by default for Vite, where the resolved `build.target` is
   * inherited automatically. Set to `false` to opt out or provide an object
   * to override the target.
   */
  transformInlineScripts?: InlineScriptTransformOptions | false
  /**
   * Compile static `useHead` and `useSeoMeta` calls of `@unhead/vue` to compiled tags in
   * server and client builds. A call that cannot compile stays as written. The
   * server head must come from `@unhead/vue/compiled/server`, and the client head
   * from `createLazyHead` of `@unhead/vue/lazy`. The dev server does not
   * compile.
   *
   * Applies to the `@unhead/vue` bundler plugin only. Off by default.
   *
   * Pass `{ debug: true }` to compile and keep the debug signals. Then a lazy head sets
   * `head._fullRuntimeReason` when it loads the full runtime. Without `debug`, the
   * build drops that code.
   *
   * @experimental
   */
  compile?: boolean | CompileOptions
}

export interface CompileOptions {
  /**
   * Keep the debug signals of compiler mode in the build, such as
   * `head._fullRuntimeReason`. Off by default, so they cost no bytes.
   */
  debug?: boolean
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
