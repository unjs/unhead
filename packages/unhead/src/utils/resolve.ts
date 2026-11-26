import type { HeadEntry, HeadTag, Unhead } from '../types'
import { callHook } from './callHook'
import { hasContent, isJsonScriptType, UsesMergeStrategy, ValidHeadTags } from './const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from './dedupe'
import { normalizeEntryToTags } from './normalize'

declare const __UNHEAD_LAZY_RENDERER__: boolean

const LT_RE = /</g
const SCRIPT_END_RE = /<\/script/g

// @ts-expect-error untyped
const sortTags = (a: HeadTag, b: HeadTag) => a._w === b._w ? a._p - b._p : a._w - b._w

const DEFAULT_TAG_WEIGHT = () => 100

// emptiness check without allocating an Object.keys array (runs per tag in sanitizeTags).
// Not in the `unhead/utils` export list, so it stays internal.
export function isEmptyProps(props: Record<string, any>): boolean {
  // eslint-disable-next-line no-unreachable-loop -- intentional: any key means non-empty
  for (const _ in props)
    return false
  return true
}

// matches hooks that receive references to resolved tags and may mutate them in place
const TAG_MUTATING_HOOK_RE = /^tags:|:render/

function syncEntryHookCache(head: Unhead<any>, hooks: Record<string, any>) {
  const count = (hooks['entries:resolve']?.length || 0) + (hooks['entries:normalize']?.length || 0)
  if (head._h !== count) {
    head._h = count
    for (const entry of head.entries.values())
      delete entry._tags
  }
}

export interface ResolveTagsContext {
  tagMap: Map<string, HeadTag>
  tags: HeadTag[]
}

export interface ResolveTagsOptions {
  tagWeight?: (tag: HeadTag) => number
}

function hasTagMutatingHooks(hooks: Record<string, any>): boolean {
  for (const name in hooks) {
    if (hooks[name]?.length && TAG_MUTATING_HOOK_RE.test(name))
      return true
  }
  return false
}

// clone resolved tags from `start` so hooks can't mutate the entry cache;
// class/style are containers and need their own copies
function cloneTagsInPlace(tags: HeadTag[], start = 0) {
  for (let i = start; i < tags.length; i++) {
    const t = tags[i]
    const props: Record<string, any> = { ...t.props }
    if (props.class instanceof Set)
      props.class = new Set(props.class)
    if (props.style instanceof Map)
      props.style = new Map(props.style)
    tags[i] = { ...t, props }
  }
}

function valuesToTags(ctx: ResolveTagsContext, sortFlatMeta: boolean) {
  // reuse the pre-dedupe array; the map never holds more tags than went in
  const tags = ctx.tags
  let w = 0
  for (const value of ctx.tagMap.values()) {
    if (Array.isArray(value)) {
      for (const tag of value) tags[w++] = tag
    }
    else {
      tags[w++] = value
    }
  }
  tags.length = w
  if (sortFlatMeta)
    tags.sort(sortTags)
}

export function dedupeTags(ctx: ResolveTagsContext, contentKey?: (tag: HeadTag) => string | undefined): boolean {
  let hasFlatMeta = false
  for (const next of ctx.tags.sort(sortTags)) {
    const k = next._d || contentKey?.(next) || hashTag(next)
    if (!k)
      continue
    const prev = ctx.tagMap.get(k)
    if (!prev) {
      ctx.tagMap.set(k, next)
      continue
    }
    const strategy = next.tagDuplicateStrategy || (UsesMergeStrategy.has(next.tag) ? 'merge' : null) || (next.key && next.key === prev.key ? 'merge' : null)
    if (strategy === 'merge') {
      const props = { ...prev.props }
      for (const p in next.props) {
        // @ts-expect-error untyped - style is Map, class is Set at runtime
        props[p] = p === 'style'
          ? new Map([...(prev.props.style || []) as any, ...next.props[p] as any])
          : p === 'class' ? new Set([...(prev.props.class || []) as any, ...next.props[p] as any]) : next.props[p]
      }
      ctx.tagMap.set(k, { ...next, props })
    }
    else if ((next._p! >> 10) === (prev._p! >> 10) && next.tag === 'meta' && isMetaArrayDupeKey(k)) {
      ctx.tagMap.set(k, Object.assign([...(Array.isArray(prev) ? prev : [prev]), next], next))
      hasFlatMeta = true
    }
    // @ts-expect-error untyped
    else if (next._w === prev._w ? next._p! > prev._p! : next._w < prev._w) {
      ctx.tagMap.set(k, next)
    }
  }
  return hasFlatMeta
}

export function resolveTitleTemplate(ctx: ResolveTagsContext, head: Unhead<any>, adoption = false): void {
  const title = ctx.tagMap.get('title')
  const tpl = ctx.tagMap.get('titleTemplate')
  head._title = title?.textContent
  head._titleSafe = title?._safe
  if (!tpl)
    return
  const fn = tpl.textContent
  head._titleTemplate = fn
  if (!fn)
    return
  // Adoption only needs title ownership. Retired callbacks may reference disposed state.
  let v = (typeof __UNHEAD_LAZY_RENDERER__ === 'undefined' || __UNHEAD_LAZY_RENDERER__) && adoption
    ? head.resolvedOptions.document?.title
    // @ts-expect-error titleTemplate can store a function in textContent
    : typeof fn === 'function' ? fn(title?.textContent) : fn
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

// compacts in place: `tags` must be owned by the caller (resolveTags owns its
// freshly resolved array); deliberately not exported — the `unhead/utils`
// subpath re-exports everything and this mutating variant is not public API
function sanitizeTagsInPlace(tags: HeadTag[], ssr = false): HeadTag[] {
  let w = 0
  for (let t of tags) {
    const { innerHTML, tag, props } = t
    if (!ValidHeadTags.has(tag) || (isEmptyProps(props) && !hasContent(innerHTML) && !hasContent(t.textContent)))
      continue
    if (tag === 'meta') {
      if (!hasContent(props.content) && !props['http-equiv'] && !props.charset)
        continue
    }
    if (tag === 'script' && (innerHTML || t.textContent)) {
      const isJsonLike = isJsonScriptType(String(props.type))
      const escape = (content: unknown): unknown => isJsonLike
        ? (typeof content === 'string' ? content : JSON.stringify(content)).replace(LT_RE, '\\u003C')
        : typeof content === 'string' ? content.replace(SCRIPT_END_RE, '<\\/script') : content
      // copy-on-write: resolved tags may be shared with the entry cache
      t = { ...t }
      if (innerHTML)
        t.innerHTML = escape(innerHTML) as typeof innerHTML
      if (t.textContent)
        t.textContent = escape(t.textContent) as typeof t.textContent
      if (t._d || !ssr)
        t._d = dedupeKey(t)
    }
    tags[w++] = t
  }
  tags.length = w
  return tags
}

// public contract: returns a new array and leaves the input untouched
export function sanitizeTags(tags: HeadTag[]): HeadTag[] {
  return sanitizeTagsInPlace([...tags])
}

export function resolveTags(head: Unhead<any>, options?: ResolveTagsOptions, adoption = false): HeadTag[] {
  const lazyRenderer = typeof __UNHEAD_LAZY_RENDERER__ === 'undefined' || __UNHEAD_LAZY_RENDERER__
  const weightFn = options?.tagWeight ?? head.resolvedOptions._tagWeight ?? DEFAULT_TAG_WEIGHT
  const ctx: ResolveTagsContext = { tagMap: new Map(), tags: [] }
  const hooks = (head.hooks as any)?._hooks || {}
  syncEntryHookCache(head, hooks)
  for (const e of head.entries.values()) {
    if (e._pending !== undefined) {
      e.input = e._pending
      delete e._pending
      delete e._tags
      delete e._precomputedTags
    }
  }
  // snapshot the entries whenever a listener can run inside the entry loop:
  // a live Map iterator would feed entries pushed mid-resolve (e.g. by an
  // entries:normalize listener) back into this same resolve — the snapshot
  // defers them to the next resolve, matching the previous behavior. The
  // entries:resolve array is also part of that hook's contract: listeners
  // may mutate it (push/splice) to change which entries resolve.
  let entries: HeadEntry<any>[] | undefined
  // syncEntryHookCache just set `_h` to the count of entries:resolve and entries:normalize listeners
  if (head._h) {
    entries = [...head.entries.values()]
    callHook(head, 'entries:resolve', { entries, ...ctx })
  }
  syncEntryHookCache(head, hooks)
  // On non-streaming SSR with tag-mutating hooks already registered, freshly normalized
  // tags are owned exclusively by this render: skipping `e._tags` avoids cloning every
  // tag right after allocating it, while repeated SSR renders stay isolated by re-normalizing.
  const mayMutateTags = hasTagMutatingHooks(hooks)
  const skipSsrCache = head.ssr && !head._stream && mayMutateTags
  for (const e of entries || head.entries.values()) {
    let tags = e._tags
    let shared = !!tags
    if (!tags) {
      // Only the server head sets `_precomputed`: it returns the entry's shared precomputed
      // tags while they are valid (see server/createHead.ts), so client bundles skip the check.
      tags = head.resolvedOptions._precomputed?.(e, weightFn, hooks)
      if (tags) {
        shared = true
      }
      else {
        tags = normalizeEntryToTags(e.input, head.resolvedOptions.propResolvers || [])
        if (e.options && !isEmptyProps(e.options)) {
          for (const t of tags)
            Object.assign(t, e.options)
        }
        // re-read per entry: an earlier listener may have (un)registered hooks
        if (hooks['entries:normalize']?.length) {
          const normalizeCtx = { tags, entry: e }
          callHook(head, 'entries:normalize', normalizeCtx)
          tags = normalizeCtx.tags
        }
        const ck = head.resolvedOptions._contentKey
        for (let i = 0; i < tags.length; i++) {
          const t = tags[i]
          t._w = weightFn(t)
          t._p = ((lazyRenderer ? (e._order ?? e._i) : e._i) << 10) + i
          t._d = dedupeKey(t, !!ck)
          if (!t._d && !(ck && (t.textContent || t.innerHTML)))
            t._h = hashTag(t)
        }
        if (!skipSsrCache) {
          e._tags = tags
          shared = true
        }
      }
    }
    const start = ctx.tags.length
    ctx.tags.push(...tags)
    if (shared && mayMutateTags)
      cloneTagsInPlace(ctx.tags, start)
  }
  // scanned after the entry loop so hooks registered by listeners during this
  // resolve are still honored for the defensive clone
  if (!mayMutateTags && hasTagMutatingHooks(hooks))
    cloneTagsInPlace(ctx.tags)
  const hasFlatMeta = dedupeTags(ctx, head.resolvedOptions._contentKey?.())
  resolveTitleTemplate(ctx, head, lazyRenderer && adoption)
  valuesToTags(ctx, hasFlatMeta)
  callHook(head, 'tags:beforeResolve', ctx)
  callHook(head, 'tags:resolve', ctx)
  callHook(head, 'tags:afterResolve', ctx)
  return sanitizeTagsInPlace(ctx.tags, head.ssr)
}
