import type { HeadEntry } from '../types'
import type { CompiledEntry } from './core'
import type { CompiledEntryContent } from './types'

/**
 * Reads the compiled tags of a head entry, with no copy and no render. It reads an entry of
 * the compiled server head and of the lazy head. Returns nothing for an entry with loose input,
 * and for every lazy head entry once the full runtime loads.
 *
 * On the server, a value function has not run before the first render, so `values` is
 * undefined until then. On a lazy head, a pending patch comes first. Pass the result to
 * `toHeadInput` for head input.
 *
 * @experimental
 */
export function readCompiledEntry(entry: HeadEntry<any>): CompiledEntryContent | undefined {
  // a compiled server entry rebuilds `input` when read, so its own fields come first
  if ('_compiled' in entry) {
    const { _compiled, _values } = entry as CompiledEntry
    return _compiled && { tags: _compiled, values: Array.isArray(_values) ? _values : undefined }
  }
  const tags = entry._pending ?? entry.input
  return Array.isArray(tags) ? { tags, values: (entry.options as { values?: readonly unknown[] } | undefined)?.values } : undefined
}
