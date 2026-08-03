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

const ALIASES: Record<string, number> = { critical: -8, high: -1, low: 2 }
const LINK_WEIGHTS: Record<string, number> = { 'preconnect': 20, 'stylesheet': 60, 'preload': 70, 'modulepreload': 70, 'prefetch': 90, 'dns-prefetch': 90, 'prerender': 90 }
const META_NOREWRITE_RE = /^(?:viewport|description|keywords|robots)$/
// exact arrayable meta names, plus og:image/video/audio + twitter:image sub-prop prefixes
const ARRAYABLE_RE = /^(?:og:(?:image|video|audio)|twitter:image)(?::|$)|^(?:theme-color|google-site-verification|author|og:locale:alternate|(?:article|book):(?:author|tag))$/
const POS: Record<string, number> = { bodyOpen: 1, bodyClose: 2 }
const SCRIPT_END_RE = /<\/script/gi
const JSON_LT_RE = /</g
const isTruthy = (v: unknown) => v === '' || v === true
const isJsonType = (t: unknown) => String(t).endsWith('json') || t === 'importmap' || t === 'speculationrules'

// port of v3 capo weights (server/sort.ts); numeric priority short-circuits
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
  else if (id === T_SCRIPT) {
    p ||= {}
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
  return w + (ALIASES[priority as string] || 0)
}

// port of v3 utils/dedupe.ts dedupeKey; p may be null (content-only tags)
function identity(id: number, p: Record<string, any> | null, content: string | null, key: string | null): string {
  const name = TAG_NAMES[id]
  if (id === T_TITLE || id === T_BASE || id === T_TITLE_TEMPLATE)
    return name
  if (p) {
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
  }
  if (key)
    return `${name}:key:${key}`
  if (p) {
    if (p.id)
      return `${name}:id:${p.id}`
    if (id === T_LINK && p.rel && p.href)
      return `link:${p.rel}:${p.href}`
  }
  return content && (id >= T_STYLE && id <= T_NOSCRIPT) ? `${name}:content:${content}` : ''
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

/**
 * Single-pass normalize + sanitize + identity + weight for one element tag.
 * Fold of the former normalizeProps/makeTag pair; returns null for tags the
 * compile-time sanitize drops (empty tags, contentless metas).
 */
function compileTag(id: number, input: Record<string, any>, opts: EntryOptions | null, o: number): Tag | null {
  let p: Record<string, any> | null = null
  let c: string | null = null
  let raw = false
  let pos = 0
  let pr: unknown
  let key: string | null = null

  for (const k in input) {
    const value = input[k]
    if (value === undefined)
      continue
    // config keys are consumed before the null check (v3 parity)
    if (k === 'tagPosition') {
      pos = POS[value] || 0
    }
    else if (k === 'tagPriority') {
      pr = value
    }
    else if (k === 'key') {
      key = String(value)
    }
    else if (k === 'innerHTML' || k === 'textContent') {
      raw = k === 'innerHTML'
      if (typeof value === 'object') {
        const type = input.type || 'application/json'
        if (isJsonType(type)) {
          (p ||= {}).type = type
          c = JSON.stringify(value)
        }
      }
      else {
        c = String(value)
      }
    }
    else if (k === 'tagDuplicateStrategy' || k === 'processTemplateParams') {
      // dropped config keys
    }
    else if (value === null) {
      // dropped prop
    }
    else if (k === 'class' || k === 'style') {
      (p ||= {})[k] = normListy(value, k === 'style')
    }
    else {
      const isData = k.startsWith('data-')
      const lk = isData ? k : k.toLowerCase()
      const str = String(value)
      // v3 boolean coercion: 'true'/'' become bare attrs except data-*/meta content
      ;(p ||= {})[lk] = (str === 'true' || str === '')
        ? (isData || (id === T_META && lk === 'content') ? str : true)
        : value
    }
  }

  // entry-level options override tag-level (v3 Object.assign(t, e.options))
  if (opts) {
    opts.tagPosition && (pos = POS[opts.tagPosition] || 0)
    opts.tagPriority !== undefined && (pr = opts.tagPriority)
  }

  // script content escaping happens at compile time, render assumes clean
  if (c !== null && id === T_SCRIPT) {
    c = isJsonType(String(p?.type)) ? c.replace(JSON_LT_RE, '\\u003C') : c.replace(SCRIPT_END_RE, '<\\/script')
  }

  // compile-time sanitize: empty tags and contentless metas are dropped here
  if (!p && c === null)
    return null
  if (id === T_META && !p?.charset && !p?.['http-equiv'] && (p?.content === undefined || p.content === null || p.content === false))
    return null

  const d = identity(id, p, c, key)
  // keyed dupeable tags emit data-hid for DOM adoption (v3 parity)
  if (key && (id === T_LINK || (id >= T_STYLE && id <= T_NOSCRIPT)))
    (p ||= {})['data-hid'] = key
  let f = id | (pos << POS_SHIFT) | (raw ? F_RAW : 0)
  if (id === T_META && p) {
    const v = p.name ?? p.property
    if (typeof v === 'string' && ARRAYABLE_RE.test(v))
      f |= F_ARRAYABLE
  }
  return { f, w: weight(id, p, c, raw, pr), o, d, p, c }
}

export function compileEntry(input: any, seq: number, opts: EntryOptions | null): Tag[] {
  const tags: Tag[] = []
  if (!input)
    return tags
  if (typeof input === 'function')
    input = input()
  const base = seq * 4096
  const epr = opts?.tagPriority
  let idx = 0
  for (const k in input) {
    let value = input[k]
    if (value === undefined || value === null)
      continue
    if (typeof value === 'function' && k !== 'titleTemplate')
      value = value()
    const id = TAG_NAMES.indexOf(k as any)
    if (id < 0)
      continue
    if (id === T_TITLE || id === T_TITLE_TEMPLATE) {
      const isFn = typeof value === 'function'
      const c = isFn ? null : String(value)
      tags.push({ f: id, w: weight(id, null, c, false, epr), o: base + idx++, d: TAG_NAMES[id], p: isFn ? { fn: value } : null, c })
    }
    else if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      // per-prop explosion: each attr is its own tag, merge falls out of dedupe
      const name = TAG_NAMES[id]
      const w = typeof epr === 'number' ? epr : 100 + (ALIASES[epr as string] || 0)
      for (const ak in value) {
        const av = value[ak]
        if (av === undefined || av === null)
          continue
        if (ak === 'class' || ak === 'style') {
          const isStyle = ak === 'style'
          for (const e of normListy(av, isStyle)) {
            tags.push({ f: id, w, o: base + idx++, d: `${name}:${ak}:${isStyle ? e[0] : e}`, p: { [ak]: isStyle ? `${e[0]}:${e[1]}` : e }, c: null })
          }
        }
        else {
          const lk = ak.startsWith('data-') ? ak : ak.toLowerCase()
          tags.push({ f: id, w, o: base + idx++, d: `${name}:${lk}`, p: { [lk]: av }, c: null })
        }
      }
    }
    else {
      for (const item of Array.isArray(value) ? value : [value]) {
        const obj = typeof item === 'object' && item !== null ? item : { [id === T_META || id === T_LINK || id === T_BASE ? 'textContent' : 'innerHTML']: item }
        // meta content arrays fan out to one tag per value
        const objs = id === T_META && Array.isArray(obj.content)
          ? obj.content.map((cv: unknown) => ({ ...obj, content: cv }))
          : [obj]
        for (const ob of objs) {
          const t = compileTag(id, ob, opts, base + idx)
          if (t) {
            idx++
            tags.push(t)
          }
        }
      }
    }
  }
  return tags
}

/**
 * L1 micro-plugin: titleTemplate resolution, runs in the resolve slot.
 * Registered first by createHead, so ctx.shared.title (raw pre-template
 * title) and ctx.shared.titleResolved (final title) are populated before
 * any user plugin's resolve slot runs.
 */
export const TitlePlugin: V4Plugin = {
  key: 'title',
  resolve(ctx: ResolveCtx) {
    const title = ctx.get('title')
    const raw = title?.c
    ctx.shared.title = raw || ''
    const tpl = ctx.get('titleTemplate')
    let v: string | null | undefined = raw
    if (tpl) {
      const fn = tpl.p?.fn
      v = typeof fn === 'function' ? fn(raw ?? undefined) : tpl.c
      if (typeof v === 'string')
        v = v.replace('%s', raw || '')
      if (title) {
        ctx.patch(tpl, { f: tpl.f | F_REMOVED })
        ctx.patch(title, v === null ? { f: title.f | F_REMOVED } : { c: v })
      }
      else {
        // no title tag: the template renders as the title
        ctx.patch(tpl, v != null ? { f: (tpl.f & ~15) | T_TITLE, c: v, p: null } : { f: tpl.f | F_REMOVED })
      }
    }
    ctx.shared.titleResolved = v ?? undefined
  },
}
