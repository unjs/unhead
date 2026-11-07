import type { HeadEntry, SSRHeadPayload, Unhead } from '../types'
import type { CompiledTag, CompiledTags } from './types'
import { DYNAMIC_VALUE_OPEN, FLAG_ARRAYABLE, FLAG_DYNAMIC_VALUES } from './tags'

/** A tag in the fast tiers: a v3 `HeadTag` plus compiled tag fields. A compiled tag shares its props with the compiled tags. */
export type RuntimeTag = Record<string, any>

export interface CompiledEntry extends HeadEntry<any> {
  _compiled?: CompiledTags
  _values?: readonly unknown[]
}

export type CompiledTagsHead = Unhead<any, SSRHeadPayload> & {
  /** Set while template params run natively: the rules of a strict head, the hooks of a full head. */
  _tp?: unknown
}

export interface Memo {
  /** The payload. A value with dynamic values is a flat `[text, entry, value, mode, text, ...]` list. */
  b: Record<string, string | (string | number)[]>
  /** Every render of this sequence of compiled tags takes the slow path. */
  x?: boolean
  /** A bucket has dynamic values. */
  d?: boolean
  /** The head fields a render sets. Only the full entry keeps them. */
  s?: Record<string, any>
}

/** What differs between the strict and the full entry. */
export interface CompiledRenderer {
  /** The memo root. Each entry builds memos its own way, so they do not share one. */
  n: TrieNode
  /** Stringifies a tag, or returns an empty string when v3 sanitize drops it. */
  t: (tag: RuntimeTag) => string
  /** Stringifies `htmlAttrs` and `bodyAttrs` props. */
  a: (props: Record<string, any>) => string
  /** Gathers the tags of every entry when a head cannot use the memo. */
  c: (head: CompiledTagsHead) => RuntimeTag[]
  /** Applies dedupe, the title template, and template params, in v3 order. */
  r: (tags: RuntimeTag[], head: CompiledTagsHead) => RuntimeTag[]
  /** Builds the memo of a sequence of compiled tags. */
  b: (head: CompiledTagsHead, omitLineBreaks: boolean | undefined, renderer: CompiledRenderer) => Memo
  /** Reads a memo hit. Returns nothing when a value could change a v3 decision. */
  f?: (memo: Memo, head: CompiledTagsHead) => SSRHeadPayload | undefined
}

export interface TrieNode {
  n?: WeakMap<CompiledTags, TrieNode>
  m: Memo[]
}

// shared by the trie of each renderer, so both together stay bounded
let nodeCount = 0
let drops = 0

/** The v3 `DEFAULT_INIT` input, compiled. */
export const DEFAULT_COMPILED_TAGS: CompiledTags = [
  ['htmlAttrs', { lang: 'en' }, 100, 'htmlAttrs', 0, 1],
  ['meta', { charset: 'utf-8' }, -20, 'charset', 0, 1],
  ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }, -15, 'meta:viewport', 0, 1],
]

/** @returns whether a tag of the compiled tags takes values */
export function hasDynamicValues(compiledTags: CompiledTags): boolean {
  return compiledTags.some(compiledTag => compiledTag[5]! & FLAG_DYNAMIC_VALUES)
}

/** @returns whether an object has no enumerable keys */
export function isEmpty(value: object | undefined): boolean {
  // eslint-disable-next-line no-unreachable-loop -- intentional: any key means non-empty
  for (const _ in value)
    return false
  return true
}

/**
 * Turns a compiled tag into the tag v3 normalize makes, with `class` and `style` as
 * strings. `resolve` replaces each string value that holds a dynamic value. It gets the
 * attribute name, or 0 for content.
 */
export function reviveTag(compiledTag: CompiledTag, p: number, resolve?: (value: string, key: string | 0, tag: string) => unknown): RuntimeTag {
  const [tag, source, _w, _d, extra, flags] = compiledTag
  const out: RuntimeTag = { tag, props: source || {}, _w, _p: p, _d, _m: flags! & FLAG_ARRAYABLE, ...(extra || undefined) }
  if (resolve && flags! & FLAG_DYNAMIC_VALUES) {
    const props: Record<string, unknown> = out.props = { ...out.props }
    for (const key in props) {
      const value = props[key]
      if (typeof value === 'string' && value.includes(DYNAMIC_VALUE_OPEN))
        props[key] = resolve(value, key, tag)
    }
    for (const key of ['textContent', 'innerHTML']) {
      if (out[key]?.includes?.(DYNAMIC_VALUE_OPEN))
        out[key] = resolve(out[key], 0, tag)
    }
  }
  return out
}

export function renderTags(tags: RuntimeTag[], omitLineBreaks: boolean | undefined, renderer: CompiledRenderer, mark?: (tag: RuntimeTag) => void): SSRHeadPayload {
  const buckets: Record<string, string> = { head: '', bodyClose: '', bodyOpen: '' }
  const attrs: Record<string, Record<string, any>> = { htmlAttrs: {}, bodyAttrs: {} }
  const lineBreak = omitLineBreaks ? '' : '\n'
  for (const tag of tags) {
    const name = tag.tag
    mark?.(tag)
    if (name === 'htmlAttrs' || name === 'bodyAttrs') {
      Object.assign(attrs[name]!, tag.props)
      continue
    }
    const html = renderer.t(tag)
    if (html) {
      const position = tag.tagPosition || 'head'
      buckets[position] = buckets[position] ? `${buckets[position]}${lineBreak}${html}` : html
    }
  }
  return {
    headTags: buckets.head!,
    bodyTags: buckets.bodyClose!,
    bodyTagsOpen: buckets.bodyOpen!,
    htmlAttrs: renderer.a(attrs.htmlAttrs!),
    bodyAttrs: renderer.a(attrs.bodyAttrs!),
  }
}

/** Builds the memo of a sequence of compiled tags with no values. A sequence with dynamic values always takes the slow path. */
export function buildStaticMemo(head: CompiledTagsHead, omitLineBreaks: boolean | undefined, renderer: CompiledRenderer): Memo {
  for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
    if (hasDynamicValues(entry._compiled!))
      return { b: {}, x: true }
  }
  return { b: renderTags(renderer.r(renderer.c(head), head), omitLineBreaks, renderer) as any }
}

/**
 * Renders a head with no foreign hook listeners: the memo when every entry is a
 * compiled tags with no options, otherwise `renderer.c` plus the v3 rules.
 */
export function renderCompiledHead(head: CompiledTagsHead, omitLineBreaks: boolean | undefined, renderer: CompiledRenderer): SSRHeadPayload {
  let node: TrieNode | undefined = renderer.n
  let last = -1
  for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
    const compiledTags = entry._compiled
    const i = entry._i
    // `_i << 10` wraps from 2 ** 21 on, which only the slow path reproduces
    if (!compiledTags || entry._tags || entry._pending || !isEmpty(entry.options) || i <= last || i >= 2097152) {
      node = undefined
      break
    }
    const nodes: WeakMap<CompiledTags, TrieNode> = node!.n ||= new WeakMap()
    let next = nodes.get(compiledTags)
    if (!next) {
      // Compiled tags that are not at process scope must not grow the trie for ever, so the
      // trie starts over at the cap. With more live compiled tags than the cap it would start
      // over on every render, so the fourth start leaves an empty trie that never grows.
      if (nodeCount++ >= 2048) {
        if (++drops < 5)
          renderer.n = { m: [] }
        if (drops < 4)
          nodeCount = 0
        node = undefined
        break
      }
      next = { m: [] }
      nodes.set(compiledTags, next)
    }
    node = next
    last = i
  }
  if (node) {
    const memo = node.m[(omitLineBreaks ? 1 : 0) | (head._tp ? 2 : 0)] ||= renderer.b(head, omitLineBreaks, renderer)
    if (!memo.x) {
      const payload = renderer.f ? renderer.f(memo, head) : { ...memo.b } as unknown as SSRHeadPayload
      if (payload)
        return payload
    }
  }
  return renderTags(renderer.r(renderer.c(head), head), omitLineBreaks, renderer)
}
