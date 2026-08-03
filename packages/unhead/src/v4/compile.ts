/**
 * v4 L1: loose-input compiler. Turns v3-style head objects into L0 Tags.
 * Must stay output-identical to the build-time plan emitter (dual-path law).
 */
import type { EntryOptions, ResolveCtx, Tag, V4Plugin } from './core'
import {
  F_ARRAYABLE,
  F_RAW,
  F_REMOVED,
  POS_SHIFT,
  T_BASE,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_LINK,
  T_META,
  T_NOSCRIPT,
  T_SCRIPT,
  T_STYLE,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
} from './core'

const TAG_IDS: Record<string, number> = Object.create(null)
for (let i = 0; i < TAG_NAMES.length; i++) TAG_IDS[TAG_NAMES[i]] = i

const CONFIG_KEYS = new Set(['key', 'tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'innerHTML', 'textContent', 'processTemplateParams'])
const ALIASES: Record<string, number> = { critical: -8, high: -1, low: 2 }
const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
const ARRAYABLE_META = new Set(['theme-color', 'google-site-verification', 'author', 'og:locale:alternate', 'og:image', 'og:video', 'og:audio', 'article:author', 'article:tag', 'book:author', 'book:tag', 'twitter:image'])
const POS: Record<string, number> = { head: 0, bodyOpen: 1, bodyClose: 2 }
const SCRIPT_END_RE = /<\/script/gi
const JSON_LT_RE = /</g
const IMPORT_RE = /@import/
const isTruthy = (v: unknown) => v === '' || v === true

function isArrayableMeta(v: string) {
  return ARRAYABLE_META.has(v) || v.startsWith('og:image:') || v.startsWith('og:video:')
    || v.startsWith('og:audio:') || v.startsWith('twitter:image:')
}

// port of v3 capo weights (utils/sort.ts); numeric priority short-circuits
function weight(id: number, props: Record<string, any> | null, content: string | null, isRaw: boolean, priority: unknown): number {
  if (typeof priority === 'number')
    return priority
  let w = 100
  if (id === T_BASE) {
    w = -10
  }
  else if (id === T_TITLE) {
    w = 10
  }
  else if (id === T_META && props) {
    w = props['http-equiv'] === 'content-security-policy'
      ? -30
      : props.charset ? -20 : props.name === 'viewport' ? -15 : 100
  }
  else if (id === T_LINK && props?.rel) {
    w = ({ 'preconnect': 20, 'stylesheet': 60, 'preload': 70, 'modulepreload': 70, 'prefetch': 90, 'dns-prefetch': 90, 'prerender': 90 } as Record<string, number>)[props.rel] || 100
  }
  else if (id === T_SCRIPT && props) {
    const type = String(props.type)
    if (isTruthy(props.async))
      w = 30
    else if ((props.src && !isTruthy(props.defer) && !isTruthy(props.async) && type !== 'module' && !type.endsWith('json')) || (isRaw && content && !type.endsWith('json')))
      w = 50
    else if ((isTruthy(props.defer) && props.src && !isTruthy(props.async)) || type === 'module')
      w = 80
  }
  else if (id === T_STYLE) {
    w = content && IMPORT_RE.test(content) ? 40 : 60
  }
  return (w || 100) + (ALIASES[priority as string] || 0)
}

// port of v3 utils/dedupe.ts dedupeKey
function identity(id: number, props: Record<string, any> | null, content: string | null, key: string | null): string {
  if (id === T_TITLE || id === T_BASE || id === T_TITLE_TEMPLATE)
    return TAG_NAMES[id]
  const p = props!
  if (id === T_LINK) {
    if (p.rel === 'canonical')
      return 'canonical'
    if (p.rel === 'alternate' && p.hreflang)
      return `alternate:${p.hreflang}`
  }
  if (p.charset)
    return 'charset'
  if (id === T_META) {
    const v = p.name ?? p.property ?? p['http-equiv']
    if (v !== undefined)
      return `meta:${v}${(typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) && key ? `:key:${key}` : ''}`
  }
  const name = TAG_NAMES[id]
  if (key)
    return `${name}:key:${key}`
  if (p.id)
    return `${name}:id:${p.id}`
  if (id === T_LINK && p.rel && p.href)
    return `link:${p.rel}:${p.href}`
  if (content && (id === T_SCRIPT || id === T_STYLE || id === T_NOSCRIPT))
    return `${name}:content:${content}`
  return ''
}

function normalizeClass(value: any): Set<string> {
  const set = new Set<string>()
  const add = (v: string) => v && v.split(' ').forEach(c => c && set.add(c))
  if (typeof value === 'string') {
    add(value)
  }
  else if (Array.isArray(value)) {
    for (const v of value) add(v)
  }
  else if (value && typeof value === 'object') {
    for (const k in value) value[k] && add(k)
  }
  return set
}

function normalizeStyle(value: any): Map<string, string> {
  const map = new Map<string, string>()
  const add = (v: string) => {
    const i = v.indexOf(':')
    i > 0 && map.set(v.slice(0, i).trim(), v.slice(i + 1).trim())
  }
  if (typeof value === 'string') {
    value.split(';').forEach(add)
  }
  else if (Array.isArray(value)) {
    value.forEach(add)
  }
  else if (value && typeof value === 'object') {
    for (const k in value) value[k] && map.set(k.trim(), String(value[k]))
  }
  return map
}

interface Norm {
  props: Record<string, any> | null
  content: string | null
  raw: boolean
  pos: number
  priority: unknown
  key: string | null
}

function normalizeProps(id: number, input: Record<string, any>, opts: EntryOptions | null): Norm {
  const props: Record<string, any> = {}
  let content: string | null = null
  let raw = false
  let pos = 0
  let priority: unknown
  let key: string | null = null
  let hasProps = false

  for (const k in input) {
    const value = input[k]
    if (value === undefined)
      continue
    if (CONFIG_KEYS.has(k)) {
      if (k === 'tagPosition') {
        pos = POS[value] || 0
      }
      else if (k === 'tagPriority') {
        priority = value
      }
      else if (k === 'key') {
        key = String(value)
      }
      else if (k === 'innerHTML' || k === 'textContent') {
        raw = k === 'innerHTML'
        if (typeof value === 'object') {
          const type = input.type || 'application/json'
          if (String(type).endsWith('json') || type === 'speculationrules' || type === 'importmap') {
            props.type = input.type = type
            hasProps = true
            content = JSON.stringify(value)
          }
        }
        else {
          content = String(value)
        }
      }
      continue
    }
    if (value === null)
      continue
    if (k === 'class') {
      props.class = normalizeClass(value)
      hasProps = true
      continue
    }
    if (k === 'style') {
      props.style = normalizeStyle(value)
      hasProps = true
      continue
    }
    const isData = k.startsWith('data-')
    const lk = isData ? k : k.toLowerCase()
    const str = String(value)
    // v3 boolean coercion: 'true'/'' become bare attrs except data-*/meta content
    const isMetaContent = id === T_META && lk === 'content'
    props[lk] = (str === 'true' || str === '')
      ? (isData || isMetaContent ? str : true)
      : value === false && !isData ? false : value
    hasProps = true
  }

  // entry-level options override tag-level (v3 Object.assign(t, e.options))
  if (opts) {
    if (opts.tagPosition)
      pos = POS[opts.tagPosition] || 0
    if (opts.tagPriority !== undefined)
      priority = opts.tagPriority
  }

  // script content escaping at compile time
  if (content !== null && id === T_SCRIPT) {
    const type = String(props.type)
    content = (type.endsWith('json') || type === 'importmap' || type === 'speculationrules')
      ? content.replace(JSON_LT_RE, '\\u003C')
      : content.replace(SCRIPT_END_RE, '<\\/script')
  }

  return { props: hasProps ? props : null, content, raw, pos, priority, key }
}

function makeTag(id: number, n: Norm, seq: number, idx: number): Tag {
  const d = identity(id, n.props, n.content, n.key)
  // keyed dupeable tags emit data-hid for DOM adoption (v3 parity)
  if (n.key && (id === T_LINK || id === T_STYLE || id === T_SCRIPT || id === T_NOSCRIPT))
    n.props = Object.assign(n.props || {}, { 'data-hid': n.key })
  return {
    f: id | (n.pos << POS_SHIFT) | (n.raw ? F_RAW : 0)
      | (id === T_META && d.startsWith('meta:') && isArrayableMeta(d.slice(5).replace(/:key:.*$/, '')) ? F_ARRAYABLE : 0),
    w: weight(id, n.props, n.content, n.raw, n.priority),
    o: seq * 4096 + idx,
    d,
    p: n.props,
    c: n.content,
  }
}

function pushAttrTags(tags: Tag[], id: number, input: Record<string, any>, seq: number, idx: number, priority: unknown): number {
  // per-prop explosion: each attr is its own tag, merge falls out of dedupe
  const name = TAG_NAMES[id]
  const w = typeof priority === 'number' ? priority : 100 + (ALIASES[priority as string] || 0)
  for (const k in input) {
    const value = input[k]
    if (value === undefined || value === null)
      continue
    if (k === 'class') {
      for (const c of normalizeClass(value))
        tags.push({ f: id, w, o: seq * 4096 + idx++, d: `${name}:class:${c}`, p: { class: c }, c: null })
    }
    else if (k === 'style') {
      for (const [sk, sv] of normalizeStyle(value))
        tags.push({ f: id, w, o: seq * 4096 + idx++, d: `${name}:style:${sk}`, p: { style: `${sk}:${sv}` }, c: null })
    }
    else {
      const lk = k.startsWith('data-') ? k : k.toLowerCase()
      tags.push({ f: id, w, o: seq * 4096 + idx++, d: `${name}:${lk}`, p: { [lk]: value }, c: null })
    }
  }
  return idx
}

const CONTENT_KEY: Record<number, string> = { [T_SCRIPT]: 'innerHTML', [T_NOSCRIPT]: 'innerHTML', [T_STYLE]: 'innerHTML' }

export function compileEntry(input: any, seq: number, opts: EntryOptions | null): Tag[] {
  const tags: Tag[] = []
  if (!input)
    return tags
  if (typeof input === 'function')
    input = input()
  let idx = 0
  for (const k in input) {
    let value = input[k]
    if (value === undefined || value === null)
      continue
    if (typeof value === 'function' && k !== 'titleTemplate')
      value = value()
    const id = TAG_IDS[k]
    if (id === undefined)
      continue
    if (id === T_TITLE) {
      tags.push(makeTag(T_TITLE, { props: null, content: String(value), raw: false, pos: 0, priority: opts?.tagPriority, key: null }, seq, idx++))
    }
    else if (id === T_TITLE_TEMPLATE) {
      const t = makeTag(T_TITLE_TEMPLATE, { props: null, content: typeof value === 'string' ? value : null, raw: false, pos: 0, priority: opts?.tagPriority, key: null }, seq, idx++)
      if (typeof value === 'function')
        t.p = { fn: value }
      tags.push(t)
    }
    else if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      idx = pushAttrTags(tags, id, value, seq, idx, opts?.tagPriority)
    }
    else {
      const items = Array.isArray(value) ? value : [value]
      for (const item of items) {
        const obj = typeof item === 'object' && item !== null ? item : { [CONTENT_KEY[id] || 'textContent']: item }
        // meta content arrays fan out to one tag per value
        if (id === T_META && Array.isArray(obj.content)) {
          for (const c of obj.content) {
            const n = normalizeProps(id, { ...obj, content: c }, opts)
            if (n.props || n.content !== null)
              tags.push(makeTag(id, n, seq, idx++))
          }
          continue
        }
        const n = normalizeProps(id, obj, opts)
        // compile-time sanitize: empty tags and contentless metas are dropped here
        if (!n.props && n.content === null)
          continue
        if (id === T_META && !n.props?.charset && !n.props?.['http-equiv'] && (n.props?.content === undefined || n.props.content === null || n.props.content === false))
          continue
        tags.push(makeTag(id, n, seq, idx++))
      }
    }
  }
  return tags
}

/** L1 micro-plugin: titleTemplate resolution, runs in the resolve slot. */
export const TitlePlugin: V4Plugin = {
  key: 'title',
  resolve(ctx: ResolveCtx) {
    const tpl = ctx.get('titleTemplate')
    if (!tpl)
      return
    const title = ctx.get('title')
    const fn = tpl.p?.fn
    let v = typeof fn === 'function' ? fn(title?.c ?? undefined) : tpl.c
    if (typeof v === 'string')
      v = v.replace('%s', title?.c || '')
    if (title) {
      ctx.patch(tpl, { f: tpl.f | F_REMOVED })
      if (v === null)
        ctx.patch(title, { f: title.f | F_REMOVED })
      else ctx.patch(title, { c: v })
    }
    else if (v != null) {
      // no title tag: the template renders as the title
      ctx.patch(tpl, { f: (tpl.f & ~15) | T_TITLE, c: v, p: null })
    }
    else {
      ctx.patch(tpl, { f: tpl.f | F_REMOVED })
    }
  },
}
