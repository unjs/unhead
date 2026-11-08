import type { HeadEntry } from '../types'
import type { CompiledEntry } from './core'
import type { CompiledEntryContent } from './types'

/**
 * Reads the compiled tags of a head entry, with no copy and no render. A value function
 * has not run before the first render, so `values` is undefined until then. Returns nothing
 * for an entry with loose input. Pass the result to `toHeadInput` for head input.
 *
 * @experimental
 */
export function readCompiledEntry(entry: HeadEntry<any>): CompiledEntryContent | undefined {
  const { _compiled, _values } = entry as CompiledEntry
  return _compiled && { tags: _compiled, values: Array.isArray(_values) ? _values : undefined }
}
