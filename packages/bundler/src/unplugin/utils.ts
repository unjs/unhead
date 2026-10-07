import type { HookFilter } from 'unplugin'

export const NODE_MODULES_RE = /[\\/]node_modules[\\/]/

/** Which output a build targets: browser (`client`) or SSR (`server`). */
export type BuildConsumer = 'client' | 'server'

/**
 * Resolve the build target for a transform call.
 *
 * Prefers the Vite Environment API (`this.environment.config.consumer`,
 * Vite 6+), which is correct even when one plugin instance serves multiple
 * environments in a single pipeline (`sharedDuringBuild`). Falls back to the
 * instance-local value captured from `vite.apply()` / `webpack()` hooks, where
 * bundlers create separate plugin instances per build. Returns `undefined`
 * when the target is unknown (e.g. plain rollup), in which case callers must
 * retain the original code.
 */
export function resolveBuildConsumer(ctx: unknown, fallback: BuildConsumer | undefined): BuildConsumer | undefined {
  const consumer = (ctx as { environment?: { config?: { consumer?: string } } } | undefined)?.environment?.config?.consumer
  if (consumer === 'client' || consumer === 'server')
    return consumer
  return fallback
}
/**
 * Script extensions the transforms understand, matched against a `pathname`
 * with any query already stripped by `splitTransformId`.
 *
 * Covers every JS/TS extension pair: `.js`, `.cjs`, `.mjs`, `.jsx`, `.ts`,
 * `.cts`, `.mts`, `.tsx`.
 */
export const JS_EXT_RE = /\.[cm]?[jt]sx?$/

/**
 * Same extensions as `JS_EXT_RE` plus `.vue`, matched against a raw module id.
 * Ids carry a query in dev and for SFC sub-requests (`App.vue?vue&type=script`),
 * so the pattern ends at `?` as well as at the end of the string.
 */
export const JS_VUE_RE = /\.(?:[cm]?[jt]sx?|vue)(?:$|\?)/

/**
 * Same extensions as `JS_VUE_RE` plus `.svelte`, for the plugins that inspect
 * any authored source file rather than only script modules.
 */
export const SOURCE_FILE_RE = /\.(?:[cm]?[jt]sx?|vue|svelte)(?:$|\?)/

export function createJsVueTransformIdFilter(include?: RegExp[]): HookFilter['id'] {
  return {
    include: [
      JS_VUE_RE,
      ...(include || []),
    ],
    exclude: NODE_MODULES_RE,
  }
}

export function splitTransformId(id: string): { pathname: string, query: string } {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1
    ? { pathname: id, query: '' }
    : { pathname: id.slice(0, queryIndex), query: id.slice(queryIndex + 1) }
}

export function getQueryValue(query: string, key: string): string | undefined {
  const keyLength = key.length
  let start = 0
  while (start < query.length) {
    const ampIndex = query.indexOf('&', start)
    const end = ampIndex === -1 ? query.length : ampIndex
    const eqIndex = query.indexOf('=', start)

    if (eqIndex === -1 || eqIndex > end) {
      if (end - start === keyLength && query.startsWith(key, start))
        return ''
    }
    else if (eqIndex - start === keyLength && query.startsWith(key, start)) {
      return query.slice(eqIndex + 1, end)
    }

    start = end + 1
  }
}

export function isVueScriptRequest(pathname: string, query: string): boolean {
  return pathname.endsWith('.vue') && (!query || getQueryValue(query, 'type') === 'script')
}
