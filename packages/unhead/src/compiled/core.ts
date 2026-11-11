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
  /** Set while template params run natively: the hooks of `TemplateParamsPlugin`. */
  _tp?: unknown
  /** Set while `InferSeoMetaPlugin` runs natively: its hooks. */
  _infer?: Record<string, (ctx: any) => void>
  /** Whether the memo may hold the output of `InferSeoMetaPlugin`: false with an `ogTitle` or `ogDescription` function. */
  _inferMemo?: boolean
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
  /** Reads a memo hit. Returns nothing when a value could change a v3 decision. */
  f?: (memo: Memo, head: CompiledTagsHead) => SSRHeadPayload | undefined
}

export interface TrieNode {
  n?: WeakMap<CompiledTags, TrieNode>
  /** Memos by render options and native plugins */
  m: Record<string | number, Memo>
}

// every node a trie ever added, shared by the trie of each renderer
let nodeCount = 0

/** True once the process made so many sets of compiled tags that the memo is off for good. */
export const isMemoOff = (): boolean => nodeCount >= 8192

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

// `_i << 10` wraps from this index on, which only the slow path reproduces
export const MAX_MEMO_INDEX = 2097152

/** Whether the memo can hold an entry: compiled tags with no options, that no render has normalized. */
export function isMemoEntry(entry: CompiledEntry): boolean {
  return !!entry._compiled && !entry._tags && entry._pending === undefined && isEmpty(entry.options)
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

// The memo key of a render: its options and the native plugins. `null` when the memo may not
// hold the output: an `InferSeoMetaPlugin` function may change the text, which the memo holds as a token,
// and that plugin reads a title template that an earlier render of this head left behind.
function memoKey(head: CompiledTagsHead, omitLineBreaks: boolean | undefined): number | null {
  if (head._infer && (!head._inferMemo || head._titleTemplate !== undefined))
    return null
  return (omitLineBreaks ? 1 : 0) | (head._tp ? 2 : 0) | (head._infer ? 4 : 0)
}

/**
 * Renders a head with no foreign hook listeners: the memo when every entry is a
 * compiled tags with no options, otherwise `renderer.c` plus the v3 rules.
 */
export function renderCompiledHead(head: CompiledTagsHead, omitLineBreaks: boolean | undefined, renderer: CompiledRenderer): SSRHeadPayload {
  let node: TrieNode | undefined = renderer.n
  let last = -1
  for (const entry of head.entries.values() as Iterable<CompiledEntry>) {
    // a value function runs here, in entry order, and may replace the input of its entry
    if (entry._pending === undefined)
      settleValues(entry)
    const compiledTags = entry._compiled!
    const i = entry._i
    if (!isMemoEntry(entry) || i <= last || i >= MAX_MEMO_INDEX) {
      node = undefined
      break
    }
    const nodes: WeakMap<CompiledTags, TrieNode> = node!.n ||= new WeakMap()
    let next = nodes.get(compiledTags)
    if (!next) {
      // Compiled tags that are not at process scope must not grow the trie for ever, so every
      // 2048th new node drops the whole trie. With more live compiled tags than that, it would
      // start over on every render, so past the fourth drop it stays empty for good.
      if (!(++nodeCount % 2048)) {
        renderer.n = { m: {} }
        if (nodeCount === 8192)
          console.warn('[unhead] The compiled server head turned its memo off, because this process created 8,192 sets of compiled tags. Create compiled tags once, never per request.')
      }
      else if (nodeCount < 8192) {
        nodes.set(compiledTags, next = { m: {} })
      }
      if (!next) {
        node = undefined
        break
      }
    }
    node = next
    last = i
  }
  const key = node && memoKey(head, omitLineBreaks)
  if (key != null) {
    const memo = node!.m[key] ||= renderer.b(head, omitLineBreaks, renderer)
    if (!memo.x) {
      const payload = renderer.f ? renderer.f(memo, head) : { ...memo.b } as unknown as SSRHeadPayload
      if (payload)
        return payload
    }
  }
  return renderTags(renderer.r(renderer.c(head), head), omitLineBreaks, renderer)
}
