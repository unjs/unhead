import type { HeadEntry, HeadTag, PropResolver, ResolvableHead, Unhead } from '../types'
import type { CompiledEntry } from './core'
import type { CompiledTags } from './types'
import { walkResolver } from '../utils/walkResolver'
import { DYNAMIC_VALUE_OPEN, FLAG_UNDEFINED_DROPS, toHeadInput } from './tags'

/**
 * What `readEntry` reads from a head entry.
 *
 * @experimental
 */
export interface EntryReading {
  /** The entry as head input: compiled tags with their values, or loose input with its values resolved. */
  input: ResolvableHead
  /** Whether the entry came from a `useSeoMeta` call. */
  seoMeta: boolean
  /** Whether the entry holds compiled tags. */
  compiled: boolean
  /**
   * The path in `input` of each value that holds a dynamic value, such as `title` or
   * `meta.0.content`. Set for compiled tags with dynamic values only. A tag transform with a
   * cache key must not test the text at these paths: the memo holds one output for every value.
   */
  dynamic?: string[]
}

// a value list that gives the dynamic value marker for every index
const MARKS = /* @__PURE__ */ new Proxy([], { get: () => DYNAMIC_VALUE_OPEN })

function markPaths(value: unknown, path: string, out: string[]): string[] {
  if (typeof value === 'string' && value.includes(DYNAMIC_VALUE_OPEN)) {
    out.push(path)
  }
  else if (value && typeof value === 'object') {
    for (const key in value)
      markPaths((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, out)
  }
  return out
}

/**
 * Reads a head entry as head input, whatever head holds it: compiled tags with their values,
 * `useSeoMeta` input as meta tags, and loose input with its refs and getters resolved.
 *
 * @experimental
 */
export function readEntry(entry: HeadEntry<any>, head: Unhead<any, any>): EntryReading {
  let input: any
  let tags: CompiledTags | undefined
  let values: unknown
  if ('_compiled' in entry) {
    const compiledEntry = entry as CompiledEntry
    // the value function runs once, here or in the render
    if (typeof compiledEntry._values === 'function')
      compiledEntry._values = (compiledEntry._values as () => unknown[])()
    tags = compiledEntry._compiled
    values = compiledEntry._values
    input = tags || entry.input
  }
  else {
    input = entry._pending === undefined ? entry.input : entry._pending
  }
  let seoMeta = !!(entry._seoMeta || entry.options?.seoMeta)
  let dynamic: string[] | undefined
  if (tags) {
    const list = values as unknown[] || []
    input = toHeadInput(tags, list)
    // an undefined value omits some tags from the input, so the paths count only the tags it keeps
    const kept = tags.filter(tag => !(tag[5]! & FLAG_UNDEFINED_DROPS) || Object.keys(toHeadInput([tag], list)).length)
    dynamic = markPaths(toHeadInput(kept, MARKS), '', [])
    if (!dynamic.length)
      dynamic = undefined
  }
  else {
    const resolvers = head.resolvedOptions.propResolvers || []
    const resolve: PropResolver | undefined = resolvers[0] && ((key, value) => resolvers.reduce((value, resolver) => resolver(key, value), value))
    input = walkResolver(resolve ? resolve(undefined, input) : input, resolve) || {}
    const { _flatMeta, ...rest } = input
    const unpack = head.plugins.get('flatMeta')?.hooks?.['entries:normalize']
    if (_flatMeta) {
      seoMeta = true
      const ctx = { tags: [{ tag: '_flatMeta', props: _flatMeta }] as HeadTag[] }
      unpack?.(ctx as any)
      // the render drops a meta tag whose content is undefined, as compiled tags omit one
      if (unpack)
        input = { ...rest, meta: [...rest.meta || [], ...ctx.tags.map(tag => tag.props).filter(props => props.content !== undefined || props.charset || props['http-equiv'])] }
    }
  }
  return { input, seoMeta, compiled: !!tags, dynamic }
}
