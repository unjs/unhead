import type { HeadInputView, TagInput } from './types'

/**
 * Subset of the runtime `HeadTag` shape this adapter needs. We don't import
 * `HeadTag` from `../types` to keep the predicate module free of runtime
 * coupling — anything compatible with this shape works.
 */
export interface RuntimeHeadTag {
  tag: string
  props: Record<string, any>
  innerHTML?: string
  textContent?: string
  /** Top-level priority field on resolved runtime tags. */
  tagPriority?: string | number
}

const TAG_TYPES = new Set(['meta', 'link', 'script', 'noscript', 'style'])

/**
 * Adapt a runtime tag (post-resolve `HeadTag`) into a {@link TagInput} that
 * predicates can read. Coerces `props.content` to a string and lowercases
 * `meta[name]` to mirror HTML's case-insensitive `name=` semantics, matching
 * the runtime `ValidatePlugin`'s pre-existing behaviour.
 *
 * Returns `undefined` when the tag is not one of the validated tag types
 * (`title`, `base`, etc. are handled separately).
 */
export function tagInputFromRuntime(tag: RuntimeHeadTag): TagInput | undefined {
  if (!TAG_TYPES.has(tag.tag))
    return undefined

  const props: TagInput['props'] = {}
  const keys = new Set<string>()
  for (const [k, v] of Object.entries(tag.props)) {
    keys.add(k)
    if (v == null) {
      // Mirror the runtime ValidatePlugin convention of coercing null `content`
      // to an empty string so the empty-meta-content predicate fires when a
      // meta tag has `{ content: null | undefined }`.
      if (tag.tag === 'meta' && k === 'content')
        props[k] = ''
      continue
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      // `meta[name]` is case-insensitive in HTML, normalise so predicates that
      // dispatch on `name === 'robots'` etc. work regardless of casing.
      if (tag.tag === 'meta' && k === 'name' && typeof v === 'string')
        props[k] = v.toLowerCase()
      else
        props[k] = v
    }
    else {
      // Fallback to `String(v)` for anything coerceable; predicates only consume
      // primitives, so non-coerceable values become `[object Object]` and miss
      // every check (which is the safe outcome — runtime warnings are best-effort).
      props[k] = String(v)
    }
  }

  // Mirror runtime convention: `script-src-with-content` checks innerHTML/
  // textContent on the tag itself, not in `props`. Surface their presence via
  // `keys` so the predicate's `keys.has('innerHTML')` check works.
  if (tag.tag === 'script' || tag.tag === 'style' || tag.tag === 'noscript') {
    if (tag.innerHTML != null && tag.innerHTML !== '')
      keys.add('innerHTML')
    if (tag.textContent != null && tag.textContent !== '')
      keys.add('textContent')
  }

  // Surface the top-level `tagPriority` field so the `numeric-tag-priority`
  // predicate (which inspects `props.tagPriority`) fires for runtime tags.
  if (tag.tagPriority != null) {
    keys.add('tagPriority')
    if (typeof tag.tagPriority === 'string' || typeof tag.tagPriority === 'number')
      props.tagPriority = tag.tagPriority
  }

  return {
    tagType: tag.tag as TagInput['tagType'],
    props,
    keys,
  }
}

/**
 * Adapt a `<title>` runtime tag (`tag.tag === 'title'`) into a
 * {@link HeadInputView} so the `no-html-in-title` predicate can run against
 * the resolved title text.
 */
export function titleInputFromRuntime(titleTag: RuntimeHeadTag): HeadInputView | undefined {
  if (titleTag.tag !== 'title')
    return undefined
  const text = titleTag.textContent ?? titleTag.innerHTML ?? ''
  return {
    callee: 'runtime',
    props: { title: text },
    keys: new Set(['title']),
  }
}
