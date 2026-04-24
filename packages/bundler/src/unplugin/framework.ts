import type { UnpluginInstance } from 'unplugin'
import type { Plugin as VitePlugin } from 'vite'
import type { UnpluginOptions, VitePluginOptions } from './types'
import { unheadDevtools } from '../devtools/vite'
import { CreateHeadTransform, createHeadTransformContext } from './CreateHeadTransform'
import { MinifyTransform } from './MinifyTransform'
import { SSRStaticReplace } from './SSRStaticReplace'
import { TreeshakeServerComposables } from './TreeshakeServerComposables'
import { UseSeoMetaTransform } from './UseSeoMetaTransform'

/**
 * Per-framework factory config. `framework` is the package name (e.g.
 * `@unhead/vue`) used internally by the base bundler to import runtime
 * plugins from the right path; `streamingPlugin` is the framework's
 * streaming unplugin instance (as returned by `createUnplugin`).
 */
export interface FrameworkPluginConfig<S> {
  framework: string
  streamingPlugin: UnpluginInstance<S | undefined, boolean>
}

export interface UnheadFrameworkOptions<S> extends VitePluginOptions {
  /** Enable streaming SSR support. */
  streaming?: true | S | false
  /**
   * Inject the runtime `ValidatePlugin`. **Vite-only**: ignored by `.webpack()`,
   * `.rspack()`, and `.rollup()` because injection happens via the Vite
   * `CreateHeadTransform` plugin, which has no equivalent on other bundlers.
   */
  validate?: VitePluginOptions['validate']
  /**
   * Enable the Vite Devtools integration. **Vite-only**: ignored by `.webpack()`,
   * `.rspack()`, and `.rollup()` since `unheadDevtools` depends on
   * `@vitejs/devtools-kit`.
   */
  devtools?: VitePluginOptions['devtools']
}

/**
 * Shape returned by the unified framework factory. Mirrors the subset of
 * `UnpluginInstance` methods that Nuxt's `addBuildPlugin` consumes, so a
 * call site can forward the factory object directly.
 *
 * Note: `rollup()` is provided for completeness (e.g. SSG static builds)
 * but does **not** detect SSR context. `SSRStaticReplace` always sees
 * `ssr=false` here because rollup has no equivalent of vite's
 * `env.isSsrBuild` or webpack's `compiler.options.name === 'server'` hook;
 * `head.ssr` references will always be statically rewritten to `false`.
 * Use `.vite()` or `.webpack()` for SSR builds.
 */
export interface UnheadBundlerFactory {
  vite: () => VitePlugin[]
  webpack: () => any[]
  rspack: () => any[]
  rollup: () => any[]
}

interface CoreDef { instance: UnpluginInstance<any, false>, options: any }

function resolveCoreDefs(options: UnpluginOptions): CoreDef[] {
  const defs: CoreDef[] = []
  const common = { filter: options.filter, sourcemap: options.sourcemap }

  if (options.treeshake !== false) {
    const treeshakeOpts = typeof options.treeshake === 'object' ? options.treeshake : {}
    defs.push({ instance: TreeshakeServerComposables, options: { ...common, ...treeshakeOpts } })
  }
  if (options.transformSeoMeta !== false) {
    const seoMetaOpts = typeof options.transformSeoMeta === 'object' ? options.transformSeoMeta : {}
    defs.push({ instance: UseSeoMetaTransform, options: { ...common, ...seoMetaOpts } })
  }
  if (options.minify !== false) {
    const minifyOpts = typeof options.minify === 'object'
      ? options.minify
      : options.minify === true
        ? { js: true, css: true }
        : {}
    if (minifyOpts.js || minifyOpts.css) {
      defs.push({ instance: MinifyTransform, options: { ...common, ...minifyOpts } })
    }
  }

  return defs
}

function dispatch(bundler: 'vite' | 'webpack' | 'rspack' | 'rollup', defs: CoreDef[]): any[] {
  const out: any[] = []
  for (const { instance, options } of defs) {
    const plugin = (instance[bundler] as (opts: any) => any)(options)
    if (Array.isArray(plugin))
      out.push(...plugin)
    else out.push(plugin)
  }
  return out
}

function resolveStreamingOpts<S>(streaming: true | S | false | undefined): S | undefined {
  return streaming && typeof streaming === 'object' ? streaming as S : undefined
}

/**
 * Push a plugin (or array of plugins) onto an output array, flattening one
 * level. Mirrors the dispatch helper's array handling so streaming plugins
 * created with `Nested=true` don't leak nested arrays into the output.
 */
function pushPlugin<T>(out: T[], value: T | T[]): void {
  if (Array.isArray(value))
    out.push(...value)
  else out.push(value)
}

/**
 * Unified framework factory. Returns an object with per-bundler dispatch
 * methods so consumers (e.g. Nuxt's `addBuildPlugin`) can forward it
 * directly without per-bundler imports.
 *
 * @example
 * ```ts
 * // framework-side:
 * export const Unhead = createFrameworkPlugin({
 *   framework: '@unhead/vue',
 *   streamingPlugin: unheadVueStreamingPlugin,
 * })
 *
 * // consumer-side (vite):
 * plugins: [...Unhead({ streaming: true }).vite()]
 *
 * // consumer-side (nuxt kit):
 * addBuildPlugin(Unhead({ streaming: true }))
 * ```
 */
export function createFrameworkPlugin<S>({ framework, streamingPlugin }: FrameworkPluginConfig<S>) {
  return (options: UnheadFrameworkOptions<S> = {}): UnheadBundlerFactory => {
    const { streaming, validate, devtools, ...coreOpts } = options
    const defs = resolveCoreDefs(coreOpts)
    const streamOpts = resolveStreamingOpts(streaming)
    const wantStreaming = !!streaming

    return {
      vite: () => {
        const plugins: VitePlugin[] = dispatch('vite', defs)
        const ctx = createHeadTransformContext()

        if (validate !== false) {
          ctx.addRuntimePlugin({
            import: { name: 'ValidatePlugin', source: `${framework}/plugins`, as: '__unhead_validate' },
            client: '_h.use(__unhead_validate({ root: __ROOT__ }))',
          })
        }
        if (devtools !== false) {
          const devtoolsOpts = typeof devtools === 'object' ? devtools : {}
          plugins.push(unheadDevtools({ ...devtoolsOpts, _ctx: ctx }))
        }
        plugins.push(SSRStaticReplace.vite({}))
        plugins.push(CreateHeadTransform(ctx))
        if (wantStreaming)
          pushPlugin(plugins, streamingPlugin.vite(streamOpts) as unknown as VitePlugin | VitePlugin[])
        return plugins
      },
      webpack: () => {
        const plugins = dispatch('webpack', defs)
        plugins.push(SSRStaticReplace.webpack({}))
        if (wantStreaming)
          pushPlugin(plugins, streamingPlugin.webpack(streamOpts))
        return plugins
      },
      rspack: () => {
        const plugins = dispatch('rspack', defs)
        plugins.push(SSRStaticReplace.rspack({}))
        if (wantStreaming)
          pushPlugin(plugins, streamingPlugin.rspack(streamOpts))
        return plugins
      },
      rollup: () => {
        const plugins = dispatch('rollup', defs)
        plugins.push(SSRStaticReplace.rollup({}))
        if (wantStreaming)
          pushPlugin(plugins, streamingPlugin.rollup(streamOpts) as any)
        return plugins
      },
    }
  }
}
