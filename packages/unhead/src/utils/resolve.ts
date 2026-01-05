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

/**
 * Deduplicate tags into a tagMap using merge strategies.
 * Returns whether flat meta arrays were encountered.
 */
export function dedupeTags(ctx: ResolveTagsContext): boolean {
  let hasFlatMeta = false
  ctx.tags
    .sort(sortTags)
    .reduce((acc, next) => {
      const k = String(next._d || next._p)
      if (!acc.has(k))
        return acc.set(k, next)

      const prev = acc.get(k)!
      const strategy = next?.tagDuplicateStrategy || (UsesMergeStrategy.has(next.tag) ? 'merge' : null)
        || (next.key && next.key === prev.key ? 'merge' : null)

      if (strategy === 'merge') {
        const newProps = { ...prev.props }
        Object.entries(next.props).forEach(([p, v]) =>
          // @ts-expect-error untyped
          newProps[p] = p === 'style'
            // @ts-expect-error untyped
            ? new Map([...(prev.props.style || new Map()), ...v])
            : p === 'class' ? new Set([...(prev.props.class || new Set()), ...v]) : v)
        acc.set(k, { ...next, props: newProps })
      }
      else if ((next._p! >> 10) === (prev._p! >> 10) && next.tag === 'meta' && isMetaArrayDupeKey(k)) {
        acc.set(k, Object.assign([...(Array.isArray(prev) ? prev : [prev]), next], next))
        hasFlatMeta = true
      }
      // @ts-expect-error untyped
      else if (next._w === prev._w ? next._p! > prev._p! : next?._w < prev?._w) {
        acc.set(k, next)
      }
      return acc
    }, ctx.tagMap)

  return hasFlatMeta
}

/**
 * Process title template and update the tagMap.
 */
export function resolveTitleTemplate(ctx: ResolveTagsContext, head: Unhead<any>): void {
  const { tagMap } = ctx
  const title = tagMap.get('title')
  const titleTemplate = tagMap.get('titleTemplate')
  head._title = title?.textContent

  if (titleTemplate) {
    const titleTemplateFn = titleTemplate?.textContent
    head._titleTemplate = titleTemplateFn
    if (titleTemplateFn) {
      // @ts-expect-error untyped
      let newTitle = (typeof titleTemplateFn === 'function' ? titleTemplateFn(title?.textContent) : titleTemplateFn)
      if (typeof newTitle === 'string' && !head.plugins.has('template-params')) {
        newTitle = newTitle.replace('%s', title?.textContent || '')
      }
      if (title) {
        newTitle === null
          ? tagMap.delete('title')
          : tagMap.set('title', { ...title, textContent: newTitle })
      }
      else {
        titleTemplate.tag = 'title'
        titleTemplate.textContent = newTitle
      }
    }
  }
}

/**
 * Filter invalid tags and apply XSS sanitization.
 */
export function sanitizeTags(tags: HeadTag[]): HeadTag[] {
  const finalTags: HeadTag[] = []
  for (const t of tags) {
    const { innerHTML, tag, props } = t
    if (!ValidHeadTags.has(tag)) {
      continue
    }
    if (Object.keys(props).length === 0 && !t.innerHTML && !t.textContent) {
      continue
    }
    if (tag === 'meta' && !props.content && !props['http-equiv'] && !props.charset) {
      continue
    }
    if (tag === 'script' && innerHTML) {
      if (String(props.type).endsWith('json')) {
        const v = typeof innerHTML === 'string' ? innerHTML : JSON.stringify(innerHTML)
        t.innerHTML = v.replace(/</g, '\\u003C')
      }
      else if (typeof innerHTML === 'string') {
        t.innerHTML = innerHTML.replace(new RegExp(`</${tag}`, 'g'), `<\\/${tag}`)
      }
      t._d = dedupeKey(t)
    }
    finalTags.push(t)
  }
  return finalTags
}

/**
 * Resolve tags from a head instance.
 */
export function resolveTags(head: Unhead<any>, options?: ResolveTagsOptions): HeadTag[] {
  const weightFn = options?.tagWeight ?? head.resolvedOptions._tagWeight ?? (() => 100)
  const ctx: ResolveTagsContext = {
    tagMap: new Map(),
    tags: [],
  }
  const entries = [...head.entries.values()]

  callHook(head, 'entries:resolve', { entries, ...ctx })

  // Normalize dirty entries (all for server, only dirty for client)
  for (const e of entries) {
    if (e._dirty || !e._tags) {
      e._dirty = false
      const normalizeCtx = {
        tags: normalizeEntryToTags(e.input, head.resolvedOptions.propResolvers || [])
          .map(t => Object.assign(t, e.options)),
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

  // Collect tags from entries
  ctx.tags = entries.flatMap(e => (e._tags || []).map(t => ({ ...t, props: { ...t.props } })))

  // Dedupe tags into tagMap
  const hasFlatMeta = dedupeTags(ctx)

  // Process title template
  resolveTitleTemplate(ctx, head)

  // Flatten tagMap to tags array
  ctx.tags = Array.from(ctx.tagMap.values())
  if (hasFlatMeta) {
    ctx.tags = ctx.tags.flat().sort(sortTags)
  }

  callHook(head, 'tags:beforeResolve', ctx)
  callHook(head, 'tags:resolve', ctx)
  callHook(head, 'tags:afterResolve', ctx)

  // Filter and sanitize
  return sanitizeTags(ctx.tags)
}
