import type { HeadInputView, InputValueKind, TagInput } from './types'

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

const TAG_TYPES = new Set(['meta', 'link', 'script', 'noscript', 'style', 'htmlAttrs', 'bodyAttrs'])

function valueKind(value: unknown): InputValueKind {
  if (value === null)
    return 'null'
  if (Array.isArray(value))
    return 'array'
  const kind = typeof value
  if (kind === 'boolean' || kind === 'function' || kind === 'number' || kind === 'object' || kind === 'string')
    return kind
  return 'unknown'
}

/**
 * Adapt a runtime tag (post-resolve `HeadTag`) into a {@link TagInput} that
 * predicates can read. Coerces `props.content` to a string and lowercases
 * `meta[name]` to mirror HTML's case-insensitive `name=` semantics, matching
 * the runtime `ValidatePlugin`'s pre-existing behaviour.
 *
 * Returns `undefined` when the tag is not one of the validated tag or
 * attribute-object types (`title`, `base`, etc. are handled separately).
 */
export function tagInputFromRuntime(tag: RuntimeHeadTag): TagInput | undefined {
  if (!TAG_TYPES.has(tag.tag))
    return undefined

  const props: TagInput['props'] = {}
  const keys = new Set<string>()
  const valueKinds = new Map<string, InputValueKind>()
  for (const [k, v] of Object.entries(tag.props)) {
    keys.add(k)
    valueKinds.set(k, valueKind(v))
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
      // Primitive predicates consume `props`; structural predicates use the
      // original shape retained in `valueKinds`.
      props[k] = String(v)
    }
  }

  // Mirror runtime convention: `script-src-with-content` checks innerHTML/
  // textContent on the tag itself, not in `props`. Surface their presence via
  // `keys` so the predicate's `keys.has('innerHTML')` check works.
  if (tag.tag === 'script' || tag.tag === 'style' || tag.tag === 'noscript') {
    if (tag.innerHTML != null && tag.innerHTML !== '') {
      keys.add('innerHTML')
      valueKinds.set('innerHTML', valueKind(tag.innerHTML))
    }
    if (tag.textContent != null && tag.textContent !== '') {
      keys.add('textContent')
      valueKinds.set('textContent', valueKind(tag.textContent))
    }
  }

  // Surface the top-level `tagPriority` field so the `numeric-tag-priority`
  // predicate (which inspects `props.tagPriority`) fires for runtime tags.
  if (tag.tagPriority != null) {
    keys.add('tagPriority')
    valueKinds.set('tagPriority', valueKind(tag.tagPriority))
    if (typeof tag.tagPriority === 'string' || typeof tag.tagPriority === 'number')
      props.tagPriority = tag.tagPriority
  }

  return {
    tagType: tag.tag as TagInput['tagType'],
    props,
    keys,
    valueKinds,
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
