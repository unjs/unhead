/**
 * Process-local relay between the Vue app plugin (which has the V4Head
 * instance, via `nuxtApp.ssrContext.head`, but no view of the prerender
 * lifecycle) and the Nitro plugin (which drives the double-render and owns
 * the manifest, via `render:html` + `localFetch`, but never sees a Vue
 * instance).
 *
 * MEASURED, not assumed: a first version of this file used a plain
 * module-scope `Map`, on the theory that Nitro bundles the whole server into
 * one process. That is true of the process, but not of the build graph: the
 * Vue SSR app is compiled by Vite into `.nuxt/dist/server/server.mjs` as an
 * opaque precompiled artifact, and Nitro's own Rollup pass treats that file
 * as an external import rather than re-bundling its sources. `server/plugins/*`
 * is a SEPARATE Rollup pass over TypeScript sources reachable from Nitro's
 * own graph, so it re-bundles `head-trace-registry.ts` from scratch. Both
 * builds resolve the same relative import path to the same source file, but
 * each produces its own compiled copy with its own top-level `Map` -- two
 * live instances, not one. Every route measured `takeAttempts` at 0 (the
 * push landed in the app bundle's copy, the take read the Nitro bundle's
 * copy) until this was rewritten onto `globalThis`, which both compiled
 * copies share because they execute in the same JS realm regardless of how
 * many times their source was independently bundled. `Symbol.for` is load
 * bearing here: it is a global (cross-realm-instance) symbol registry keyed
 * by string, so both bundle copies' own `Symbol.for(KEY)` calls resolve to
 * the identical symbol value and thus the identical `globalThis` property,
 * even though neither copy imports a value from the other.
 */
import type { RecordedRouteHead } from 'unhead/v4/record'

const REGISTRY_KEY = Symbol.for('unhead:v4-head-trace-registry')

function registry(): Map<string, RecordedRouteHead[]> {
  const g = globalThis as unknown as Record<symbol, Map<string, RecordedRouteHead[]> | undefined>
  return g[REGISTRY_KEY] ??= new Map()
}

export function pushAttempt(route: string, recorded: RecordedRouteHead): void {
  const map = registry()
  const list = map.get(route) ?? []
  list.push(recorded)
  map.set(route, list)
}

/** Read back and clear the attempts recorded for a route. Never returns a
 * live reference: the caller owns the array once read. */
export function takeAttempts(route: string): RecordedRouteHead[] {
  const map = registry()
  const list = map.get(route) ?? []
  map.delete(route)
  return list
}
