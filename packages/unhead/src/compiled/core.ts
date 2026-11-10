import type { HeadEntry, HeadPlugin, SSRHeadPayload, Unhead } from '../types'
import type { CompiledTag, CompiledTags } from './types'
import { DYNAMIC_VALUE_OPEN, FLAG_ARRAYABLE, FLAG_DYNAMIC_VALUES } from './tags'

/** A tag in the fast tiers: a v3 `HeadTag` plus compiled tag fields. A compiled tag shares its props with the compiled tags. */
export type RuntimeTag = Record<string, any>

export interface CompiledEntry extends HeadEntry<any> {
  _compiled?: CompiledTags
  _values?: readonly unknown[]
}

export type CompiledTagsHead = Unhead<any, SSRHeadPayload> & {
  /** Set while template params run natively: the hooks of `TemplateParamsPlugin`. */
  _tp?: unknown
  /** Set while `InferSeoMetaPlugin` runs natively: its hooks. */
  _infer?: Record<string, (ctx: any) => void>
  /** Whether the memo may hold the output of `InferSeoMetaPlugin`: false with an `ogTitle` or `ogDescription` function. */
  _inferMemo?: boolean
  /** Set once a plugin with a tag transform registers, so a head with none skips the scan for them. */
  _tt?: boolean
  /** Marks a head that renders compiled tags, for `useCompiledHead`. */
  _acceptsCompiled?: 1
}

export interface Memo {
  /** The payload. A value with dynamic values is a flat `[text, entry, value, mode, text, ...]` list. */
  b: Record<string, string | (string | number)[]>
  /** Every render of this sequence of compiled tags takes the slow path. */
  x?: boolean
  /** The head fields a render sets. Only the full entry keeps them. */
  s?: Record<string, any>
  /**
   * The identities of a memo with keyless JSON scripts whose content is a dynamic value.
   * `d` holds each such identity with tokens, `k` every other identity.
   */
  i?: { d: string[], k: Set<string> }
  /**
   * The values with no token left in the payload after a tag transform ran, as a flat
   * `[entry, value, entry, value, ...]` list. A hit checks them as it checks the others.
   */
  g?: number[]
}

/** The renderer of the compiled server head. */
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
  /** Reads a memo hit. Returns nothing when a value could change a v3 decision. `transforms` tells that a tag transform ran. */
  f?: (memo: Memo, head: CompiledTagsHead, transforms: boolean) => SSRHeadPayload | undefined
}

export interface TrieNode {
  n?: WeakMap<CompiledTags, TrieNode>
  /** Memos by render options, native plugins, and the memo key of each tag transform. */
  m: Record<string | number, Memo>
  /** The memos `m` held before it last reached `MAX_MEMO_KEYS`. A memo in use moves back to `m`. */
  o?: Record<string | number, Memo>
  /** How many memos `m` holds. */
  k?: number
}

// A memo key may come from the request, such as a host name, so a node must not hold a memo
// for every key it ever saw. It holds this many, plus as many from before they filled up.
const MAX_MEMO_KEYS = 16

// every node a trie ever added, shared by the trie of each renderer
let nodeCount = 0

/** The v3 `DEFAULT_INIT` input, compiled. */
export const DEFAULT_COMPILED_TAGS: CompiledTags = [
  ['htmlAttrs', { lang: 'en' }, 100, 'htmlAttrs', 0, 1],
  ['meta', { charset: 'utf-8' }, -20, 'charset', 0, 1],
  ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }, -15, 'meta:viewport', 0, 1],
]

/**
 * Runs the value function of an entry once, before a render reads its values. v3
 * resolves refs and getters on the first render, and the function may also
 * replace the input of its entry.
 */
export function settleValues(entry: CompiledEntry): void {
  const values: unknown = entry._values
  if (typeof values === 'function')
    entry._values = values()
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
    const props: Record<string, any> = out.props = { ...out.props }
    // a compiled tag value is a scalar, or nested JSON in template params, which holds no dynamic value
    for (const key in props) {
      if (props[key]?.includes?.(DYNAMIC_VALUE_OPEN))
        props[key] = resolve(props[key], key, tag)
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
    if (entry._compiled!.some(compiledTag => compiledTag[5]! & FLAG_DYNAMIC_VALUES))
      return { b: {}, x: true }
  }
  return { b: renderTags(renderer.r(renderer.c(head), head), omitLineBreaks, renderer) as any }
}

/**
 * Whether a plugin has a tag transform that the full runtime runs too: `defineTagTransform` marks
 * its `tags:afterResolve` listener with `_t`. A fast tier runs only what the full runtime runs.
 */
export function isTagTransform(plugin: HeadPlugin): boolean {
  return !!plugin.transform && !!(plugin.hooks?.['tags:afterResolve'] as any)?._t
}

// The memo key of a render: its options, the native plugins, and the memo key of each tag
// transform. `null` when the memo may not hold the output: a memo key is not a string, or an
// `InferSeoMetaPlugin` function may change the text, which the memo holds as a token, and that
// plugin reads a title template that an earlier render of this head left behind.
function renderMemoKey(head: CompiledTagsHead, omitLineBreaks: boolean | undefined): string | number | null {
  if (head._infer && (!head._inferMemo || head._titleTemplate !== undefined))
    return null
  let key: string | number = (omitLineBreaks ? 1 : 0) | (head._tp ? 2 : 0) | (head._infer ? 4 : 0)
  // A key with a tag transform is a string. It holds the plugins in the order they run, because
  // a transform before a native plugin and one after it render different tags.
  if (head._tt) {
    for (const plugin of head.plugins.values()) {
      if (isTagTransform(plugin)) {
        const part = plugin.memoKey ? plugin.memoKey(head) : ''
        // a memo key that is not a string, such as one from untyped code, keeps the memo out
        if (typeof part !== 'string')
          return null
        // each length keeps a separator inside a plugin key or a memo key from reading as two parts
        key = `${key}|${plugin.key.length}:${plugin.key}${part.length}:${part}`
      }
      else if (plugin.hooks && (plugin.hooks === head._tp || plugin.hooks === head._infer)) {
        key = `${key}|${plugin.hooks === head._tp ? 't' : 'i'}`
      }
    }
  }
  return key
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
      // Compiled tags that are not at process scope must not grow the trie for ever, so every
      // 2048th new node drops the whole trie. With more live compiled tags than that, it would
      // start over on every render, so past the fourth drop it stays empty for good.
      if (!(++nodeCount % 2048))
        renderer.n = { m: {} }
      else if (nodeCount < 8192)
        nodes.set(compiledTags, next = { m: {} })
      if (!next) {
        node = undefined
        break
      }
    }
    node = next
    last = i
  }
  const key = node && renderMemoKey(head, omitLineBreaks)
  if (key != null) {
    let memo = node!.m[key]
    if (!memo) {
      // a full node starts over, and keeps what it held for the keys still in use
      if (node!.k! >= MAX_MEMO_KEYS) {
        node!.o = node!.m
        node!.m = {}
        node!.k = 0
      }
      memo = node!.m[key] = node!.o?.[key] || renderer.b(head, omitLineBreaks, renderer)
      node!.k = (node!.k || 0) + 1
    }
    if (!memo.x) {
      const payload = renderer.f ? renderer.f(memo, head, typeof key === 'string') : { ...memo.b } as unknown as SSRHeadPayload
      if (payload)
        return payload
    }
  }
  return renderTags(renderer.r(renderer.c(head), head), omitLineBreaks, renderer)
}
