import type { HeadEntry, HeadTag, PropResolver, ResolvableHead, Unhead } from '../types'
import type { CompiledEntry } from './core'
import type { CompiledTags } from './types'
import { walkResolver } from '../utils/walkResolver'
import { DYNAMIC_VALUE_OPEN, toHeadInput } from './tags'

/**
 * What `readEntry` reads of a head entry.
 *
 * @experimental
 */
export interface EntryReading {
  /** The entry as head input, with values settled. A `useSeoMeta` call reads as meta tags. */
  input: ResolvableHead
  /** True for the entry of a `useSeoMeta` call, so its title and description are page SEO meta. */
  seoMeta: boolean
  /** True when the entry holds compiled tags. */
  compiled: boolean
  /**
   * The paths in `input` of each dynamic value of compiled tags, such as `title` or
   * `meta.0.content`. The server memo holds a token in place of each one, so a tag transform
   * sees the token, and the value may differ on the next render. Undefined when every value is
   * static, and for loose input, which never takes the memo.
   */
  dynamic?: string[]
}

// Every dynamic value reads as the token mark, so `toHeadInput` leaves a mark in each place one lands
const MARKS = /* @__PURE__ */ new Proxy([], { get: () => DYNAMIC_VALUE_OPEN })

function markPaths(value: unknown, path: string, out: string[]): string[] {
  if (typeof value === 'string' && value.includes(DYNAMIC_VALUE_OPEN)) {
    out.push(path)
  }
  else if (value && typeof value === 'object') {
    for (const key in value) markPaths((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, out)
  }
  return out
}

/**
 * Reads an entry of `head` as head input: compiled tags, loose input, or a pending patch. It
 * reads every head, with or without compiler mode, and renders nothing.
 *
 * - A pending patch comes first.
 * - Values settle. The value function of a compiled server entry runs now, once, as the first
 *   render would run it. Loose input resolves through the prop resolvers of the head, so a
 *   Vue ref reads as its value, and a getter runs.
 * - `dynamic` names the values that may change between renders, so a tag transform can tell a
 *   static value, which the server memo holds as it is, from a dynamic one.
 * - The flat meta of a `useSeoMeta` call unpacks to meta tags through the `FlatMetaPlugin` of
 *   the head, which every `useSeoMeta` call registers. So this reader carries no unpack code.
 *
 * The input is new on each read, so a reader may change it.
 *
 * @experimental
 */
export function readEntry(entry: HeadEntry<any>, head: Unhead<any, any>): EntryReading {
  let input: any
  let tags: CompiledTags | undefined
  let values: unknown
  // A compiled server entry rebuilds `input` when read, so its own fields come first. Its value
  // function runs once, and may turn the entry into loose input.
  if ('_compiled' in entry) {
    const compiledEntry = entry as CompiledEntry
    if (typeof compiledEntry._values === 'function')
      compiledEntry._values = (compiledEntry._values as () => unknown[])()
    tags = compiledEntry._compiled
    values = compiledEntry._values
    input = tags || entry.input
  }
  else {
    // a `null` patch is empty input, so only `undefined` falls back to the input
    input = entry._pending === undefined ? entry.input : entry._pending
    tags = Array.isArray(input) ? input : undefined
    values = (entry.options as { values?: unknown } | undefined)?.values
  }
  let seoMeta = !!(entry._seoMeta || entry.options?.seoMeta)
  let dynamic: string[] | undefined
  if (tags) {
    input = toHeadInput(tags, values as unknown[] || [])
    dynamic = markPaths(toHeadInput(tags, MARKS), '', [])
    if (!dynamic.length)
      dynamic = undefined
  }
  else {
    // v3 `resolveHeadInput`, which shares a module with normalize, so it stays out of an eager chunk
    const resolvers = head.resolvedOptions.propResolvers || []
    const resolve: PropResolver | undefined = resolvers[0] && ((key, value) => resolvers.reduce((value, resolver) => resolver(key, value), value))
    input = walkResolver(resolve ? resolve(undefined, input) : input, resolve) || {}
    const { _flatMeta, ...rest } = input
    const unpack = head.plugins.get('flatMeta')?.hooks?.['entries:normalize']
    if (_flatMeta) {
      seoMeta = true
      // the hook replaces the `_flatMeta` tag with its meta tags, as at a render
      const ctx = { tags: [{ tag: '_flatMeta', props: _flatMeta }] as HeadTag[] }
      unpack?.(ctx)
      if (unpack)
        input = { ...rest, meta: [...rest.meta || [], ...ctx.tags.map(tag => tag.props)] }
    }
  }
  return { input, seoMeta, compiled: !!tags, dynamic }
}
