import type { HeadEntry, HeadTag, Unhead } from '../types'
import { UsesMergeStrategy, ValidHeadTags } from './const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from './dedupe'
import { callHook } from './hooks'
import { normalizeEntryToTags } from './normalize'

const LT_RE = /</g
const SCRIPT_END_RE = /<\/script/g

// @ts-expect-error untyped
const sortTags = (a: HeadTag, b: HeadTag) => a._w === b._w ? a._p - b._p : a._w - b._w

const DEFAULT_TAG_WEIGHT = () => 100

// emptiness check without allocating an Object.keys array (runs per tag in sanitizeTags)
function isEmptyProps(props: Record<string, any>): boolean {
  // eslint-disable-next-line no-unreachable-loop -- intentional: any key means non-empty
  for (const _ in props)
    return false
  return true
}

interface PrecompiledHeadInput {
  _c: 1
  t: [HeadTag['tag'] | 'm' | 't' | 'T', Record<string, any> | [0 | 1 | 2, any, any], (Record<string, any> | string)?][]
}

function revivePrecompiledTags(input: PrecompiledHeadInput): HeadTag[] {
  const tags: HeadTag[] = []
  for (const tuple of input.t) {
    if (!Array.isArray(tuple) || typeof tuple[0] !== 'string')
      continue
    const [encodedTagName, encodedProps, extra] = tuple
    const tagName = encodedTagName === 'm' ? 'meta' : encodedTagName === 't' ? 'title' : encodedTagName === 'T' ? 'titleTemplate' : encodedTagName
    const props: Record<string, any> = Array.isArray(encodedProps)
      ? { [encodedProps[0] ? encodedProps[0] === 1 ? 'property' : 'http-equiv' : 'name']: encodedProps[1], content: encodedProps[2] }
      : { ...encodedProps }
    if (tagName !== 'templateParams') {
      if (props.class != null)
        props.class = new Set(Array.isArray(props.class) ? props.class : [])
      if (props.style != null)
        props.style = new Map((Array.isArray(props.style) ? props.style.filter(Array.isArray) : []) as [string, string][])
    }
    tags.push({
      ...(typeof extra === 'string' ? { textContent: extra } : extra),
      tag: tagName,
      props,
    } as HeadTag)
  }
  return tags
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

// clone each resolved tag so hooks can't mutate the entry cache; class/style
// are containers and need their own copies
function cloneTagsInPlace(tags: HeadTag[]) {
  for (let i = 0; i < tags.length; i++) {
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

export function dedupeTags(ctx: ResolveTagsContext): boolean {
  let hasFlatMeta = false
  for (const next of ctx.tags.sort(sortTags)) {
    const k = next._d || hashTag(next)
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
          ? new Map([...(prev.props.style || new Map()) as any, ...next.props[p] as any])
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

// compacts in place: `tags` must be owned by the caller (resolveTags owns its
// freshly resolved array); deliberately not exported — the `unhead/utils`
// subpath re-exports everything and this mutating variant is not public API
function sanitizeTagsInPlace(tags: HeadTag[]): HeadTag[] {
  let w = 0
  for (let t of tags) {
    const { innerHTML, tag, props } = t
    if (!ValidHeadTags.has(tag) || (isEmptyProps(props) && !innerHTML && !t.textContent))
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
    tags[w++] = t
  }
  tags.length = w
  return tags
}

// public contract: returns a new array and leaves the input untouched
export function sanitizeTags(tags: HeadTag[]): HeadTag[] {
  return sanitizeTagsInPlace([...tags])
}

export function resolveTags(head: Unhead<any>, options?: ResolveTagsOptions): HeadTag[] {
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
  if (hooks['entries:resolve']?.length || hooks['entries:normalize']?.length) {
    entries = [...head.entries.values()]
    if (hooks['entries:resolve']?.length)
      callHook(head, 'entries:resolve', { entries, ...ctx })
  }
  syncEntryHookCache(head, hooks)
  for (const e of entries || head.entries.values()) {
    let tags = e._tags
    if (!tags) {
      // Precomputed shared tags (SSR default init entry, see server/createHead.ts).
      // Valid only while nothing can observe or alter normalization for this entry:
      // no per-resolve tagWeight override (the array was weighted with the head's
      // default weight fn), no entries:normalize hook (it must see every entry's
      // tags, e.g. the legacy DeprecationsPlugin), no entries:resolve hook (its
      // listeners may reach and mutate `_tags`, and this array is SHARED across
      // head instances), and no entry options (they get assigned onto each tag).
      // Deliberately NOT cached on `e._tags` so a hook registered between renders
      // takes the normalize path instead of reaching the shared array.
      if (e._precomputedTags
        && weightFn === head.resolvedOptions._tagWeight
        && !entries
        && (!e.options || isEmptyProps(e.options))) {
        tags = e._precomputedTags
      }
      else {
        const input = e.input as PrecompiledHeadInput
        const precompiled = input?._c === 1
          && Array.isArray(input.t)
          && Object.keys(input).length === 2
        const propResolvers = head.resolvedOptions.propResolvers || []
        // eslint-disable-next-line node/prefer-global/process -- left as a direct expression so downstream Vite/Webpack/Rspack builds can replace NODE_ENV
        if (precompiled && typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
          const resolver = propResolvers.find(resolver => !resolver._static)
          if (resolver)
            throw new Error(`[unhead] ${resolver.name || 'anonymous'} is not static`)
        }
        tags = precompiled
          ? revivePrecompiledTags(input)
          : normalizeEntryToTags(e.input, propResolvers)
        const hasOptions = !!(e.options && !isEmptyProps(e.options))
        if (hasOptions) {
          for (const t of tags)
            Object.assign(t, e.options)
        }
        // re-read per entry: an earlier listener may have (un)registered hooks
        if (hooks['entries:normalize']?.length) {
          const normalizeCtx = { tags, entry: e }
          callHook(head, 'entries:normalize', normalizeCtx)
          tags = normalizeCtx.tags
        }
        for (let i = 0; i < tags.length; i++) {
          const t = tags[i]
          t._w = weightFn(t)
          t._p = (e._i << 10) + i
          t._d = dedupeKey(t)
          if (!t._d)
            t._h = hashTag(t)
        }
        e._tags = tags
      }
    }
    ctx.tags.push(...tags)
  }
  // scanned after the entry loop so hooks registered by listeners during this
  // resolve are still honored for the defensive clone
  for (const name in hooks) {
    if (hooks[name]?.length && TAG_MUTATING_HOOK_RE.test(name)) {
      cloneTagsInPlace(ctx.tags)
      break
    }
  }
  const hasFlatMeta = dedupeTags(ctx)
  resolveTitleTemplate(ctx, head)
  valuesToTags(ctx, hasFlatMeta)
  callHook(head, 'tags:beforeResolve', ctx)
  callHook(head, 'tags:resolve', ctx)
  callHook(head, 'tags:afterResolve', ctx)
  return sanitizeTagsInPlace(ctx.tags)
}
