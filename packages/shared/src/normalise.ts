import type { Head, HeadEntry, HeadTag } from '@unhead/schema'
import { type Thenable, thenable } from './thenable'
import { TagConfigKeys, TagsWithInnerContent, ValidHeadTags } from '.'

export function normaliseTag<T extends HeadTag>(tagName: T['tag'], input: HeadTag['props'] | string, e: HeadEntry<T>): Thenable<T | T[]> {
  return thenable(
    normaliseProps<T>(
      // explicitly check for an object
      // @ts-expect-error untyped
      typeof input === 'object' && typeof input !== 'function' && !(input instanceof Promise)
        ? { ...input }
        : { [(tagName === 'script' || tagName === 'noscript' || tagName === 'style') ? 'innerHTML' : 'textContent']: input },
      (tagName === 'templateParams' || tagName === 'titleTemplate'),
    ),
    (props) => {
      // input can be a function or an object, we need to clone it
      const tag = {
        tag: tagName,
        props: props as T['props'],
      } as T
      // merge options from the entry
      TagConfigKeys.forEach((k) => {
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
      })
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
    },
  )
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

export function normaliseProps<T extends HeadTag>(props: T['props'], virtual?: boolean): Thenable<T['props']> {
  let thanableRet: Thenable<unknown>

  for (const k of Object.keys(props)) {
    // handle boolean props, see https://html.spec.whatwg.org/#boolean-attributes
    // class has special handling
    if (k === 'class' || k === 'style') {
      // @ts-expect-error untyped
      props[k] = normaliseStyleClassProps(k, props[k])
      continue
    }

    const result = thenable(props[k], (prop) => {
      // @ts-expect-error untyped
      props[k] = prop

      if (!virtual && !TagConfigKeys.has(k as string)) {
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
    })

    if (result instanceof Promise) {
      const prevThenableRet = thanableRet
      thanableRet = result.then(() => prevThenableRet)
    }
  }

  return thenable(thanableRet, () => props)
}

// support 1024 tag ids per entry (includes updates)
export const TagEntityBits = 10

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

  let thenableRet: Thenable<HeadTag | HeadTag[]> = tagPromises.shift()!

  for (let i = 0, l = tagPromises.length + 1; i !== l; i += 1) {
    thenableRet = thenable(thenableRet, (tags) => {
      if (Array.isArray(tags)) {
        headTags.push(...tags)
      }
      else {
        headTags.push(tags)
      }

      return tagPromises[i]
    }) as Thenable<HeadTag | HeadTag[]>
  }

  return thenable(thenableRet, () => (
    headTags.map((t, i) => {
      t._e = e._i
      e.mode && (t._m = e.mode)
      t._p = (e._i << TagEntityBits) + i
      return t
    })
  ))
}
