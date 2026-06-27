import type { Plugin } from 'vite'
import type { HeadTransformContext } from '../unplugin/CreateHeadTransform'
import type { UnheadDevtoolsOptions } from '../unplugin/types'

const HEAD_COMPOSABLE_RE = /\b(?:useHead|useSeoMeta|useHeadSafe|useScript)\b/
const FILE_RE = /\.(vue|tsx?|jsx?|svelte)$/

interface LazyUnheadDevtoolsOptions extends UnheadDevtoolsOptions {
  _ctx?: HeadTransformContext
}

type Hook = ((...args: any[]) => any) | { handler: (...args: any[]) => any }

interface LazyDevtoolsPlugin extends Plugin {
  devtools: {
    setup: (ctx: unknown) => void | Promise<void>
  }
}

function getHookHandler(hook: Hook | undefined): ((...args: any[]) => any) | undefined {
  if (!hook)
    return
  return typeof hook === 'function' ? hook : hook.handler
}

function isViteDevtoolsPlugin(plugin: { name?: string }): boolean {
  return !!plugin.name?.startsWith('vite:devtools')
}

function isViteDevtoolsEnabled(config: { devtools?: { enabled?: boolean }, plugins: readonly { name?: string }[] }): boolean {
  return config.devtools?.enabled === true || config.plugins.some(isViteDevtoolsPlugin)
}

/**
 * Lightweight proxy for the Vite-only devtools plugin. Framework bundler
 * entries are shared by webpack/rspack/rollup, so keep the devtools
 * implementation and its RPC/@vitejs/devtools-kit imports behind Vite
 * devtools hooks.
 */
export function lazyUnheadDevtools(options?: LazyUnheadDevtoolsOptions): Plugin {
  let enabled = false
  let plugin: Plugin | undefined
  let pluginPromise: Promise<Plugin> | undefined
  // configResolved runs once and early; cache it so a late devtools.setup() (which enables
  // devtools after configResolved already returned without forwarding) can replay it to the
  // real plugin, initializing its root/bridgeCode/unheadVersion/_ctx before load/transform run
  let resolvedConfig: any
  let configForwarded = false

  async function resolvePlugin(): Promise<Plugin> {
    if (plugin)
      return plugin
    pluginPromise ||= import('./vite').then((mod) => {
      plugin = mod.unheadDevtools(options)
      return plugin
    })
    return pluginPromise
  }

  async function callHook(name: keyof Plugin, thisArg: unknown, args: any[]): Promise<any> {
    const resolved = await resolvePlugin()
    const hook = resolved[name] as Hook | undefined
    return getHookHandler(hook)?.apply(thisArg, args)
  }

  async function callEnabledHook(name: keyof Plugin, thisArg: unknown, args: any[]): Promise<any> {
    if (!enabled)
      return
    return callHook(name, thisArg, args)
  }

  const lazyPlugin: LazyDevtoolsPlugin = {
    name: '@unhead/devtools',
    apply: 'serve',

    async configResolved(config) {
      resolvedConfig = config
      enabled = isViteDevtoolsEnabled(config)
      if (!enabled)
        return
      configForwarded = true
      return callHook('configResolved', this, [config])
    },

    async configureServer(server) {
      return callEnabledHook('configureServer', this, [server])
    },

    async resolveId(source, importer, options) {
      return callEnabledHook('resolveId', this, [source, importer, options])
    },

    async load(id, options) {
      return callEnabledHook('load', this, [id, options])
    },

    transform: {
      filter: { id: FILE_RE, code: HEAD_COMPOSABLE_RE },
      async handler(code, id, options) {
        return callEnabledHook('transform', this, [code, id, options])
      },
    },

    transformIndexHtml: {
      order: 'pre',
      async handler(...args: any[]) {
        return callEnabledHook('transformIndexHtml', this, args)
      },
    },

    devtools: {
      async setup(ctx) {
        enabled = true
        const resolved = await resolvePlugin() as LazyDevtoolsPlugin
        // if configResolved already ran while devtools looked disabled, the real plugin never
        // received it; replay the cached config first so its state is initialized before setup
        if (!configForwarded && resolvedConfig) {
          configForwarded = true
          await callHook('configResolved', this, [resolvedConfig])
        }
        await resolved.devtools?.setup?.(ctx)
      },
    },
  }

  return lazyPlugin
}
