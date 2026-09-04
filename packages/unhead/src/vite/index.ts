import type { HtmlTagDescriptor } from 'vite'
import type { SerializableHead } from '../types'
import { escapeHtml } from '../server/util'
import { TagConfigKeys } from '../utils/const'

export type { HtmlTagDescriptor }

const KNOWN_TAGS = /* @__PURE__ */ new Set(['meta', 'link', 'script', 'style', 'noscript', 'base'])
const VOID_TAGS = /* @__PURE__ */ new Set(['meta', 'link', 'base'])

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

function normalizeBaseAttrs(attrs: Record<string, string | boolean>): Record<string, string | boolean> {
  const normalized: Record<string, string | boolean> = {}
  for (const key in attrs) {
    const normalizedKey = key.toLowerCase()
    if (normalizedKey === 'href' || normalizedKey === 'target') {
      if (normalized[normalizedKey] === undefined)
        normalized[normalizedKey] = attrs[key]
    }
    else {
      normalized[key] = attrs[key]
    }
  }
  return normalized
}

function renderTagToHtml(tag: HtmlTagDescriptor): string {
  const props = attrsToProps(tag.attrs)
  const attrString = Object.entries(props)
    .map(([key, value]) => value === true ? key : `${key}="${escapeHtml(String(value))}"`)
    .join(' ')
  const open = attrString ? `<${tag.tag} ${attrString}>` : `<${tag.tag}>`
  if (VOID_TAGS.has(tag.tag))
    return open
  const inner = typeof tag.children === 'string'
    ? tag.children
    : Array.isArray(tag.children)
      ? tag.children.map(renderTagToHtml).join('')
      : ''
  return `${open}${inner}</${tag.tag}>`
}

function vitePositionOrder(tag: HtmlTagDescriptor): number {
  switch (tag.injectTo) {
    case 'head': return 1
    case 'body-prepend': return 2
    case 'body': return 3
    default: return 0
  }
}

function withViteAttrs(entry: Record<string, unknown>, attrs: Record<string, string | boolean>): Record<string, unknown> {
  for (const key in attrs) {
    if (TagConfigKeys.has(key) || key === 'style' || key === 'class')
      entry[key.toUpperCase()] = attrs[key]
    else
      entry[key] = attrs[key]
  }
  return entry
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
 * Tag names outside `meta`, `link`, `script`, `style`, `noscript`, and `base`
 * are skipped without throwing.
 * Title descriptors are skipped because `SerializableHead` cannot preserve
 * Vite's RCDATA character-reference semantics.
 */
export function htmlTagsToHead(tags: HtmlTagDescriptor[]): SerializableHead {
  const head: Record<string, any> = {}

  for (const tag of [...tags].sort((a, b) => vitePositionOrder(a) - vitePositionOrder(b))) {
    if (!KNOWN_TAGS.has(tag.tag))
      continue

    const props = attrsToProps(tag.attrs)
    const position = positionProps(tag.injectTo)

    if (tag.tag === 'base') {
      const baseProps = normalizeBaseAttrs(props)
      if (!head.base) {
        const basePosition = position.tagPriority ? { tagPriority: position.tagPriority } : {}
        head.base = withViteAttrs(basePosition, baseProps)
      }
      else {
        for (const key of ['href', 'target'] as const) {
          if (head.base[key] === undefined && baseProps[key] !== undefined) {
            head.base[key] = baseProps[key]
          }
        }
      }
      continue
    }

    const entry = withViteAttrs({ ...position }, props)
    if (typeof tag.children === 'string')
      entry.innerHTML = tag.children
    else if (Array.isArray(tag.children) && tag.children.length)
      entry.innerHTML = tag.children.map(renderTagToHtml).join('')

    ;(head[tag.tag] ||= []).push(entry)
  }

  return head as SerializableHead
}
