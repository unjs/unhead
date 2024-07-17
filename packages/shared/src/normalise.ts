import type { Head, HeadEntry, HeadTag } from '@unhead/schema'
import { type Thenable, thenable } from './thenable'
import { TagConfigKeys, TagsWithInnerContent, ValidHeadTags } from '.'

export function normaliseTag<T extends HeadTag>(tagName: T['tag'], input: HeadTag['props'] | string, e: HeadEntry<T>, normalizedProps?: HeadTag['props']): Thenable<T | T[]> {
  const props = normalizedProps || normaliseProps<T>(
    // explicitly check for an object
    // @ts-expect-error untyped
    typeof input === 'object' && typeof input !== 'function' && !(input instanceof Promise)
      ? { ...input }
      : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: input },
    (tagName === 'templateParams' || tagName === 'titleTemplate'),
  )

  if (props instanceof Promise) {
    return props.then(val => normaliseTag(tagName, input, e, val))
  }

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
      // strip innerHTML and textContent for tags which don't support it=
      if (!(k === 'innerHTML' || k === 'textContent' || k === 'children') || TagsWithInnerContent.has(tag.tag)) {
        // @ts-expect-error untyped
        tag[k === 'children' ? 'innerHTML' : k] = val
      }
      delete tag.props[k]
    }
  }
  // TODO remove v2
  if (tag.props.body) {
    // inserting dangerous javascript potentially
    tag.tagPosition = 'bodyClose'
    // clean up
    delete tag.props.body
  }
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
  if (typeof v === 'object' && !Array.isArray(v)) {
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

function nestedNormaliseProps<T extends HeadTag>(
  props: T['props'],
  virtual: boolean,
  keys: (keyof T['props'])[],
  startIndex: number,
): Thenable<void> {
  for (let i = startIndex; i < keys.length; i += 1) {
    const k = keys[i]
    // handle boolean props, see https://html.spec.whatwg.org/#boolean-attributes
    // class has special handling
    if (k === 'class' || k === 'style') {
      // @ts-expect-error untyped
      props[k] = normaliseStyleClassProps(k, props[k])
      continue
    }

    // @ts-expect-error no reason for: The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter.
    if (props[k] instanceof Promise) {
      return props[k].then((val) => {
        props[k] = val

        return nestedNormaliseProps(props, virtual, keys, i)
      })
    }

    if (!virtual && !TagConfigKeys.has(k as string)) {
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
}

export function normaliseProps<T extends HeadTag>(props: T['props'], virtual: boolean = false): Thenable<T['props']> {
  const resolvedProps = nestedNormaliseProps(props, virtual, Object.keys(props), 0)

  if (resolvedProps instanceof Promise) {
    return resolvedProps.then(() => props)
  }

  return props
}

// support 1024 tag ids per entry (includes updates)
export const TagEntityBits = 10

function nestedNormaliseEntryTags(headTags: HeadTag[], tagPromises: Thenable<HeadTag | HeadTag[]>[], startIndex: number): Thenable<unknown> {
  for (let i = startIndex; i < tagPromises.length; i += 1) {
    const tags = tagPromises[i]

    if (tags instanceof Promise) {
      return tags.then((val) => {
        tagPromises[i] = val

        return nestedNormaliseEntryTags(headTags, tagPromises, i)
      })
    }

    if (Array.isArray(tags)) {
      headTags.push(...tags)
    }
    else {
      headTags.push(tags)
    }
  }
}

export function normaliseEntryTags<T extends object = Head>(e: HeadEntry<T>): Thenable<HeadTag[]> {
  const tagPromises: Thenable<HeadTag | HeadTag[]>[] = []
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
      // @ts-expect-error untyped
      tagPromises.push(...v.map(props => normaliseTag(k as keyof Head, props, e)))
      continue
    }
    // @ts-expect-error untyped
    tagPromises.push(normaliseTag(k as keyof Head, v, e))
  }

  if (tagPromises.length === 0) {
    return []
  }

  const headTags: HeadTag[] = []

  return thenable(nestedNormaliseEntryTags(headTags, tagPromises, 0), () => (
    headTags.map((t, i) => {
      t._e = e._i
      e.mode && (t._m = e.mode)
      t._p = (e._i << TagEntityBits) + i
      return t
    })
  ))
}
