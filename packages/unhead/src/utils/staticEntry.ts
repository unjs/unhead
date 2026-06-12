import type { HeadEntry, HeadTag, StaticEntryStore } from '../types'
import { dedupeKey, hashTag } from './dedupe'
import { normalizeEntryToTags } from './normalize'
import { markStaticTag, prepareStaticTag, staticTagState } from './sanitize'

interface StaticEntryCache {
  /** weight function the cache was computed with */
  w: (tag: HeadTag) => number
  /** normalized, stamped (except _p), frozen tags */
  tags: HeadTag[]
  /** fully stamped shared tag arrays keyed by entry index */
  byIndex: Map<number, HeadTag[]>
}

/**
 * Per-input state inside a caller-provided store:
 * - a head reference: the input was normalized purely (no functions
 *   unwrapped, no prop-resolver rewrites) once, by that head
 * - `0`: permanently disqualified (patched in place — content is mutable)
 * - a cache: promoted; tags are shared across heads from then on
 */
type StaticState = object | 0 | StaticEntryCache

/** Tracking box threaded through normalization to observe purity. */
export interface PurityTrack { pure: boolean }

// the WeakMap is attached lazily so creating the store object has no cost
function storeMap(store: StaticEntryStore): WeakMap<object, StaticState> {
  return ((store as any)._m ??= new WeakMap())
}

export function getStaticCache(store: StaticEntryStore, input: object, weightFn: (tag: HeadTag) => number): StaticEntryCache | undefined {
  const c = storeMap(store).get(input)
  if (!c || typeof (c as StaticEntryCache).w !== 'function')
    return undefined
  if ((c as StaticEntryCache).w !== weightFn)
    // head uses a different weight function: rebuild (inputs are pure, so
    // re-normalizing without resolvers is sound)
    return promoteStaticEntry(store, input, normalizeEntryToTags(input, []), weightFn)
  return c as StaticEntryCache
}

/**
 * Returns true when this pure input should be promoted to the shared cache:
 * immediately for `eager` (the `static` entry option), otherwise once it has
 * been normalized by a *different* head — cross-request sharing is the signal
 * that the input is process-stable. Same-head repeats never promote.
 */
export function shouldPromoteStatic(store: StaticEntryStore, input: object, head: object, eager: boolean): boolean {
  const m = storeMap(store)
  const v = m.get(input)
  if (v === 0)
    return false
  if (eager)
    return true
  if (v !== undefined)
    return v !== head
  m.set(input, head)
  return false
}

/**
 * Permanently disqualifies an input from static promotion (and drops any
 * promoted cache). Called when an entry is patched with the same object
 * identity — evidence the object is mutated in place between renders.
 */
export function markImpureInput(store: StaticEntryStore, input: unknown): void {
  if (input && typeof input === 'object')
    storeMap(store).set(input, 0)
}

/**
 * Promotes freshly normalized (pre-stamp, pre-options) tags into the shared
 * cache. The input must not be mutated afterwards — patch with a new object
 * instead.
 */
export function promoteStaticEntry(store: StaticEntryStore, input: object, tags: HeadTag[], weightFn: (tag: HeadTag) => number): StaticEntryCache {
  for (const t of tags) {
    t._w = weightFn(t)
    t._d = dedupeKey(t)
    if (!t._d)
      t._h = hashTag(t)
    // validate + escape once so the per-render sanitize pass can skip it
    prepareStaticTag(t)
    // shared across requests: always frozen, even in production
    Object.freeze(t.props)
    Object.freeze(t)
  }
  const c: StaticEntryCache = { w: weightFn, tags, byIndex: new Map() }
  storeMap(store).set(input, c)
  return c
}

/**
 * Produces an entry's tags from the shared cache: the exact same frozen tag
 * array for the common case, per-head shells when entry options differ.
 * @internal
 */
export function materializeStaticEntry(c: StaticEntryCache, e: HeadEntry<any>): HeadTag[] {
  const opts = e.options && Object.keys(e.options).length ? e.options : undefined
  if (!opts) {
    // common case: same entry index across heads -> share the exact tag array
    let tags = c.byIndex.get(e._i)
    if (!tags) {
      tags = c.tags.map((t, i) => {
        const tag = { ...t, _p: (e._i << 10) + i } as HeadTag
        if (staticTagState(t))
          markStaticTag(tag)
        return Object.freeze(tag) as HeadTag
      })
      c.byIndex.set(e._i, tags)
    }
    return tags
  }
  // entry options influence weight/position: stamp per-head shells
  return c.tags.map((t, i) => {
    const shell: HeadTag = Object.assign({ ...t }, opts, { _p: (e._i << 10) + i })
    shell._w = c.w(shell)
    if (staticTagState(t))
      markStaticTag(shell)
    return shell
  })
}
