import type { HeadTag, Unhead } from '../types'
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

// matches the hooks that receive references to resolved tags and may mutate them in place
// (tags:beforeResolve, tags:resolve, tags:afterResolve, ssr:render, ssr:rendered, dom:rendered
// and deprecated dom:renderTag — but not *:beforeRender, entries:* or script:updated);
// when none are registered the per-render defensive clone can be skipped
const TAG_MUTATING_HOOK_RE = /^tags:|:render/

export interface ResolveTagsContext {
  tagMap: Map<string, HeadTag>
  tags: HeadTag[]
}

export interface ResolveTagsOptions {
  tagWeight?: (tag: HeadTag) => number
}

function pushEntryTags(ctx: ResolveTagsContext, entries: HeadTag[][], needsClone: boolean) {
  for (const tags of entries) {
    for (const t of tags) {
      if (needsClone) {
        const props: Record<string, any> = { ...t.props }
        // class/style are containers; copy them so hooks can't mutate the entry cache
        if (props.class instanceof Set)
          props.class = new Set(props.class)
        if (props.style instanceof Map)
          props.style = new Map(props.style)
        ctx.tags.push({ ...t, props })
      }
      else {
        ctx.tags.push(t)
      }
    }
  }
}

function valuesToTags(ctx: ResolveTagsContext, sortFlatMeta: boolean) {
  ctx.tags = []
  for (const value of ctx.tagMap.values()) {
    if (Array.isArray(value)) {
      for (const tag of value) ctx.tags.push(tag)
    }
    else {
      ctx.tags.push(value)
    }
  }
  if (sortFlatMeta)
    ctx.tags.sort(sortTags)
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
      const target = props as Record<string, unknown>
      for (const p in next.props) {
        target[p] = p === 'style'
          ? new Map([...(prev.props.style || []), ...(next.props.style || [])])
          : p === 'class' ? new Set([...(prev.props.class || []), ...(next.props.class || [])]) : next.props[p]
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

export function resolveTitleTemplate<Input, RenderResult>(ctx: ResolveTagsContext, head: Unhead<Input, RenderResult>): void {
  const title = ctx.tagMap.get('title')
  const tpl = ctx.tagMap.get('titleTemplate')
  const rawTitle = title?.textContent
  const titleContent = rawTitle == null || typeof rawTitle === 'function' ? undefined : String(rawTitle)
  head._title = titleContent
  head._titleTemplate = undefined
  if (!tpl)
    return
  const fn = tpl.textContent
  if (typeof fn !== 'string' && typeof fn !== 'function')
    return
  head._titleTemplate = fn
  if (!fn)
    return
  let v = typeof fn === 'function' ? fn(titleContent) : fn
  if (typeof v === 'string' && !head.plugins.has('template-params'))
    v = v.replace('%s', titleContent || '')
  if (title) {
    v === null ? ctx.tagMap.delete('title') : ctx.tagMap.set('title', { ...title, textContent: v })
  }
  else if (v === null) {
    ctx.tagMap.delete('titleTemplate')
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
    out.push(t)
  }
  return out
}

export function resolveTags<Input, RenderResult>(head: Unhead<Input, RenderResult>, options?: ResolveTagsOptions): HeadTag[] {
  const weightFn = options?.tagWeight ?? head.resolvedOptions._tagWeight ?? DEFAULT_TAG_WEIGHT
  const ctx: ResolveTagsContext = { tagMap: new Map(), tags: [] }
  const hooks = (head.hooks as any)?._hooks || {}
  const entries = [...head.entries.values()]
  for (const e of entries) {
    if (e._pending !== undefined) {
      e.input = e._pending
      delete e._pending
      delete e._tags
    }
  }
  callHook(head, 'entries:resolve', { entries, ...ctx })
  const entryTags: HeadTag[][] = []
  for (const e of entries) {
    if (!e._tags) {
      const tags = normalizeEntryToTags(e.input, head.resolvedOptions.propResolvers || [])
      for (const t of tags)
        Object.assign(t, e.options)
      const normalizeCtx = {
        tags,
        entry: e,
      }
      callHook(head, 'entries:normalize', normalizeCtx)
      for (let i = 0; i < normalizeCtx.tags.length; i++) {
        let t = normalizeCtx.tags[i]
        if (hooks['tag:normalise']?.length) {
          const tagCtx = {
            tag: t,
            entry: e,
            resolvedOptions: head.resolvedOptions,
          }
          callHook(head, 'tag:normalise', tagCtx)
          t = normalizeCtx.tags[i] = tagCtx.tag
        }
        t._w = weightFn(t)
        t._p = (e._i << 10) + i
        t._d = dedupeKey(t)
        if (!t._d)
          t._h = hashTag(t)
      }
      e._tags = normalizeCtx.tags
    }
    entryTags.push(e._tags)
  }
  let needsClone = false
  for (const k in hooks) {
    if (TAG_MUTATING_HOOK_RE.test(k) && hooks[k]?.some((f: any) => !f._nonMutating)) {
      needsClone = true
      break
    }
  }
  pushEntryTags(ctx, entryTags, needsClone)
  const hasFlatMeta = dedupeTags(ctx)
  resolveTitleTemplate(ctx, head)
  valuesToTags(ctx, hasFlatMeta)
  callHook(head, 'tags:beforeResolve', ctx)
  callHook(head, 'tags:resolve', ctx)
  callHook(head, 'tags:afterResolve', ctx)
  return sanitizeTags(ctx.tags)
}
