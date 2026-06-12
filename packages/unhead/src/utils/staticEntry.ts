import type { HeadEntry, HeadTag } from '../types'
import { dedupeKey, hashTag } from './dedupe'
import { normalizeEntryToTags } from './normalize'

/**
 * Marker for static head entries. `Symbol.for` so independently bundled
 * copies of unhead (e.g. server and client chunks) agree on the marker.
 */
export const kStaticEntry: unique symbol = Symbol.for('unhead:static') as any

interface StaticEntryCache {
  /** weight function the cache was computed with */
  w: (tag: HeadTag) => number
  /** normalized, stamped (except _p), frozen tags */
  tags: HeadTag[]
  /** fully stamped shared tag arrays keyed by entry index */
  byIndex: Map<number, HeadTag[]>
}

export interface StaticHeadEntry<T = unknown> {
  [kStaticEntry]: true
  input: T
  // internal lazy per-process cache
  _c?: StaticEntryCache
}

/**
 * Wraps head input that is identical for every request/head instance so it is
 * normalized, weighted and dedupe-keyed **once per process** instead of on
 * every render. The resulting tags are frozen and shared across heads.
 *
 * The input must be fully static: plain values only. Functions, promises,
 * framework refs and prop resolvers are not applied — the input is captured
 * as-is on first use.
 *
 * @example
 * ```ts
 * // module scope — shared by all requests
 * const appHead = defineStaticEntry({
 *   htmlAttrs: { lang: 'en' },
 *   meta: [{ charset: 'utf-8' }],
 * })
 *
 * export default () => createHead({ init: [appHead] })
 * ```
 */
export function defineStaticEntry<T>(input: T): StaticHeadEntry<T> {
  return { [kStaticEntry]: true, input }
}

export function isStaticEntry(input: unknown): input is StaticHeadEntry {
  return !!input && (input as any)[kStaticEntry] === true
}

/**
 * Produces the entry's tags from the process-level cache, computing it on
 * first use (or when the head uses a different tag weight function).
 * @internal
 */
export function materializeStaticEntry(s: StaticHeadEntry<any>, e: HeadEntry<any>, weightFn: (tag: HeadTag) => number): HeadTag[] {
  let c = s._c
  if (!c || c.w !== weightFn) {
    const tags = normalizeEntryToTags(s.input, [])
    for (const t of tags) {
      t._w = weightFn(t)
      t._d = dedupeKey(t)
      if (!t._d)
        t._h = hashTag(t)
      // shared across requests: always frozen, even in production
      Object.freeze(t.props)
      Object.freeze(t)
    }
    c = s._c = { w: weightFn, tags, byIndex: new Map() }
  }
  const opts = e.options && Object.keys(e.options).length ? e.options : undefined
  if (!opts) {
    // common case: same entry index across heads -> share the exact tag array
    let tags = c.byIndex.get(e._i)
    if (!tags) {
      tags = c.tags.map((t, i) => Object.freeze({ ...t, _p: (e._i << 10) + i }) as HeadTag)
      c.byIndex.set(e._i, tags)
    }
    return tags
  }
  // entry options influence weight/position: stamp per-head shells
  return c.tags.map((t, i) => {
    const shell: HeadTag = Object.assign({ ...t }, opts, { _p: (e._i << 10) + i })
    shell._w = weightFn(shell)
    return shell
  })
}
