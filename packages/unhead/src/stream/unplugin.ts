import type { UnpluginOptions } from 'unplugin'
import type { ConfigEnv, UserConfig } from 'vite'
import { createUnplugin } from 'unplugin'

export const VIRTUAL_CLIENT_ID = 'virtual:@unhead/streaming-client'
export const VIRTUAL_IIFE_ID = 'virtual:@unhead/streaming-iife.js'
const RESOLVED_ID = `\0${VIRTUAL_CLIENT_ID}`
const RESOLVED_IIFE_ID = `\0${VIRTUAL_IIFE_ID}`
const VIRTUAL_RE = /virtual:@unhead\/streaming/
const RESOLVED_RE = /^\0virtual:@unhead\/streaming/

export interface StreamingPluginOptions {
  /** Framework package e.g. '@unhead/vue' */
  framework: string
  /** Plugin name (optional, defaults to `${framework}:streaming`) */
  name?: string
  /**
   * File extension filter for transform hook, e.g. /\.vue$/. Optional —
   * only required by frameworks whose client streaming support relies on
   * source-level AST injection (React/Solid/Svelte). Vue does not use it.
   */
  filter?: RegExp
  /** Transform handler called for files matching `filter`. */
  transform?: (code: string, id: string, options?: { ssr?: boolean }) => { code: string, map?: any } | null | undefined | void
  /**
   * How to load the streaming client (vite-only, ignored on webpack/rspack/rollup where
   * index.html injection isn't available — frameworks inject the iife themselves in SSR).
   * - 'async': Load as async script (non-blocking, may have brief queue delay)
   * - 'inline': Inline the IIFE directly in HTML (larger HTML, but immediate execution)
   * - 'module': Use ES module import (original behavior, waits for bundle)
   * @default 'async'
   */
  mode?: 'async' | 'inline' | 'module'
}

// IIFE code is loaded once per process (module-level cache across plugin instances).
let iifeCode: string | undefined
let iifeCodeLoading: Promise<void> | undefined

async function loadIifeCode(): Promise<void> {
  if (iifeCode)
    return
  iifeCodeLoading ||= import('unhead/stream/iife').then((mod) => {
    iifeCode = mod.streamingIifeCode
  })
  await iifeCodeLoading
}

/**
 * Builds the bundler-agnostic unplugin hook set for the streaming plugin. Exposed so
 * framework wrappers (e.g. `@unhead/vue/vite`, `@unhead/vue/webpack`) can
 * bake in their own `framework`, `filter`, and `transform` while still using this factory
 * to produce hooks that work across vite/webpack/rspack/rollup/esbuild via `createUnplugin`.
 *
 * SSR detection is bundler-specific:
 * - vite build: `config.env.isSsrBuild`
 * - vite dev (v6+ environments): `this.environment.name === 'ssr'` per-transform
 * - webpack/rspack: `compiler.options.name === 'server'`
 */
export function buildStreamingPluginOptions(options: StreamingPluginOptions): UnpluginOptions {
  const { framework, name, mode = 'async' } = options
  let ssr = false

  return {
    name: name ?? `${framework}:streaming`,
    enforce: 'pre',

    async buildStart() {
      await loadIifeCode()
    },

    resolveId: {
      filter: { id: VIRTUAL_RE },
      handler(id) {
        if (id === VIRTUAL_CLIENT_ID || id === `/${VIRTUAL_CLIENT_ID}`)
          return RESOLVED_ID
        if (id === VIRTUAL_IIFE_ID || id === `/${VIRTUAL_IIFE_ID}`)
          return RESOLVED_IIFE_ID
      },
    },

    load: {
      filter: { id: RESOLVED_RE },
      handler(id) {
        if (id === RESOLVED_ID) {
          if (ssr)
            return { code: 'export {}' }
          return {
            code: `import{createHead}from'${framework}/client'
const s=window.__unhead__;if(s){const q=s._q;s._q=[];const h=createHead({document});q.forEach(e=>h.push(e));s.push=e=>h.push(e);s._head=h}`,
          }
        }
        if (id === RESOLVED_IIFE_ID) {
          if (ssr)
            return { code: '' }
          if (!iifeCode)
            throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
          return { code: iifeCode }
        }
      },
    },

    ...(options.transform && options.filter
      ? {
          transform: {
            filter: { id: options.filter },
            handler(this: any, code: string, id: string, opts?: { ssr?: boolean }) {
              // Vite v6+ dev mode exposes environment per-transform call (one plugin
              // instance, two environments). Fall back to the options.ssr flag
              // (vite <=5 and tests), then the bundler-hook closure for
              // vite build (separate instances per build) and webpack/rspack.
              const envName = this?.environment?.name
              const isSSR = envName === 'ssr' || envName === 'server' || opts?.ssr === true || ssr
              return options.transform!(code, id, { ssr: isSSR })
            },
          },
        }
      : {}),

    webpack(compiler) {
      if (compiler.options.name === 'server')
        ssr = true
    },

    rspack(compiler) {
      if (compiler.options.name === 'server')
        ssr = true
    },

    vite: {
      apply(_config: UserConfig, env: ConfigEnv): boolean {
        if (env.isSsrBuild)
          ssr = true
        return true
      },
      transformIndexHtml() {
        if (mode === 'inline') {
          if (!iifeCode)
            throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
          return [{
            tag: 'script',
            children: iifeCode,
            injectTo: 'head-prepend',
          }]
        }

        if (mode === 'async') {
          return [{
            tag: 'script',
            attrs: { async: true, src: `/${VIRTUAL_IIFE_ID}` },
            injectTo: 'head-prepend',
          }]
        }

        return [{
          tag: 'script',
          children: `import("/${VIRTUAL_CLIENT_ID}")`,
          injectTo: 'head-prepend',
        }]
      },
    },
  }
}

/**
 * Internal cross-bundler unplugin factory. Framework wrappers pick a single bundler's
 * output (`.vite`, `.webpack`, `.rspack`, etc.) to expose via their own subpath export.
 *
 * Consumers should prefer the bundler-specific framework subpaths (e.g. `@unhead/vue/vite`)
 * rather than importing this directly.
 */
export const createStreamingPlugin = createUnplugin<StreamingPluginOptions>(buildStreamingPluginOptions)
