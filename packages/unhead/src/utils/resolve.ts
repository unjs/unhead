import type { HeadTag, Unhead } from '../types'
import { UsesMergeStrategy, ValidHeadTags } from './const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from './dedupe'
import { callHook, callSyncHook } from './hooks'
import { normalizeEntryToTags } from './normalize'
import { isStaticEntry, materializeStaticEntry } from './staticEntry'

const LT_RE = /</g
const SCRIPT_END_RE = /<\/script/g

// @ts-expect-error untyped
const sortTags = (a: HeadTag, b: HeadTag) => a._w === b._w ? a._p - b._p : a._w - b._w

const DEFAULT_TAG_WEIGHT = () => 100

// resolved tags are shared across renders (and potentially across heads);
// freeze them outside production so contract violations throw in dev/test
// eslint-disable-next-line node/prefer-global/process
const DEV = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'

export interface ResolveTagsContext {
  tagMap: Map<string, HeadTag>
  tags: HeadTag[]
}

export interface ResolveTagsOptions {
  tagWeight?: (tag: HeadTag) => number
}

/**
 * Incremental dedupe state, maintained on the head across renders so each
 * render only reprocesses entries that changed since the previous one.
 * @internal
 */
interface DedupeState {
  /**
   * dedupe key -> candidate tags from all entries. The overwhelmingly common
   * single-candidate case is stored bare (no array, no fold, no winner entry);
   * multi-candidate buckets are arrays kept sorted by (_w, _p) on fold.
   */
  buckets: Map<string, HeadTag | HeadTag[]>
  /** entry _i -> the exact tags array currently inserted into buckets */
  entryTags: Map<number, HeadTag[]>
  /** keys whose bucket changed and need their winner re-folded */
  dirty: Set<string>
  /** folded winner per multi-candidate bucket (array-shaped for same-entry meta dupes) */
  winners: Map<string, HeadTag | HeadTag[]>
  /** winners in emit order (anchored at each bucket's earliest-sorted tag) */
  order: OrderSlot[] | null
  /** key -> index into order, for in-place winner swaps on same-shape patches */
  orderIdx: Map<string, number>
  /** any winner is a flat-meta array, requiring a flatten + resort on emit */
  flat: boolean
}

interface OrderSlot {
  k: string
  w: HeadTag | HeadTag[]
  /** anchor sort weight/position captured at rebuild; a change forces a resort */
  aw: number
  ap: number
}

const tagKey = (t: HeadTag) => (t._d || t._h)!

/**
 * Fold a duplicate candidate into the current winner, replicating the
 * pairwise dedupe semantics (merge strategy / same-entry flat meta / priority).
 */
function mergeResolvedTag(prev: HeadTag | HeadTag[], next: HeadTag, k: string): HeadTag | HeadTag[] {
  const p = prev as HeadTag
  const strategy = next.tagDuplicateStrategy || (UsesMergeStrategy.has(next.tag) ? 'merge' : null) || (next.key && next.key === p.key ? 'merge' : null)
  if (strategy === 'merge') {
    const props = { ...p.props }
    for (const prop in next.props) {
      // @ts-expect-error untyped - style is Map, class is Set at runtime
      props[prop] = prop === 'style'
        ? new Map([...(p.props.style || new Map()) as any, ...next.props[prop] as any])
        : prop === 'class' ? new Set([...(p.props.class || []) as any, ...next.props[prop] as any]) : next.props[prop]
    }
    return { ...next, props }
  }
  if ((next._p! >> 10) === (p._p! >> 10) && next.tag === 'meta' && isMetaArrayDupeKey(k))
    return Object.assign([...(Array.isArray(prev) ? prev : [prev]), next], next)
  // @ts-expect-error untyped
  if (next._w === p._w ? next._p! > p._p! : next._w < p._w)
    return next
  return prev
}

function foldBucket(state: DedupeState, k: string): void {
  const bucket = state.buckets.get(k)
  if (!bucket || !Array.isArray(bucket)) {
    // single candidate is its own winner; nothing to fold
    state.winners.delete(k)
    return
  }
  bucket.sort(sortTags)
  let winner: HeadTag | HeadTag[] = bucket[0]
  for (let i = 1; i < bucket.length; i++)
    winner = mergeResolvedTag(winner, bucket[i], k)
  if (DEV && winner !== bucket[0]) {
    Object.freeze((winner as HeadTag).props)
    Object.freeze(winner)
  }
  state.winners.set(k, winner)
}

/**
 * @deprecated Only retained for the legacy full-list dedupe shape; the resolve
 * pipeline now dedupes incrementally. Will be removed in a future major.
 */
export function dedupeTags(ctx: ResolveTagsContext): boolean {
  let hasFlatMeta = false
  for (const next of ctx.tags.sort(sortTags)) {
    const k = next._d || hashTag(next)
    const prev = ctx.tagMap.get(k)
    if (!prev) {
      ctx.tagMap.set(k, next)
      continue
    }
    const winner = mergeResolvedTag(prev, next, k)
    if (winner !== prev) {
      ctx.tagMap.set(k, winner as HeadTag)
      hasFlatMeta = hasFlatMeta || Array.isArray(winner)
    }
  }
  return hasFlatMeta
}

export function resolveTitleTemplate(ctx: ResolveTagsContext, head: Unhead<any>): void {
  const title = ctx.tagMap.get('title')
  const tpl = ctx.tagMap.get('titleTemplate')
  head._title = title?.textContent
  if (!tpl)
    return
  const fn = tpl.textContent
  head._titleTemplate = fn
  if (!fn)
    return
  // @ts-expect-error untyped
  let v = typeof fn === 'function' ? fn(title?.textContent) : fn
  if (typeof v === 'string' && !head.plugins.has('template-params'))
    v = v.replace('%s', title?.textContent || '')
  if (title) {
    v === null ? ctx.tagMap.delete('title') : ctx.tagMap.set('title', { ...title, textContent: v })
  }
  else {
    // create a new object instead of mutating the cached tpl tag
    ctx.tagMap.set('titleTemplate', { ...tpl, tag: 'title', textContent: v })
  }
}

export function sanitizeTags(tags: HeadTag[]): HeadTag[] {
  const out: HeadTag[] = []
  for (let t of tags) {
    const { innerHTML, tag, props } = t
    if (!ValidHeadTags.has(tag) || (!Object.keys(props).length && !innerHTML && !t.textContent))
      continue
    if (tag === 'meta' && !props.content && !props['http-equiv'] && !props.charset)
      continue
    if (tag === 'script' && (innerHTML || t.textContent)) {
      const type = String(props.type)
      const isJsonLike = type.endsWith('json') || type === 'importmap' || type === 'speculationrules'
      const escape = (content: unknown): unknown => isJsonLike
        ? (typeof content === 'string' ? content : JSON.stringify(content)).replace(LT_RE, '\\u003C')
        : typeof content === 'string' ? content.replace(SCRIPT_END_RE, '<\\/script') : content
      // copy-on-write: resolved tags may be shared with the entry cache
      t = { ...t }
      if (innerHTML)
        t.innerHTML = escape(innerHTML) as typeof innerHTML
      if (t.textContent)
        t.textContent = escape(t.textContent) as typeof t.textContent
      t._d = dedupeKey(t)
    }
    out.push(t)
  }
  return out
}

function insertTag(state: DedupeState, t: HeadTag): void {
  if (DEV) {
    Object.freeze(t.props)
    Object.freeze(t)
  }
  const k = tagKey(t)
  const bucket = state.buckets.get(k)
  if (bucket === undefined)
    state.buckets.set(k, t)
  else if (Array.isArray(bucket))
    bucket.push(t)
  else
    state.buckets.set(k, [bucket, t])
  state.dirty.add(k)
}

function removeTag(state: DedupeState, t: HeadTag): void {
  const k = tagKey(t)
  const bucket = state.buckets.get(k)
  if (bucket === undefined)
    return
  if (Array.isArray(bucket)) {
    const i = bucket.indexOf(t)
    if (i !== -1)
      bucket.splice(i, 1)
    if (bucket.length === 1)
      state.buckets.set(k, bucket[0])
    else if (!bucket.length)
      state.buckets.delete(k)
  }
  else if (bucket === t) {
    state.buckets.delete(k)
  }
  state.dirty.add(k)
}

export function resolveTags(head: Unhead<any>, options?: ResolveTagsOptions): HeadTag[] {
  const weightFn = options?.tagWeight ?? head.resolvedOptions._tagWeight ?? DEFAULT_TAG_WEIGHT
  const hooks = (head.hooks as any)?._hooks || {}
  const state: DedupeState = (head as any)._dq ??= {
    buckets: new Map(),
    entryTags: new Map(),
    dirty: new Set(),
    winners: new Map(),
    order: null,
    orderIdx: new Map(),
    flat: false,
  } satisfies DedupeState
  const entries = [...head.entries.values()]
  for (const e of entries) {
    if (e._pending !== undefined) {
      e.input = e._pending
      delete e._pending
      delete e._tags
    }
  }
  if (hooks['entries:resolve'])
    callHook(head, 'entries:resolve', { entries, tagMap: new Map(), tags: [] })
  for (const e of entries) {
    if (!e._tags) {
      if (isStaticEntry(e.input)) {
        e._tags = materializeStaticEntry(e.input, e, weightFn)
        continue
      }
      let tags = normalizeEntryToTags(e.input, head.resolvedOptions.propResolvers || [])
      if (e.options && Object.keys(e.options).length) {
        for (const t of tags) Object.assign(t, e.options)
      }
      if (hooks['entries:normalize']) {
        const normalizeCtx = { tags, entry: e }
        callSyncHook(head, 'entries:normalize', normalizeCtx)
        tags = normalizeCtx.tags
      }
      e._tags = tags.map((t, i) => {
        t._w = weightFn(t)
        t._p = (e._i << 10) + i
        t._d = dedupeKey(t)
        if (!t._d)
          t._h = hashTag(t)
        return t
      })
    }
  }
  // diff entries against the dedupe state: only changed entries touch buckets
  for (const [i, old] of state.entryTags) {
    const e = head.entries.get(i)
    if (!e || e._tags !== old) {
      for (const t of old) removeTag(state, t)
      state.entryTags.delete(i)
    }
  }
  for (const e of entries) {
    if (state.entryTags.get(e._i) !== e._tags) {
      for (const t of e._tags!) insertTag(state, t)
      state.entryTags.set(e._i, e._tags!)
    }
  }
  if (state.dirty.size) {
    for (const k of state.dirty) {
      foldBucket(state, k)
      if (state.order) {
        // same-shape patch fast path: if the key still exists with an
        // unchanged anchor (_w, _p), swap the winner in place — no resort
        const bucket = state.buckets.get(k)
        const idx = state.orderIdx.get(k)
        const slot = idx !== undefined ? state.order[idx] : undefined
        if (!bucket || !slot) {
          state.order = null
          continue
        }
        const multi = Array.isArray(bucket)
        const anchor = multi ? (bucket as HeadTag[])[0] : bucket as HeadTag
        const w = multi ? state.winners.get(k)! : bucket as HeadTag
        if (anchor._w !== slot.aw || anchor._p !== slot.ap || Array.isArray(w) || Array.isArray(slot.w))
          state.order = null
        else
          slot.w = w
      }
    }
    state.dirty.clear()
  }
  if (!state.order) {
    // emit order anchors each winner at its bucket's earliest-sorted candidate,
    // matching the first-seen insertion order of the previous full-list dedupe
    const slots: OrderSlot[] = []
    let flat = false
    for (const [k, bucket] of state.buckets) {
      const multi = Array.isArray(bucket)
      const anchor = multi ? (bucket as HeadTag[])[0] : bucket as HeadTag
      const w = multi ? state.winners.get(k)! : bucket as HeadTag
      flat = flat || Array.isArray(w)
      slots.push({ k, w, aw: anchor._w!, ap: anchor._p! })
    }
    slots.sort((a, b) => a.aw === b.aw ? a.ap - b.ap : a.aw - b.aw)
    state.orderIdx.clear()
    for (let i = 0; i < slots.length; i++)
      state.orderIdx.set(slots[i].k, i)
    state.order = slots
    state.flat = flat
  }
  // emit: per-render view over the shared winners. Tags are immutable —
  // hooks replace array elements with new objects instead of mutating
  const ctx: ResolveTagsContext = { tagMap: new Map(), tags: [] }
  for (const slot of state.order)
    ctx.tagMap.set(slot.k, slot.w as HeadTag)
  resolveTitleTemplate(ctx, head)
  ctx.tags = [...ctx.tagMap.values()]
  if (state.flat)
    ctx.tags = ctx.tags.flat().sort(sortTags)
  callSyncHook(head, 'tags:resolve', ctx)
  return sanitizeTags(ctx.tags)
}
