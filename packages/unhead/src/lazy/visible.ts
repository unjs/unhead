import type { HeadEntry } from '../types'
import { sameInput } from './same'

// The crawler tag list of `serverOnlyCrawlerTags`: crawler `meta`, `link rel=canonical`,
// `link rel=alternate` with `hreflang`, and JSON-LD scripts. Crawlers read the server HTML,
// so the lazy head never loads the runtime for these tags alone. The regex matches a lower
// case meta name, such as `og:title`, and a `useSeoMeta` key, such as `ogTitle`.
const CRAWLER_RE = /^(?:(?:og|twitter|article)[:A-Z]|(?:description|robots|keywords)$)/
const LINK_RE = /^(?:canonical|alternate)$/i
const LD_JSON_RE = /^application\/ld\+json$/i
// a value that template params fill with the title
const TITLE_PARAM_RE = /%(?:s|pageTitle)\b/
// keys that configure a tag and render no attribute, and event handlers
const CONFIG_RE = /^(?:key$|tag[A-Z]|processTemplateParams|on)/
const ELEMENT_RE = /^(?:meta|link|style|script|noscript|base)$/

function isCrawler(key: string, item: any) {
  return !!item && (key === 'meta'
    ? CRAWLER_RE.test(String(item.name || item.property).toLowerCase())
    : key === 'link'
      ? LINK_RE.test(item.rel) && (item.hreflang != null || item.rel.length === 9)
      : LD_JSON_RE.test(item.type))
}

const isEmpty = (o: any) => !!o && typeof o === 'object' && !Object.keys(o).length

/**
 * What a user can see of the head: `r` holds each entry with its input, without crawler tags,
 * the title, or empty values. `t` holds each title. Each item is `[id, options, value]`.
 */
export interface VisibleState { r: [number, any, Record<string, any>][], t: [number, any, unknown][] }

export function visibleState(entries: Iterable<HeadEntry<any>>): VisibleState {
  const state: VisibleState = { r: [], t: [] }
  for (const e of entries) {
    const input = (e._pending !== undefined ? e._pending : e.input) as Record<string, any> || {}
    const v: Record<string, any> = {}
    for (const key in input) {
      let value = input[key]
      if (key === 'meta' || key === 'link' || key === 'script')
        value = ([] as any[]).concat(value).filter(item => !isCrawler(key, item))
      else if (key === '_flatMeta' && value)
        value = Object.fromEntries(Object.entries(value).filter(([k, x]) => x !== undefined && !CRAWLER_RE.test(k)))
      if (key === 'title')
        value !== undefined && state.t.push([e._i, e.options, value])
      else if (value !== undefined && !isEmpty(value))
        v[key] = value
    }
    if (!isEmpty(v))
      state.r.push([e._i, e.options, v])
  }
  return state
}

function mentionsTitle(value: any): boolean {
  return typeof value === 'string' ? TITLE_PARAM_RE.test(value) : !!value && typeof value === 'object' && Object.keys(value).some(k => mentionsTitle(value[k]))
}

// the title that wins the dedupe when no title sets a priority: the latest entry
const winner = (titles: VisibleState['t']) => titles.reduce((a, b) => b[0] > a[0] ? b : a)[2] as string

/**
 * Compares what a user can see of two states of the head. Returns `false` when the change
 * needs the runtime, `true` when nothing visible changed, or else the new document title.
 * A title applies alone only when the swap in the document title is exact: plain titles
 * with no template params and no priority, a string title template, and no other tag that
 * reads the title.
 */
export function visibleChange(prev: VisibleState, next: VisibleState, documentTitle: string): string | boolean {
  if (!sameInput(prev.r, next.r))
    return false
  if (sameInput(prev.t, next.t))
    return true
  const plain = ([, options, t]: VisibleState['t'][number]) => typeof t === 'string' && !!t && t === t.trim() && !t.includes('%') && (!options || isEmpty(options))
  if (!prev.t.length || !next.t.length || ![...prev.t, ...next.t].every(plain)
    || next.r.some(([, , v]) => typeof (v.titleTemplate?.textContent ?? v.titleTemplate) === 'function' || mentionsTitle({ ...v, titleTemplate: 0 }))) {
    return false
  }
  const parts = documentTitle.split(winner(prev.t))
  return parts.length === 2 && parts.join(winner(next.t))
}

// CSS with the whitespace that minifiers drop removed, so a server that minifies a style still matches
const css = (s: string) => s.replace(/\s*([{},;>])\s*/g, '$1').replace(/:\s+/g, ':').replace(/;\}/g, '}').trim()

// Whether an element shows each plain value of a tag input. A value it cannot compare counts as not shown.
function shows(el: Element, props: Record<string, any>) {
  return Object.keys(props).every((k) => {
    const v = props[k]
    const text = k === 'innerHTML' || k === 'textContent'
    const actual = text ? (el as any)[k] : el.getAttribute(k)
    return CONFIG_RE.test(k) || v == null || v === false || typeof v === 'function'
      || ((typeof v === 'string' || typeof v === 'number' || v === true)
        // template params fill attributes, and content only when a tag opts in
        && !(String(v).includes('%') && (!text || props.processTemplateParams))
        && (text && el.tagName === 'STYLE' ? css(actual) === css(String(v)) : actual === (v === true ? '' : String(v))))
  })
}

// What a later entry replaces an earlier tag by, close to the dedupe keys of unhead
function identity(key: string, item: any): string | undefined {
  if (key === 'meta')
    return item.charset ? 'charset' : `meta:${item.name || item.property || item['http-equiv']}:${item.key}`
  if (item.key || item.id)
    return `${key}:${item.key}:${item.id}`
}

/**
 * Whether the server document shows each visible tag of the hydrated entries. Only then does
 * a later title change apply alone, so a client value that the server never rendered still
 * reaches the document with the first change, as with the default head. A tag that a later
 * entry replaces is not checked.
 */
export function documentShows(doc: Document, state: VisibleState) {
  const later = new Set<string | undefined>()
  return [...state.r].sort((a, b) => b[0] - a[0]).every(([, , v]) => {
    const items: [string, any][] = []
    for (const key in v) {
      const value = v[key]
      if (key === 'htmlAttrs' || key === 'bodyAttrs') {
        if (!shows(key[0] === 'h' ? doc.documentElement : doc.body, value))
          return false
      }
      // a `useSeoMeta` key names its meta tag in kebab case, such as `themeColor`
      else if (key === '_flatMeta') {
        items.push(...Object.keys(value).map(k => ['meta', { name: k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), content: value[k] }] as [string, any]))
      }
      else if (ELEMENT_RE.test(key)) {
        items.push(...([] as any[]).concat(value).map(item => [key, item] as [string, any]))
      }
      else if (key !== 'titleTemplate' && key !== 'templateParams') {
        return false
      }
    }
    const ids = items.map(([key, item]) => item && identity(key, item))
    const shown = items.every(([key, item], n) => !item || (ids[n] && later.has(ids[n])) || [...doc.querySelectorAll(key)].some(el => shows(el, item)))
    ids.forEach(id => later.add(id))
    return shown
  })
}

/**
 * The state of the change check: `s` is what the document shows, `m` whether the server
 * document showed the hydrated entries, and `t` the server title once a title applied.
 */
export interface Shown { s?: VisibleState, m?: boolean, t?: string }

/**
 * Applies a change that needs no runtime: a change to crawler tags alone, or to the title
 * alone. Returns false when the change needs the runtime.
 */
export function applyVisible(doc: Document, shown: Shown, hydrated: HeadEntry<any>[], entries: Iterable<HeadEntry<any>>): boolean {
  shown.s ||= visibleState(hydrated)
  shown.m ??= documentShows(doc, shown.s)
  const next = visibleState(entries)
  const title = shown.m && visibleChange(shown.s, next, doc.title)
  if (title === false)
    return false
  if (typeof title === 'string') {
    shown.t ??= doc.title
    doc.title = title
  }
  shown.s = next
  return true
}
