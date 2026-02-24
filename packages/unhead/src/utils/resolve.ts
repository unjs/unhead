import type { HeadTag, Unhead } from '../types'
import { UsesMergeStrategy, ValidHeadTags } from './const'
import { dedupeKey, isMetaArrayDupeKey } from './dedupe'
import { callHook } from './hooks'
import { normalizeEntryToTags } from './normalize'

// @ts-expect-error untyped
const sortTags = (a: HeadTag, b: HeadTag) => a._w === b._w ? a._p - b._p : a._w - b._w

export interface ResolveTagsContext {
  tagMap: Map<string, HeadTag>
  tags: HeadTag[]
}

export interface ResolveTagsOptions {
  tagWeight?: (tag: HeadTag) => number
}

export function dedupeTags(ctx: ResolveTagsContext): boolean {
  let hasFlatMeta = false
  for (const next of ctx.tags.sort(sortTags)) {
    const k = String(next._d || next._p)
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
    tpl.tag = 'title'
    tpl.textContent = v
  }
}

export function sanitizeTags(tags: HeadTag[]): HeadTag[] {
  return tags.filter((t) => {
    const { innerHTML, tag, props } = t
    if (!ValidHeadTags.has(tag) || (!Object.keys(props).length && !innerHTML && !t.textContent))
      return false
    if (tag === 'meta' && !props.content && !props['http-equiv'] && !props.charset)
      return false
    if (tag === 'script' && innerHTML) {
      t.innerHTML = String(props.type).endsWith('json')
        ? (typeof innerHTML === 'string' ? innerHTML : JSON.stringify(innerHTML)).replace(/</g, '\\u003C')
        : typeof innerHTML === 'string' ? innerHTML.replace(/<\/script/g, '<\\/script') : innerHTML
      t._d = dedupeKey(t)
    }
    return true
  })
}

export function resolveTags(head: Unhead<any>, options?: ResolveTagsOptions): HeadTag[] {
  const weightFn = options?.tagWeight ?? head.resolvedOptions._tagWeight ?? (() => 100)
  const ctx: ResolveTagsContext = { tagMap: new Map(), tags: [] }
  const entries = [...head.entries.values()]
  for (const e of entries) {
    if (e._pending !== undefined) {
      e.input = e._pending
      delete e._pending
      delete e._tags
    }
  }
  callHook(head, 'entries:resolve', { entries, ...ctx })
  for (const e of entries) {
    if (!e._tags) {
      const normalizeCtx = {
        tags: normalizeEntryToTags(e.input, head.resolvedOptions.propResolvers || []).map(t => Object.assign(t, e.options)),
        entry: e,
      }
      callHook(head, 'entries:normalize', normalizeCtx)
      e._tags = normalizeCtx.tags.map((t, i) => {
        t._w = weightFn(t)
        t._p = (e._i << 10) + i
        t._d = dedupeKey(t)
        return t
      })
    }
  }
  ctx.tags = entries.flatMap(e => (e._tags || []).map(t => ({ ...t, props: { ...t.props } })))
  const hasFlatMeta = dedupeTags(ctx)
  resolveTitleTemplate(ctx, head)
  ctx.tags = Array.from(ctx.tagMap.values())
  if (hasFlatMeta)
    ctx.tags = ctx.tags.flat().sort(sortTags)
  callHook(head, 'tags:beforeResolve', ctx)
  callHook(head, 'tags:resolve', ctx)
  callHook(head, 'tags:afterResolve', ctx)
  return sanitizeTags(ctx.tags)
}
