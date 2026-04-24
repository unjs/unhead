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
}

/**
 * Shape returned by the unified framework factory. Mirrors the subset of
 * `UnpluginInstance` methods that Nuxt's `addBuildPlugin` consumes, so a
 * call site can forward the factory object directly.
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
    const minifyOpts = typeof options.minify === 'object' ? options.minify : {}
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
        if (wantStreaming) {
          plugins.push(streamingPlugin.vite(streamOpts) as unknown as VitePlugin)
        }
        return plugins
      },
      webpack: () => {
        const plugins = dispatch('webpack', defs)
        plugins.push(SSRStaticReplace.webpack({}))
        if (wantStreaming)
          plugins.push(streamingPlugin.webpack(streamOpts))
        return plugins
      },
      rspack: () => {
        const plugins = dispatch('rspack', defs)
        plugins.push(SSRStaticReplace.rspack({}))
        if (wantStreaming)
          plugins.push(streamingPlugin.rspack(streamOpts))
        return plugins
      },
      rollup: () => {
        const plugins = dispatch('rollup', defs)
        plugins.push(SSRStaticReplace.rollup({}))
        if (wantStreaming)
          plugins.push(streamingPlugin.rollup(streamOpts) as any)
        return plugins
      },
    }
  }
}
