import type { SerializableHead } from '../types'
import { escapeHtml } from '../server/util'

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

// Only used to render `children` arrays into markup (rare). Escapes attribute
// values and text so a descriptor can't break out of its own tag.
function renderTagToHtml(tag: HtmlTagDescriptor): string {
  const props = attrsToProps(tag.attrs)
  const attrString = Object.entries(props)
    .map(([key, value]) => value === true ? key : `${key}="${escapeHtml(String(value))}"`)
    .join(' ')
  const open = attrString ? `<${tag.tag} ${attrString}>` : `<${tag.tag}>`
  const inner = typeof tag.children === 'string'
    ? escapeHtml(tag.children)
    : Array.isArray(tag.children)
      ? tag.children.map(renderTagToHtml).join('')
      : ''
  return `${open}${inner}</${tag.tag}>`
}

// Mirrors Vite's own `transformIndexHtml` switch (packages/vite/src/node/plugins/html.ts):
// only 'body' and 'body-prepend' get their own branch, explicit 'head' is appended as-is,
// and everything else -- including an omitted `injectTo` -- is treated as 'head-prepend'.
function positionProps(injectTo: HtmlTagDescriptor['injectTo']): { tagPosition?: 'head' | 'bodyOpen' | 'bodyClose', tagPriority?: 'high' } {
  switch (injectTo) {
    case 'head':
      return {}
    case 'body-prepend':
      return { tagPosition: 'bodyOpen' }
    case 'body':
      return { tagPosition: 'bodyClose' }
    case 'head-prepend':
    default:
      return { tagPosition: 'head', tagPriority: 'high' }
  }
}

/**
 * Converts Vite's `HtmlTagDescriptor[]` (the return shape of `transformIndexHtml`)
 * into an Unhead `SerializableHead`, so SSR frameworks can push tags a Vite
 * plugin declared through `useHead()` / `head.push()`.
 *
 * An omitted `injectTo` is treated as `'head-prepend'`, matching Vite's own default.
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
      // A document has one <base>; browsers honour only the first href/target.
      // `base` has no tagPosition, only tagPriority.
      const { tagPriority } = position
      const baseProps = tagPriority ? { ...props, tagPriority } : props
      head.base = head.base ? { ...baseProps, ...head.base } : baseProps
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
