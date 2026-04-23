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

  // Shared SSR detection used by both load and transform hooks. Vite v6+
  // dev mode has per-environment contexts where the `opts.ssr` flag on each
  // call is authoritative; fall back to the bundler-hook closure set by
  // webpack/rspack/vite.apply for non-dev builds.
  function isSSRCall(hookThis: any, opts?: { ssr?: boolean }): boolean {
    const envName = hookThis?.environment?.name
    return envName === 'ssr' || envName === 'server' || opts?.ssr === true || ssr
  }

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
      handler(this: any, id: string, opts?: { ssr?: boolean }) {
        const isSSR = isSSRCall(this, opts)
        if (id === RESOLVED_ID) {
          if (isSSR)
            return { code: 'export {}' }
          return {
            code: `import{createHead}from'${framework}/client'
const s=window.__unhead__;if(s){const q=s._q;s._q=[];const h=createHead({document});q.forEach(e=>h.push(e));s.push=e=>h.push(e);s._head=h}`,
          }
        }
        if (id === RESOLVED_IIFE_ID) {
          if (isSSR)
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
              return options.transform!(code, id, { ssr: isSSRCall(this, opts) })
            },
          },
        }
      : {}),

    webpack(compiler) {
      // `name === 'server'` is convention but not universal; webpack SSR
      // configs typically set `target: 'node'` / `'async-node'` too.
      const { name: n, target } = compiler.options
      if (n === 'server' || target === 'node' || target === 'async-node')
        ssr = true
    },

    rspack(compiler) {
      const { name: n, target } = compiler.options
      if (n === 'server' || target === 'node' || target === 'async-node')
        ssr = true
    },

    vite: {
      apply(_config: UserConfig, env: ConfigEnv): boolean {
        if (env.isSsrBuild)
          ssr = true
        return true
      },
      transformIndexHtml: {
        // `order: 'pre'` is separate from the plugin-level `enforce: 'pre'`:
        // it runs this HTML transform before other non-pre HTML transforms
        // so the virtual module `<script>` tags we inject go through the
        // full Vite plugin pipeline (resolveId/load) and aren't stripped or
        // rewritten by downstream HTML transforms.
        order: 'pre',
        handler() {
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
