import type { UnpluginInstance } from 'unplugin'
import type { Plugin as VitePlugin } from 'vite'
import type { UnpluginOptions, VitePluginOptions } from './types'
import { Unhead as baseVite } from './vite'
import { Unhead as baseWebpack } from './webpack'

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

export interface UnheadFrameworkViteOptions<S> extends VitePluginOptions {
  /** Enable streaming SSR support. */
  streaming?: true | S | false
}

export interface UnheadFrameworkUnpluginOptions<S> extends UnpluginOptions {
  /** Enable streaming SSR support. */
  streaming?: true | S | false
}

function resolveStreamingOpts<S>(streaming: true | S | undefined): S | undefined {
  return streaming && typeof streaming === 'object' ? streaming as S : undefined
}

export function createFrameworkVitePlugin<S>({ framework, streamingPlugin }: FrameworkPluginConfig<S>) {
  return (options: UnheadFrameworkViteOptions<S> = {}): VitePlugin[] => {
    const { streaming, ...rest } = options
    const plugins: VitePlugin[] = [...baseVite(rest, { framework })]
    if (streaming) {
      plugins.push(streamingPlugin.vite(resolveStreamingOpts(streaming)) as unknown as VitePlugin)
    }
    return plugins
  }
}

export function createFrameworkWebpackPlugin<S>({ streamingPlugin }: FrameworkPluginConfig<S>) {
  return (options: UnheadFrameworkUnpluginOptions<S> = {}): any[] => {
    const { streaming, ...rest } = options
    const plugins: any[] = [...baseWebpack(rest)]
    if (streaming) {
      plugins.push(streamingPlugin.webpack(resolveStreamingOpts(streaming)))
    }
    return plugins
  }
}
