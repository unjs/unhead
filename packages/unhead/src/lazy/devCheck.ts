import type { HeadTag, Unhead } from '../types'
import { HasElementTags } from '../utils/const'
import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../utils/dedupe'
import { normalizeProps } from '../utils/normalize'
import { resolveTags } from '../utils/resolve'
import { tagWeight } from './runtime'

// Only dev builds load this module. It compares the tags the client would render with the
// server head in the document, and names each one that waits for the first head change.

const FIX = `It applies on the first head change. Push the same input on the server and the client, set load: 'idle', or call head.load().`

function attr(value: unknown): string | undefined {
  if (value === false || value == null || typeof value === 'function')
    return undefined
  if (value === true)
    return ''
  if (value instanceof Set)
    return [...value].join(' ')
  if (value instanceof Map)
    return [...value].map(([k, v]) => `${k}:${v}`).join(';')
  return String(value)
}

function label(tag: HeadTag): string {
  if (tag.tag === 'htmlAttrs')
    return '<html>'
  if (tag.tag === 'bodyAttrs')
    return '<body>'
  const p = tag.props as Record<string, unknown>
  const id = ['name', 'property', 'http-equiv', 'charset', 'rel', 'src', 'id']
    .filter(k => p[k] != null && p[k] !== false)
    .map(k => `${k}="${attr(p[k])}"`)
  if (p.rel && p.href)
    id.push(`href="${p.href}"`)
  return `<${[tag.tag, ...id].join(' ')}>`
}

// the server elements, by the id the DOM renderer gives them when it adopts them
function indexDocument(document: Document): Map<string, Element> {
  const index = new Map<string, Element>()
  for (const el of [...document.head.children, ...document.body.children]) {
    const tag = el.tagName.toLowerCase() as HeadTag['tag']
    if (!HasElementTags.has(tag))
      continue
    const props: Record<string, any> = { innerHTML: el.innerHTML }
    for (const n of el.getAttributeNames())
      props[n] = el.getAttribute(n)
    const next = normalizeProps({ tag, props: {} } as HeadTag, props)
    next.key = el.getAttribute('data-hid') || undefined
    const dedupe = dedupeKey(next) || hashTag(next)
    let k = dedupe
    let c = 1
    while (index.has(k))
      k = `${dedupe}:${c++}`
    index.set(k, el)
  }
  return index
}

// The attributes and content of a client tag that its server element lacks
function differences(tag: HeadTag, el: Element): string[] {
  const out: string[] = []
  const props = tag.props as Record<string, unknown>
  for (const k in props) {
    const v = props[k]
    if (k === 'class' && v instanceof Set) {
      if ([...v].some(c => !el.classList.contains(c)))
        out.push('class')
    }
    else if (k === 'style' && v instanceof Map) {
      if ([...v].some(([sk, sv]) => (el as HTMLElement).style.getPropertyValue(sk) !== sv))
        out.push('style')
    }
    else if (!(k[0] === 'o' && k[1] === 'n')) {
      const value = attr(v)
      if (value !== undefined && el.getAttribute(k) !== value)
        out.push(k)
    }
  }
  if (tag.textContent != null && tag.textContent !== '' && String(tag.textContent) !== el.textContent)
    out.push('textContent')
  if (tag.innerHTML != null && tag.innerHTML !== '' && String(tag.innerHTML) !== el.innerHTML)
    out.push('innerHTML')
  return out
}

export async function checkHydratedHead(
  head: Unhead<any, any>,
  document: Document,
  useLazyPlugins: () => Promise<void>,
  sources: Record<number, string | undefined>,
  isLoading: () => boolean,
): Promise<void> {
  await useLazyPlugins()
  // a change already loads the runtime, which applies every client tag
  if (isLoading())
    return
  head.resolvedOptions._tagWeight = tagWeight
  const tags = resolveTags(head)
  const index = indexDocument(document)
  const counter: Record<string, number> = {}
  const warned = new Set<string>()
  for (const tag of tags) {
    let problem: string | undefined
    if (tag.tag === 'title') {
      if (String(tag.textContent ?? '') !== document.title)
        problem = `differs from the server head: "${tag.textContent}" on the client, "${document.title}" in the document`
    }
    else if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
      const diff = differences(tag, tag.tag === 'htmlAttrs' ? document.documentElement : document.body)
      if (diff.length)
        problem = `differs from the server head in ${diff.join(', ')}`
    }
    else if (HasElementTags.has(tag.tag)) {
      const count = counter[tag._d!] || 0
      const id = (count ? `${tag._d}:${count}` : tag._d) || tag._h!
      if (tag.tag === 'meta' && tag._d && isMetaArrayDupeKey(tag._d))
        counter[tag._d] = count + 1
      const el = index.get(id)
      const diff = el && differences(tag, el)
      if (!el)
        problem = 'is missing from the server head'
      else if (diff!.length)
        problem = `differs from the server head in ${diff!.join(', ')}`
    }
    if (!problem)
      continue
    const message = `${label(tag)} ${problem}`
    if (warned.has(message))
      continue
    warned.add(message)
    const entry = tag._p === undefined ? undefined : tag._p >> 10
    const source = entry === undefined ? '' : ` Pushed by ${sources[entry] || `entry ${entry}`}.`
    console.warn(`[unhead] ${message}.${source} ${FIX}`)
  }
}
