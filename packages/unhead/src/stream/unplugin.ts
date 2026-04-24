import type { UnpluginOptions } from 'unplugin'
import type { ConfigEnv, ResolvedConfig, UserConfig } from 'vite'
import { createUnplugin } from 'unplugin'

export const VIRTUAL_CLIENT_ID = 'virtual:@unhead/streaming-client'
export const VIRTUAL_IIFE_ID = 'virtual:@unhead/streaming-iife.js'
const RESOLVED_ID = `\0${VIRTUAL_CLIENT_ID}`
const RESOLVED_IIFE_ID = `\0${VIRTUAL_IIFE_ID}`
const VIRTUAL_RE = /virtual:@unhead\/streaming/
const RESOLVED_RE = /^\0virtual:@unhead\/streaming/

export type Nonce = string | (() => string | undefined)

export interface StreamingPluginOptions {
  /** Framework package e.g. '@unhead/vue' */
  framework: string
  /** Plugin name (optional, defaults to `${framework}:streaming`) */
  name?: string
  /**
   * File extension filter for transform hook, e.g. /\.vue$/. Optional;
   * only required by frameworks whose client streaming support relies on
   * source-level AST injection (React/Solid/Svelte). Vue does not use it.
   */
  filter?: RegExp
  /** Transform handler called for files matching `filter`. */
  transform?: (code: string, id: string, options?: { ssr?: boolean }) => { code: string, map?: any } | null | undefined | void
  /**
   * How to load the streaming client (vite-only, ignored on webpack/rspack/rollup where
   * index.html injection isn't available; frameworks inject the iife themselves in SSR).
   * - 'async' (default): Non-blocking external script. In dev served from a virtual
   *   module; in production emitted as a real asset chunk via `emitFile`.
   * - 'inline': Inline the IIFE directly in HTML. Largest HTML, smallest TTFB,
   *   always safe in production. Recommended for streaming SSR.
   * - 'module': ES module dynamic import of the client bootstrap. Vite rewrites the
   *   import path through its module graph so it survives production builds.
   * @default 'async'
   */
  mode?: 'async' | 'inline' | 'module'
  /**
   * CSP nonce forwarded on every injected `<script>` tag. Pass a string or a
   * function returning a string (useful when the nonce rotates per request).
   * Omit to inject without a nonce.
   */
  nonce?: Nonce
  /**
   * Stream key global name; must match `experimentalStreamKey` on the server
   * head instance. Used by dev-mode warnings to detect when the server
   * bootstrap script hasn't run (common misconfig).
   * @default '__unhead__'
   */
  streamKey?: string
  /**
   * Emit a warning when the client IIFE runs but no server bootstrap queue
   * has been installed (i.e. server didn't call `wrapStream` /
   * `renderSSRHeadShell`). Dev-only.
   * @default true in dev, false in prod
   */
  warnOnMissingServerBootstrap?: boolean
}

interface InternalState {
  mode: 'async' | 'inline' | 'module'
  /** Production build detected via vite configResolved. */
  isBuild: boolean
  /** Asset handle for the emitted iife in `async` production builds. */
  emittedIifeFileName?: string
  /** True when vite config phase detected ssr. */
  ssr: boolean
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

function resolveNonce(nonce?: Nonce): string | undefined {
  if (!nonce)
    return undefined
  return typeof nonce === 'function' ? nonce() : nonce
}

function buildClientStub(framework: string, streamKey: string, warnOnMissing: boolean): string {
  // Minified client bootstrap. Reads from `window[streamKey]`, swaps `_head`
  // for a real Unhead instance, replays queued entries, rebinds `.push`.
  // Uses the `StreamingGlobal` shape declared in `./types.ts`; keep in sync.
  const key = JSON.stringify(streamKey)
  const warnBranch = warnOnMissing
    ? `else{console.warn('[unhead] streaming client loaded but window['+${key}+'] is undefined; did the server call wrapStream()/renderSSRHeadShell()?')}`
    : ''
  return `import{createHead}from'${framework}/client'
const s=window[${key}];if(s){const q=s._q;s._q=[];const h=createHead({document});q.forEach(e=>h.push(e));s.push=e=>h.push(e);s._head=h}${warnBranch}`
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
 * - webpack/rspack: `compiler.options.name === 'server'` or `target === 'node'`
 */
export function buildStreamingPluginOptions(options: StreamingPluginOptions): UnpluginOptions {
  const {
    framework,
    name,
    mode = 'async',
    nonce,
    streamKey = '__unhead__',
    warnOnMissingServerBootstrap,
  } = options

  const state: InternalState = {
    mode,
    isBuild: false,
    ssr: false,
  }

  // Shared SSR detection used by both load and transform hooks. Vite v6+
  // dev mode has per-environment contexts where the `opts.ssr` flag on each
  // call is authoritative; fall back to the bundler-hook closure set by
  // webpack/rspack/vite.apply for non-dev builds.
  function isSSRCall(hookThis: any, opts?: { ssr?: boolean }): boolean {
    const envName = hookThis?.environment?.name
    return envName === 'ssr' || envName === 'server' || opts?.ssr === true || state.ssr
  }

  function warnEnabled(): boolean {
    return warnOnMissingServerBootstrap ?? !state.isBuild
  }

  return {
    name: name ?? `${framework}:streaming`,
    enforce: 'pre',

    async buildStart() {
      await loadIifeCode()
      // In `async` mode for production Vite builds, emit the IIFE as a real
      // asset chunk so the eventual `<script async src="...">` points at a
      // hashed file that ships with the build. In dev / other bundlers the
      // virtual module path is resolved on-the-fly.
      if (mode === 'async' && state.isBuild && typeof (this as any).emitFile === 'function') {
        if (!iifeCode)
          throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
        state.emittedIifeFileName = (this as any).emitFile({
          type: 'asset',
          name: 'unhead-streaming.js',
          source: iifeCode,
        })
      }
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
        // `moduleType: 'js'` is required by Rolldown for virtual modules
        // (added in df9c846f). Other bundlers ignore it.
        if (id === RESOLVED_ID) {
          if (isSSR)
            return { code: 'export {}', moduleType: 'js' }
          return {
            code: buildClientStub(framework, streamKey, warnEnabled()),
            moduleType: 'js',
          }
        }
        if (id === RESOLVED_IIFE_ID) {
          if (isSSR)
            return { code: '', moduleType: 'js' }
          if (!iifeCode)
            throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
          return { code: iifeCode, moduleType: 'js' }
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
        state.ssr = true
    },

    rspack(compiler) {
      const { name: n, target } = compiler.options
      if (n === 'server' || target === 'node' || target === 'async-node')
        state.ssr = true
    },

    vite: {
      apply(_config: UserConfig, env: ConfigEnv): boolean {
        if (env.isSsrBuild)
          state.ssr = true
        if (env.command === 'build')
          state.isBuild = true
        return true
      },
      configResolved(config: ResolvedConfig) {
        if (config.command === 'build')
          state.isBuild = true
      },
      transformIndexHtml: {
        // `order: 'pre'` is separate from the plugin-level `enforce: 'pre'`:
        // it runs this HTML transform before other non-pre HTML transforms
        // so the virtual module `<script>` tags we inject go through the
        // full Vite plugin pipeline (resolveId/load) and aren't stripped or
        // rewritten by downstream HTML transforms.
        order: 'pre',
        handler() {
          const nonceValue = resolveNonce(nonce)
          const nonceAttr = nonceValue ? { nonce: nonceValue } : {}

          if (mode === 'inline') {
            if (!iifeCode)
              throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
            return [{
              tag: 'script',
              attrs: nonceAttr,
              children: iifeCode,
              injectTo: 'head-prepend',
            }]
          }

          if (mode === 'async') {
            // Production builds reference the emitted asset path so it
            // survives bundling; dev (and bundlers without emitFile) fall
            // back to the virtual module URL served by the load hook.
            const src = state.isBuild && state.emittedIifeFileName
              ? `/${state.emittedIifeFileName}`
              : `/${VIRTUAL_IIFE_ID}`
            return [{
              tag: 'script',
              attrs: { ...nonceAttr, async: true, src },
              injectTo: 'head-prepend',
            }]
          }

          return [{
            tag: 'script',
            attrs: nonceAttr,
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
