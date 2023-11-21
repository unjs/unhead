import type { Head, HeadEntry, HeadTag } from '@unhead/schema'
import { TagConfigKeys, TagsWithInnerContent, ValidHeadTags, asArray } from '.'

export async function normaliseTag<T extends HeadTag>(tagName: T['tag'], input: HeadTag['props'] | string, e: HeadEntry<T>): Promise<T | T[] | false> {
  // input can be a function or an object, we need to clone it
  const tag = {
    tag: tagName,
    props: await normaliseProps<T>(
      // explicitly check for an object
      // @ts-expect-error untyped
      typeof input === 'object' && typeof input !== 'function' && !(input instanceof Promise)
        ? { ...input }
        : { [['script', 'noscript', 'style'].includes(tagName) ? 'innerHTML' : 'textContent']: input },
      ['templateParams', 'titleTemplate'].includes(tagName),
    ),
  } as T
  // merge options from the entry
  TagConfigKeys.forEach((k) => {
    // @ts-expect-error untyped
    const val = typeof tag.props[k] !== 'undefined' ? tag.props[k] : e[k]
    if (typeof val !== 'undefined') {
      // strip innerHTML and textContent for tags which don't support it
      if (!['innerHTML', 'textContent'].includes(k) || TagsWithInnerContent.includes(tag.tag)) {
        // @ts-expect-error untyped
        tag[k] = val
      }
      delete tag.props[k]
    }
  })
  // TODO remove v2
  if (tag.props.body) {
    // inserting dangerous javascript potentially
    tag.tagPosition = 'bodyClose'
    // clean up
    delete tag.props.body
  }
  // TODO remove v2
  if (tag.props.children) {
    // inserting dangerous javascript potentially
    tag.innerHTML = tag.props.children
    // clean up
    delete tag.props.children
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

export function normaliseClassProp(v: Required<Required<Head>['htmlAttrs']['class']>) {
  if (typeof v === 'object' && !Array.isArray(v)) {
    // @ts-expect-error untyped
    v = Object.keys(v).filter(k => v[k])
  }
  // finally, check we don't have spaces, we may need to split again
  return (Array.isArray(v) ? v.join(' ') : v as string)
    .split(' ')
    .filter(c => c.trim())
    .filter(Boolean)
    .join(' ')
}

export async function normaliseProps<T extends HeadTag>(props: T['props'], virtual?: boolean): Promise<T['props']> {
  // handle boolean props, see https://html.spec.whatwg.org/#boolean-attributes
  for (const k of Object.keys(props)) {
    // class has special handling
    if (k === 'class') {
      // @ts-expect-error untyped
      props[k] = normaliseClassProp(props[k])
      continue
    }
    // first resolve any promises
    // @ts-expect-error untyped
    if (props[k] instanceof Promise)
      // @ts-expect-error untyped
      props[k] = await props[k]
    if (!virtual && !TagConfigKeys.includes(k)) {
      const v = String(props[k])
      // data keys get special treatment, we opt for more verbose syntax
      const isDataKey = k.startsWith('data-')
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

export async function normaliseEntryTags<T extends {} = Head>(e: HeadEntry<T>): Promise<HeadTag[]> {
  const tagPromises: Promise<HeadTag | HeadTag[]>[] = []
  Object.entries(e.resolvedInput as {})
    .filter(([k, v]) => typeof v !== 'undefined' && ValidHeadTags.includes(k))
    .forEach(([k, value]) => {
      const v = asArray(value)
      // @ts-expect-error untyped
      tagPromises.push(...v.map(props => normaliseTag(k as keyof Head, props, e)).flat())
    })
  return (await Promise.all(tagPromises))
    .flat()
    .filter(Boolean)
    .map((t: HeadTag, i) => {
      t._e = e._i
      e.mode && (t._m = e.mode)
      t._p = (e._i << TagEntityBits) + i
      return t
    }) as unknown as HeadTag[]
}
