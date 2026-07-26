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
export const JS_VUE_RE = /\.(?:(?:c|m)?j|t)sx?(?:$|\?)|\.vue(?:$|\?)/

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
