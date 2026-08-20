import type { HookFilter } from 'unplugin'

/**
 * Applies a transform hook's declared `filter` the way unplugin and the
 * bundlers do, then calls the handler. Tests must go through this so a filter
 * that is too narrow shows up as a skipped transform instead of passing on a
 * hand-rolled include check.
 *
 * Mirrors unplugin's `createFilterForTransform`: `exclude` wins over
 * `include`, and a non-empty `include` list that matches nothing rejects.
 * Only `RegExp` patterns are supported, which is all the plugins use.
 */
function matchesPattern(pattern: unknown, value: string): boolean {
  if (!(pattern instanceof RegExp))
    throw new TypeError(`test filter helper only supports RegExp patterns, got ${String(pattern)}`)
  return pattern.test(value)
}

function normalize(filter: unknown): { include: unknown[], exclude: unknown[] } | undefined {
  if (!filter)
    return
  if (filter instanceof RegExp || typeof filter === 'string')
    return { include: [filter], exclude: [] }
  if (Array.isArray(filter))
    return { include: filter, exclude: [] }
  const { include, exclude } = filter as { include?: unknown, exclude?: unknown }
  return {
    include: include === undefined ? [] : Array.isArray(include) ? include : [include],
    exclude: exclude === undefined ? [] : Array.isArray(exclude) ? exclude : [exclude],
  }
}

function passes(filter: unknown, value: string): boolean {
  const normalized = normalize(filter)
  if (!normalized)
    return true
  if (normalized.exclude.some(pattern => matchesPattern(pattern, value)))
    return false
  if (normalized.include.length === 0)
    return true
  return normalized.include.some(pattern => matchesPattern(pattern, value))
}

/** Whether the bundler would call this plugin's transform handler at all. */
export function passesTransformFilter(plugin: any, id: string, code: string): boolean {
  const hook = plugin.transform
  const filter: HookFilter | undefined = typeof hook === 'function' ? undefined : hook?.filter
  if (!filter)
    return true
  return passes(filter.id, id) && passes(filter.code, code)
}

/**
 * Runs a plugin's transform hook through its declared filter. Returns whatever
 * the handler returns, so callers of a synchronous hook stay synchronous.
 */
export function runTransform(plugin: any, code: string, id: string, ctx: any = {}): any {
  if (!passesTransformFilter(plugin, id, code))
    return undefined
  const handler = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform.handler
  return handler.call(ctx, code, id)
}
