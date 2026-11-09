import type { HeadEntry } from '../types'
import type { CompiledEntry } from './core'
import type { CompiledEntryContent } from './types'

/**
 * Reads the compiled tags of a head entry, with no copy and no render. It reads an entry of
 * the compiled server head and of the lazy head. Returns nothing for an entry with loose input,
 * and for every lazy head entry once the full runtime loads.
 *
 * On the server, a value function has not run before the first render, so `values` is
 * undefined until then. An entry with no values reads an empty `values`. On a lazy head, a pending patch comes first. `seoMeta` is true for an
 * entry from a `useSeoMeta` call. Pass the result to `toHeadInput` for head input.
 *
 * @experimental
 */
export function readCompiledEntry(entry: HeadEntry<any>): CompiledEntryContent | undefined {
  let content: CompiledEntryContent | undefined
  // a compiled server entry rebuilds `input` when read, so its own fields come first
  if ('_compiled' in entry) {
    const { _compiled, _values } = entry as CompiledEntry
    // a value function has not run yet, and an entry with no values has none to wait for
    content = _compiled && { tags: _compiled, values: typeof _values === 'function' ? undefined : _values || [] }
  }
  else {
    const tags = entry._pending ?? entry.input
    content = Array.isArray(tags) ? { tags, values: (entry.options as { values?: readonly unknown[] } | undefined)?.values || [] } : undefined
  }
  if (content && entry._seoMeta)
    content.seoMeta = true
  return content
}
