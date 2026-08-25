import type { SerializableHead } from '../types'

/**
 * Structural copy of Vite's `HtmlTagDescriptor`, the shape returned by
 * `transformIndexHtml` and (per vitejs/ecosystem#15) the build manifest.
 *
 * Defined locally so this module has no runtime or type dependency on `vite`.
 */
export interface HtmlTagDescriptor {
  tag: string
  attrs?: Record<string, string | boolean | undefined>
  children?: string | HtmlTagDescriptor[]
  injectTo?: 'head' | 'body' | 'head-prepend' | 'body-prepend'
}

const KNOWN_TAGS = /* @__PURE__ */ new Set(['meta', 'link', 'script', 'style', 'noscript', 'base', 'title'])

function attrsToProps(attrs?: HtmlTagDescriptor['attrs']): Record<string, string | boolean> {
  const props: Record<string, string | boolean> = {}
  if (!attrs)
    return props
  for (const key in attrs) {
    const value = attrs[key]
    if (value === false || value === undefined)
      continue
    props[key] = value
  }
  return props
}

function renderTagToHtml(tag: HtmlTagDescriptor): string {
  const props = attrsToProps(tag.attrs)
  const attrString = Object.entries(props)
    .map(([key, value]) => value === true ? key : `${key}="${String(value)}"`)
    .join(' ')
  const open = attrString ? `<${tag.tag} ${attrString}>` : `<${tag.tag}>`
  const inner = typeof tag.children === 'string'
    ? tag.children
    : Array.isArray(tag.children)
      ? tag.children.map(renderTagToHtml).join('')
      : ''
  return `${open}${inner}</${tag.tag}>`
}

function positionProps(injectTo: HtmlTagDescriptor['injectTo']): Record<string, unknown> {
  switch (injectTo) {
    case 'head-prepend':
      return { tagPosition: 'head', tagPriority: 'high' }
    case 'body-prepend':
      return { tagPosition: 'bodyOpen' }
    case 'body':
      return { tagPosition: 'bodyClose' }
    case 'head':
    default:
      return {}
  }
}

/**
 * Converts Vite's `HtmlTagDescriptor[]` (the return shape of `transformIndexHtml`)
 * into an Unhead `SerializableHead`, so SSR frameworks can push tags a Vite
 * plugin declared through `useHead()` / `head.push()`.
 *
 * Tag names outside `meta`, `link`, `script`, `style`, `noscript`, `base`, `title`
 * are skipped without throwing.
 */
export function htmlTagsToHead(tags: HtmlTagDescriptor[]): SerializableHead {
  const head: Record<string, any> = {}

  for (const tag of tags) {
    if (!KNOWN_TAGS.has(tag.tag))
      continue

    if (tag.tag === 'title') {
      if (typeof tag.children === 'string')
        head.title = tag.children
      continue
    }

    const props = attrsToProps(tag.attrs)
    const position = positionProps(tag.injectTo)

    if (tag.tag === 'base') {
      head.base = { ...props, ...position }
      continue
    }

    const entry: Record<string, unknown> = { ...props, ...position }
    if (typeof tag.children === 'string')
      entry.innerHTML = tag.children
    else if (Array.isArray(tag.children) && tag.children.length)
      entry.innerHTML = tag.children.map(renderTagToHtml).join('')

    ;(head[tag.tag] ||= []).push(entry)
  }

  return head as SerializableHead
}
