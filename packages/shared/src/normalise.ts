import type { Head, HeadEntry, HeadTag } from '@unhead/schema'
import { DupeableTags, TagConfigKeys, TagsWithInnerContent, ValidHeadTags } from './constants'
import { hashCode } from './hashCode'
import { tagDedupeKey } from './tagDedupeKey'

export function normaliseTag<T extends HeadTag>(tagName: T['tag'], input: HeadTag['props'] | string, e: HeadEntry<T>, normalizedProps?: HeadTag['props']): T | T[] {
  const props = normalizedProps || normaliseProps<T>(
    // explicitly check for an object
    typeof input === 'object' && typeof input !== 'function'
      ? { ...input }
      : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: input },
    (tagName === 'templateParams' || tagName === 'titleTemplate'),
  )
  // input can be a function or an object, we need to clone it
  const tag = {
    tag: tagName,
    props: props as T['props'],
  } as T
  // merge options from the entry
  for (const k of TagConfigKeys) {
    // @ts-expect-error untyped
    const val = tag.props[k] !== undefined ? tag.props[k] : e[k]
    if (val !== undefined) {
      // strip innerHTML and textContent for tags which don't support it
      if (!(k === 'innerHTML' || k === 'textContent') || TagsWithInnerContent.has(tag.tag)) {
        // @ts-expect-error untyped
        tag[k] = val
      }
      delete tag.props[k]
    }
  }
  // only if the user has provided a key
  // only tags which can't dedupe themselves, ssr only
  if (tag.key && DupeableTags.has(tag.tag)) {
    // add a HTML key so the client-side can hydrate without causing duplicates
    tag.props['data-hid'] = tag._h = hashCode(tag.key!)
  }
  const generatedKey = tagDedupeKey(tag)
  if (generatedKey && !generatedKey.startsWith('meta:og:') && !generatedKey.startsWith('meta:twitter:')) {
    delete tag.key
  }
  const dedupe = generatedKey || (tag.key ? `${tag.tag}:${tag.key}` : false)
  if (dedupe)
    tag._d = dedupe
  // shorthand for objects
  if (tag.tag === 'script') {
    if (typeof tag.innerHTML === 'object') {
      tag.innerHTML = JSON.stringify(tag.innerHTML)
      tag.props.type = tag.props.type || 'application/json'
    }
  }
  // allow meta to be resolved into multiple tags if an array is provided on content
  return Array.isArray(tag.props.content)
    ? tag.props.content.map(v => ({ ...tag, props: { ...tag.props, content: v } } as T))
    : tag
}

export function normaliseStyleClassProps<T extends 'class' | 'style'>(key: T, v: Required<Required<Head>['htmlAttrs']['class']> | Required<Required<Head>['htmlAttrs']['style']>) {
  const sep = key === 'class' ? ' ' : ';'
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    v = Object.entries(v)
      .filter(([, v]) => v)
      .map(([k, v]) => key === 'style' ? `${k}:${v}` : k)
  }
  // finally, check we don't have spaces, we may need to split again
  return String((Array.isArray(v) ? v.join(sep) : v))
    ?.split(sep)
    .filter(c => Boolean(c.trim()))
    .join(sep)
}

export function normaliseProps<T extends HeadTag>(props: T['props'], virtual: boolean = false) {
  for (const k in props) {
    // handle boolean props, see https://html.spec.whatwg.org/#boolean-attributes
    // class has special handling
    if (k === 'class' || k === 'style') {
      // @ts-expect-error untyped
      props[k] = normaliseStyleClassProps(k, props[k])
      continue
    }

    if (!virtual && !TagConfigKeys.has(k as string)) {
      if (typeof props[k] === 'function' && !String(k).startsWith('on')) {
        // @ts-expect-error untyped
        props[k] = props[k]()
      }
      const v = String(props[k])
      // data keys get special treatment, we opt for more verbose syntax
      const isDataKey = (k as string).startsWith('data-')
      if (v === 'true' || v === '') {
        // @ts-expect-error untyped
        props[k] = isDataKey ? 'true' : true
      }
      else if (!props[k]) {
        if (isDataKey && v === 'false')
          // @ts-expect-error untyped
          props[k] = 'false'
        else
          delete props[k]
      }
    }
  }
  return props
}

// support 1024 tag ids per entry (includes updates)
export const TagEntityBits = 10

export function normaliseEntryTags<T extends object = Head>(e: HeadEntry<T>): HeadTag[] {
  const tags: (HeadTag | HeadTag[])[] = []
  const input = e.resolvedInput as T
  for (const k in input) {
    if (!Object.prototype.hasOwnProperty.call(input, k)) {
      continue
    }
    const v = input[k as keyof typeof input]
    if (v === undefined || !ValidHeadTags.has(k)) {
      continue
    }
    if (Array.isArray(v)) {
      for (const props of v) {
        // @ts-expect-error untyped
        tags.push(normaliseTag(k as keyof Head, props, e))
      }
      continue
    }
    else if (typeof v === 'function' && k !== 'titleTemplate') {
      // resolve titles that may be functions
      input[k] = v()
      continue
    }
    // @ts-expect-error untyped
    tags.push(normaliseTag(k as keyof Head, v, e))
  }

  return tags.flat().map((t, i) => {
    t._e = e._i
    e.mode && (t._m = e.mode)
    t._p = (e._i << TagEntityBits) + i
    return t
  })
}
