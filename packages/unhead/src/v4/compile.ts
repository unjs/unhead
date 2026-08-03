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
  T_SCRIPT,
  T_STYLE,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
} from './core'

const TAG_IDS: Record<string, number> = /* @__PURE__ */ (() => {
  const m: Record<string, number> = Object.create(null)
  for (let i = 0; i < TAG_NAMES.length; i++) m[TAG_NAMES[i]] = i
  return m
})()

const CONFIG_KEYS = /* @__PURE__ */ new Set(['key', 'tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'innerHTML', 'textContent', 'processTemplateParams'])
const ALIASES: Record<string, number> = { critical: -8, high: -1, low: 2 }
const LINK_WEIGHTS: Record<string, number> = { 'preconnect': 20, 'stylesheet': 60, 'preload': 70, 'modulepreload': 70, 'prefetch': 90, 'dns-prefetch': 90, 'prerender': 90 }
const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
const ARRAYABLE_META = /* @__PURE__ */ new Set(['theme-color', 'google-site-verification', 'author', 'og:locale:alternate', 'og:image', 'og:video', 'og:audio', 'article:author', 'article:tag', 'book:author', 'book:tag', 'twitter:image'])
const ARRAYABLE_PREFIX_RE = /^(?:og:(?:image|video|audio)|twitter:image):/
const POS: Record<string, number> = { bodyOpen: 1, bodyClose: 2 }
const SCRIPT_END_RE = /<\/script/gi
const JSON_LT_RE = /</g
const isTruthy = (v: unknown) => v === '' || v === true

// port of v3 capo weights (utils/sort.ts); numeric priority short-circuits
function weight(id: number, p: Record<string, any> | null, content: string | null, raw: boolean, priority: unknown): number {
  if (typeof priority === 'number')
    return priority
  let w = 100
  if (id === T_BASE) {
    w = -10
  }
  else if (id === T_TITLE) {
    w = 10
  }
  else if (id === T_META && p) {
    w = p['http-equiv'] === 'content-security-policy' ? -30 : p.charset ? -20 : p.name === 'viewport' ? -15 : 100
  }
  else if (id === T_LINK && p?.rel) {
    w = LINK_WEIGHTS[p.rel] || 100
  }
  else if (id === T_SCRIPT && p) {
    const type = String(p.type)
    const json = type.endsWith('json')
    w = isTruthy(p.async)
      ? 30
      : (p.src && !isTruthy(p.defer) && !isTruthy(p.async) && type !== 'module' && !json) || (raw && content && !json)
          ? 50
          : (isTruthy(p.defer) && p.src && !isTruthy(p.async)) || type === 'module' ? 80 : 100
  }
  else if (id === T_STYLE) {
    w = content && content.includes('@import') ? 40 : 60
  }
  return (w || 100) + (ALIASES[priority as string] || 0)
}

// port of v3 utils/dedupe.ts dedupeKey
function identity(id: number, p: Record<string, any> | null, content: string | null, key: string | null): string {
  const name = TAG_NAMES[id]
  if (id === T_TITLE || id === T_BASE || id === T_TITLE_TEMPLATE)
    return name
  if (id === T_LINK) {
    if (p!.rel === 'canonical')
      return 'canonical'
    if (p!.rel === 'alternate' && p!.hreflang)
      return `alternate:${p!.hreflang}`
  }
  if (p!.charset)
    return 'charset'
  if (id === T_META) {
    const v = p!.name ?? p!.property ?? p!['http-equiv']
    if (v !== undefined)
      return `meta:${v}${(typeof v !== 'string' || !v.includes(':')) && !META_NOREWRITE_RE.test(v) && key ? `:key:${key}` : ''}`
  }
  if (key)
    return `${name}:key:${key}`
  if (p!.id)
    return `${name}:id:${p!.id}`
  if (id === T_LINK && p!.rel && p!.href)
    return `link:${p!.rel}:${p!.href}`
  return content && (id >= T_STYLE && id <= 6) ? `${name}:content:${content}` : ''
}

// class -> Set<string>, style -> Map<string, string> (v3 normalizeStyleClassProps)
function normListy(value: any, isStyle: boolean): any {
  const store: any = isStyle ? new Map() : new Set()
  const add = (v: string) => {
    if (!v)
      return
    if (isStyle) {
      const i = v.indexOf(':')
      i > 0 && store.set(v.slice(0, i).trim(), v.slice(i + 1).trim())
    }
    else {
      for (const c of v.split(' ')) c && store.add(c)
    }
  }
  if (typeof value === 'string') {
    isStyle ? value.split(';').forEach(add) : add(value)
  }
  else if (Array.isArray(value)) {
    value.forEach(add)
  }
  else if (value && typeof value === 'object') {
    for (const k in value) value[k] && (isStyle ? store.set(k.trim(), String(value[k])) : add(k))
  }
  return store
}

interface Norm {
  p: Record<string, any> | null
  c: string | null
  raw: boolean
  pos: number
  pr: unknown
  key: string | null
}

function normalizeProps(id: number, input: Record<string, any>, opts: EntryOptions | null): Norm {
  const p: Record<string, any> = {}
  const n: Norm = { p: null, c: null, raw: false, pos: 0, pr: undefined, key: null }
  let has = false

  for (const k in input) {
    const value = input[k]
    if (value === undefined)
      continue
    if (CONFIG_KEYS.has(k)) {
      if (k === 'tagPosition') {
        n.pos = POS[value] || 0
      }
      else if (k === 'tagPriority') {
        n.pr = value
      }
      else if (k === 'key') {
        n.key = String(value)
      }
      else if (k === 'innerHTML' || k === 'textContent') {
        n.raw = k === 'innerHTML'
        if (typeof value === 'object') {
          const type = input.type || 'application/json'
          if (String(type).endsWith('json') || type === 'speculationrules' || type === 'importmap') {
            p.type = type
            has = true
            n.c = JSON.stringify(value)
          }
        }
        else {
          n.c = String(value)
        }
      }
      continue
    }
    if (value === null)
      continue
    if (k === 'class' || k === 'style') {
      p[k] = normListy(value, k === 'style')
      has = true
      continue
    }
    const isData = k.startsWith('data-')
    const lk = isData ? k : k.toLowerCase()
    const str = String(value)
    // v3 boolean coercion: 'true'/'' become bare attrs except data-*/meta content
    p[lk] = (str === 'true' || str === '')
      ? (isData || (id === T_META && lk === 'content') ? str : true)
      : value
    has = true
  }

  // entry-level options override tag-level (v3 Object.assign(t, e.options))
  if (opts) {
    opts.tagPosition && (n.pos = POS[opts.tagPosition] || 0)
    opts.tagPriority !== undefined && (n.pr = opts.tagPriority)
  }

  // script content escaping happens at compile time, render assumes clean
  if (n.c !== null && id === T_SCRIPT) {
    const type = String(p.type)
    n.c = (type.endsWith('json') || type === 'importmap' || type === 'speculationrules')
      ? n.c.replace(JSON_LT_RE, '\\u003C')
      : n.c.replace(SCRIPT_END_RE, '<\\/script')
  }

  if (has)
    n.p = p
  return n
}

function makeTag(id: number, n: Norm, seq: number, idx: number): Tag {
  const p = n.p
  const d = identity(id, p, n.c, n.key)
  // keyed dupeable tags emit data-hid for DOM adoption (v3 parity)
  if (n.key && (id === T_LINK || (id >= T_STYLE && id <= 6)))
    (n.p ||= {})['data-hid'] = n.key
  let f = id | (n.pos << POS_SHIFT) | (n.raw ? F_RAW : 0)
  if (id === T_META && p) {
    const v = p.name ?? p.property
    if (typeof v === 'string' && (ARRAYABLE_META.has(v) || ARRAYABLE_PREFIX_RE.test(v)))
      f |= F_ARRAYABLE
  }
  return { f, w: weight(id, p, n.c, n.raw, n.pr), o: seq * 4096 + idx, d, p: n.p, c: n.c }
}

function pushAttrTags(tags: Tag[], id: number, input: Record<string, any>, seq: number, idx: number, priority: unknown): number {
  // per-prop explosion: each attr is its own tag, merge falls out of dedupe
  const name = TAG_NAMES[id]
  const w = typeof priority === 'number' ? priority : 100 + (ALIASES[priority as string] || 0)
  for (const k in input) {
    const value = input[k]
    if (value === undefined || value === null)
      continue
    if (k === 'class' || k === 'style') {
      const isStyle = k === 'style'
      for (const e of normListy(value, isStyle)) {
        const token = isStyle ? `${e[0]}:${e[1]}` : e
        const dk = isStyle ? e[0] : e
        tags.push({ f: id, w, o: seq * 4096 + idx++, d: `${name}:${k}:${dk}`, p: { [k]: token }, c: null })
      }
    }
    else {
      const lk = k.startsWith('data-') ? k : k.toLowerCase()
      tags.push({ f: id, w, o: seq * 4096 + idx++, d: `${name}:${lk}`, p: { [lk]: value }, c: null })
    }
  }
  return idx
}

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
    if (id === T_TITLE || id === T_TITLE_TEMPLATE) {
      const isFn = typeof value === 'function'
      const t = makeTag(id, { p: null, c: isFn ? null : String(value), raw: false, pos: 0, pr: opts?.tagPriority, key: null }, seq, idx++)
      if (isFn)
        t.p = { fn: value }
      tags.push(t)
    }
    else if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      idx = pushAttrTags(tags, id, value, seq, idx, opts?.tagPriority)
    }
    else {
      for (const item of Array.isArray(value) ? value : [value]) {
        const obj = typeof item === 'object' && item !== null ? item : { [id === T_META || id === T_LINK || id === T_BASE ? 'textContent' : 'innerHTML']: item }
        // meta content arrays fan out to one tag per value
        if (id === T_META && Array.isArray(obj.content)) {
          for (const c of obj.content) {
            const n = normalizeProps(id, { ...obj, content: c }, opts)
            ;(n.p || n.c !== null) && tags.push(makeTag(id, n, seq, idx++))
          }
          continue
        }
        const n = normalizeProps(id, obj, opts)
        // compile-time sanitize: empty tags and contentless metas are dropped here
        if (!n.p && n.c === null)
          continue
        if (id === T_META && !n.p?.charset && !n.p?.['http-equiv'] && (n.p?.content === undefined || n.p.content === null || n.p.content === false))
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
