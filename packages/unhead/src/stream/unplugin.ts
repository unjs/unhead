import type { UnpluginOptions } from 'unplugin'
import type { ConfigEnv, RenderBuiltAssetUrl, ResolvedConfig, UserConfig } from 'vite'
import { createHash } from 'node:crypto'
import { posix } from 'node:path'
import { createUnplugin } from 'unplugin'

export const VIRTUAL_CLIENT_ID = 'virtual:@unhead/streaming-client'
export const VIRTUAL_IIFE_ID = 'virtual:@unhead/streaming-iife.js'
const RESOLVED_ID = `\0${VIRTUAL_CLIENT_ID}`
const RESOLVED_IIFE_ID = `\0${VIRTUAL_IIFE_ID}`
const VIRTUAL_RE = /virtual:@unhead\/streaming/
const RESOLVED_RE = /^\0virtual:@unhead\/streaming/
const IIFE_AUTO_INIT_RE = /\.init\(\);?\s*$/

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
  /** Optional source-code prefilter for transform hooks. */
  codeFilter?: RegExp
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
   *
   * Not stamped during a build-time manifest pass (Vite calls
   * `transformIndexHtml(undefined, ctx)` to collect tags for frameworks,
   * e.g. Nuxt, that inject them at render time). A per-request nonce
   * cannot be baked into a static manifest. Frameworks reading tags from
   * a manifest must stamp the nonce themselves when they render each
   * request.
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
  /** True once Vite-specific hooks have identified this as a Vite run. */
  isVite: boolean
  /** Production build detected via vite configResolved. */
  isBuild: boolean
  /** Rollup asset reference id for the emitted iife in production builds (secondary path). */
  emittedIifeFileId?: string
  /**
   * Deterministic `fileName` (content hash of the iife, under `build.assetsDir`)
   * computed and emitted in `buildStart`, before any bundle exists. This is the
   * primary source for the injected `src`: it works even when Vite calls
   * `transformIndexHtml` with no bundle (vitejs/ecosystem#15's manifest pass).
   */
  emittedIifeFileName?: string
  /** True when vite config phase detected ssr. */
  ssr: boolean
  /** Vite's resolved `base`, used to prefix emitted/virtual asset URLs. */
  base: string
  /** Vite's resolved `build.assetsDir`, used to place the emitted iife asset. */
  assetsDir: string
  /**
   * Vite's `experimental.renderBuiltUrl`, used by frameworks (e.g. Nuxt) to
   * point emitted assets at a CDN instead of `base`.
   */
  renderBuiltUrl?: RenderBuiltAssetUrl
  /** True once the `module`-mode manifest-pass fallback warning has fired. */
  warnedManifestModuleFallback: boolean
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

function configureIifeCode(code: string, streamKey: string): string {
  if (streamKey === '__unhead__')
    return code
  if (!IIFE_AUTO_INIT_RE.test(code))
    throw new Error('[unhead] Streaming IIFE auto-init call was not found.')
  return code.replace(IIFE_AUTO_INIT_RE, `.init({streamKey:${JSON.stringify(streamKey)}});`)
}

function buildClientStub(framework: string, streamKey: string, warnOnMissing: boolean): string {
  // Minified client bootstrap. Reads from `window[streamKey]`, swaps `_head`
  // for a real Unhead instance, replays queued entries, rebinds `.push`.
  // Uses the `StreamingGlobal` shape declared in `./types.ts`; keep in sync.
  const key = JSON.stringify(streamKey)
  const warnBranch = warnOnMissing
    ? `else{console.warn('[unhead] streaming client loaded but window['+${key}+'] is undefined; did the server call wrapStream()/renderSSRHeadShell()?')}`
    : ''
  // `_q` items and the server's live `push` argument are BATCHES of entries,
  // so each batch is spread into individual `h.push` calls. Pushing the batch
  // array itself normalizes its indexes into tags named `0`, `1`, ... and
  // every streamed tag is lost.
  // Entries are marked `_streamed` to match the iife, so devtools can tell
  // them apart from client pushes.
  // `_wrapped` is set because `createHead` here is already the adapter-wrapped
  // client head; without it `createStreamableHead` wraps it a second time and
  // every client push renders twice.
  return `import{createHead}from'${framework}/client'
const s=window[${key}];if(s){const q=s._q;s._q=[];const h=createHead({document});h._wrapped=!0;const p=b=>{for(const e of b){const a=h.push(e),t=h.entries.get(a._i);if(t)t._streamed=!0}};q.forEach(p);s.push=p;s._head=h}${warnBranch}`
}

/**
 * Builds the bundler-agnostic unplugin hook set for the streaming plugin. Exposed so
 * framework wrappers (e.g. `@unhead/vue/bundler`) can bake in their own
 * `framework`, `filter`, and `transform` while still using this factory
 * to produce hooks that work across vite/webpack/rspack/rollup/esbuild via `createUnplugin`.
 *
 * SSR detection is bundler-specific:
 * - vite build: `config.env.isSsrBuild`
 * - vite dev (v6+ environments): `this.environment.name === 'ssr'` per-transform
 * - webpack/rspack: `compiler.options.name === 'server'` or `target === 'node'`
 */
export function buildStreamingPluginOptions(options: StreamingPluginOptions, meta: { framework?: string } = {}): UnpluginOptions {
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
    isVite: meta.framework === 'vite',
    isBuild: false,
    ssr: false,
    base: '/',
    assetsDir: 'assets',
    warnedManifestModuleFallback: false,
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

  // Prefixes an emitted/virtual asset path with Vite's resolved `base`,
  // instead of assuming the app is served from `/`.
  function joinBase(path: string): string {
    const rest = path.startsWith('/') ? path.slice(1) : path
    if (!state.base)
      return rest
    const base = state.base.endsWith('/') ? state.base : `${state.base}/`
    return `${base}${rest}`
  }

  function normalizeHtmlHostId(path?: string): string | undefined {
    if (!path)
      return undefined
    const normalized = path.split(/[?#]/, 1)[0].replaceAll('\\', '/').replace(/^\/+/, '')
    if (!normalized)
      return 'index.html'
    return normalized.endsWith('/') ? `${normalized}index.html` : normalized
  }

  function resolveRelativeAssetSrc(fileName: string, hostId: string): string {
    const relative = posix.relative(posix.dirname(hostId), fileName)
    return relative.startsWith('.') ? relative : `./${relative}`
  }

  // Resolves the `src` for an emitted asset `fileName`, honouring
  // `experimental.renderBuiltUrl` (e.g. Nuxt points it at a CDN via
  // `globalThis.__publicAssetsURL`). That hook can answer three ways:
  // - a string: an absolute/CDN URL to use as-is.
  // - `{ runtime }`: a JS expression, only valid inside emitted JS, not a
  //   static HTML attribute.
  // - `{ relative: true }`: a path relative to the rendering HTML file.
  // Runtime expressions cannot execute in HTML attributes.
  function resolveAssetSrc(fileName: string, htmlHostId?: string): { src: string, rawFileNameAttr?: Record<string, string> } {
    const result = htmlHostId
      ? state.renderBuiltUrl?.(fileName, {
          type: 'asset',
          hostId: htmlHostId,
          hostType: 'html',
          ssr: state.ssr,
        })
      : undefined
    const unresolvedHost = htmlHostId === undefined
    if (typeof result === 'object' && result?.runtime)
      throw new Error(`{ runtime: "${result.runtime}" } is not supported for assets in html files: ${fileName}`)
    const rawFileNameAttr = unresolvedHost
      ? { 'data-unhead-asset': fileName }
      : undefined
    if (typeof result === 'string' && result.length > 0)
      return { src: result, rawFileNameAttr }

    let relative = state.base === '' || state.base === './'
    if (typeof result === 'object' && typeof result?.relative === 'boolean')
      relative = result.relative
    if (relative && !state.ssr && htmlHostId)
      return { src: resolveRelativeAssetSrc(fileName, htmlHostId), rawFileNameAttr }
    return { src: joinBase(fileName), rawFileNameAttr }
  }

  function resolveEmittedIifePath(hookThis: any, ctx?: { bundle?: Record<string, any> }): string | undefined {
    // Primary: computed synchronously in `buildStart`, before any bundle
    // exists, so it's available even when Vite calls `transformIndexHtml`
    // with no bundle (the manifest pass in vitejs/ecosystem#15).
    if (state.emittedIifeFileName)
      return state.emittedIifeFileName

    // Secondary: only reachable if `emitFile` wasn't available in
    // `buildStart`, but a normal bundle pass still produced a resolvable ref.
    const ref = state.emittedIifeFileId
    if (!ref)
      return undefined
    for (const asset of Object.values(ctx?.bundle || {})) {
      if (asset?.type === 'asset' && asset.fileName && (asset.name === 'unhead-streaming.js' || asset.names?.includes('unhead-streaming.js')))
        return asset.fileName
    }
    if (typeof hookThis?.getFileName === 'function') {
      const fileName = hookThis.getFileName(ref)
      if (fileName && fileName !== ref)
        return fileName
    }
    return undefined
  }

  function warnManifestModuleFallback(hookThis: any): void {
    if (state.warnedManifestModuleFallback)
      return
    state.warnedManifestModuleFallback = true
    const message = '[unhead] Vite called transformIndexHtml with no HTML. This is a manifest pass. Module mode cannot inject a dynamic import here. Falling back to the async script tag. Set mode: \'async\' to remove this warning.'
    if (typeof hookThis?.warn === 'function')
      hookThis.warn(message)
    else
      console.warn(message)
  }

  return {
    name: name ?? `${framework}:streaming`,
    enforce: 'pre',

    async buildStart() {
      if (!state.isVite)
        return
      // In dev, `module` mode never needs the iife asset: its descriptor is
      // a dynamic import resolved through the virtual client module, and a
      // manifest pass (`transformIndexHtml(undefined, ctx)`) only happens
      // at build time.
      if (mode === 'module' && !state.isBuild)
        return

      await loadIifeCode()
      // `async` mode always ships the iife as a real asset chunk in
      // production so `<script async src="...">` points at a file that
      // ships with the build. `module` mode emits it too, purely as a
      // fallback for the manifest pass, where its usual dynamic-import
      // descriptor can't work (see the `module`-mode branch below). In dev
      // / other bundlers the virtual module path is resolved on-the-fly.
      if ((mode === 'async' || mode === 'module') && state.isBuild && typeof (this as any).emitFile === 'function') {
        if (!iifeCode)
          throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
        const source = configureIifeCode(iifeCode, streamKey)
        const hash = createHash('sha256').update(source).digest('hex').slice(0, 8)
        const fileName = posix.join(state.assetsDir, `unhead-streaming.${hash}.js`)
        state.emittedIifeFileId = (this as any).emitFile({
          type: 'asset',
          fileName,
          source,
        })
        state.emittedIifeFileName = fileName
      }
    },

    resolveId: {
      filter: { id: VIRTUAL_RE },
      handler(id) {
        if (id === VIRTUAL_CLIENT_ID || id === `/${VIRTUAL_CLIENT_ID}`)
          return RESOLVED_ID
        if (state.isVite && (id === VIRTUAL_IIFE_ID || id === `/${VIRTUAL_IIFE_ID}`))
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
          if (!state.isVite)
            return
          if (isSSR)
            return { code: '', moduleType: 'js' }
          if (!iifeCode)
            throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
          return { code: configureIifeCode(iifeCode, streamKey), moduleType: 'js' }
        }
      },
    },

    ...(options.transform && options.filter
      ? {
          transform: {
            filter: options.codeFilter
              ? { id: options.filter, code: options.codeFilter }
              : { id: options.filter },
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
        state.isVite = true
        if (env.isSsrBuild)
          state.ssr = true
        if (env.command === 'build')
          state.isBuild = true
        return true
      },
      configResolved(config: ResolvedConfig) {
        state.isVite = true
        if (config.command === 'build')
          state.isBuild = true
        state.base = config.base ?? '/'
        state.assetsDir = config.build?.assetsDir ?? 'assets'
        state.renderBuiltUrl = config.experimental?.renderBuiltUrl
      },
      transformIndexHtml: {
        // `order: 'pre'` is separate from the plugin-level `enforce: 'pre'`:
        // it runs this HTML transform before other non-pre HTML transforms
        // so the virtual module `<script>` tags we inject go through the
        // full Vite plugin pipeline (resolveId/load) and aren't stripped or
        // rewritten by downstream HTML transforms.
        order: 'pre',
        handler(this: any, html?: string, ctx?: { path?: string, bundle?: Record<string, any> }) {
          // Vite's manifest pass (vitejs/ecosystem#15) calls this hook with
          // no HTML, ahead of any per-request render, to collect the
          // returned tags into a build manifest for frameworks (e.g. Nuxt)
          // to inject later. Nothing per-request-specific can go in here.
          const isManifestPass = html === undefined

          // A nonce is per-request. It can't be baked into a manifest that
          // gets reused across requests, so omit it on the manifest pass;
          // the framework must stamp it in when it renders each request.
          const nonceValue = isManifestPass ? undefined : resolveNonce(nonce)
          const nonceAttr = nonceValue ? { nonce: nonceValue } : {}

          if (mode === 'inline') {
            if (!iifeCode)
              throw new Error('[unhead] Streaming IIFE not built. Run `pnpm build` in packages/unhead first.')
            return [{
              tag: 'script',
              attrs: nonceAttr,
              children: configureIifeCode(iifeCode, streamKey),
              injectTo: 'head-prepend',
            }]
          }

          if (mode === 'async' || (mode === 'module' && isManifestPass)) {
            if (mode === 'module')
              warnManifestModuleFallback(this)

            // Production builds reference the emitted asset path so it
            // survives bundling; dev (and bundlers without emitFile) fall
            // back to the virtual module URL served by the load hook.
            const fileName = state.isBuild ? resolveEmittedIifePath(this, ctx) : undefined
            const htmlHostId = normalizeHtmlHostId(ctx?.path)
            const { src, rawFileNameAttr } = fileName
              ? resolveAssetSrc(fileName, htmlHostId)
              : { src: joinBase(VIRTUAL_IIFE_ID), rawFileNameAttr: undefined }
            return [{
              tag: 'script',
              attrs: { ...nonceAttr, ...rawFileNameAttr, async: true, src },
              injectTo: 'head-prepend',
            }]
          }

          return [{
            tag: 'script',
            attrs: nonceAttr,
            children: `import("${state.isBuild ? `/${VIRTUAL_CLIENT_ID}` : joinBase(VIRTUAL_CLIENT_ID)}")`,
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
 * Consumers should prefer the unified framework bundler entry (e.g.
 * `@unhead/{vue,react,svelte,solid-js}/bundler`) rather than importing this
 * directly.
 */
export const createStreamingPlugin = /* @__PURE__ */ createUnplugin<StreamingPluginOptions>(buildStreamingPluginOptions)
