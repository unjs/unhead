import type {
  ActiveHeadEntry,
  CreateHeadOptions,
  HeadEntry,
  HeadEntryOptions,
  HeadHooks,
  HeadPlugin,
  HeadPluginInput,
  ResolvableHead,
  Unhead,
} from './types'
import { createHooks } from 'hookable'

function registerPlugin(head: Unhead<any>, p: HeadPluginInput) {
  const plugin = (typeof p === 'function' ? p(head) : p)
  // key is required in types but we avoid breaking changes
  const key = plugin.key || String(head.plugins.size + 1)
  const exists = head.plugins.get(key)
  if (!exists) {
    head.plugins.set(key, plugin)
    head.hooks.addHooks(plugin.hooks || {})
  }
}

/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createUnhead<T = ResolvableHead>(resolvedOptions: CreateHeadOptions = {}) {
  // counter for keeping unique ids of head object entries
  const hooks = createHooks<HeadHooks>()
  hooks.addHooks(resolvedOptions.hooks || {})
  const ssr = !resolvedOptions.document

  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: Map<string, HeadPlugin> = new Map()
  const _normalizeQueue = new Set<number>()
  const head: Unhead<T> = {
    _entryCount: 1, // 0 is reserved for internal use
    _normalizeQueue,
    plugins,
    dirty: false,
    resolvedOptions,
    hooks,
    ssr,
    entries,
    use: (p: HeadPluginInput) => registerPlugin(head, p),
    push(input: T, _options?: HeadEntryOptions | undefined) {
      const options = { ..._options || {} } as HeadEntryOptions
      delete options.head
      const _i = options._index ?? head._entryCount++
      const inst = { _i, input, options }
      const _: ActiveHeadEntry<T> = {
        _poll(rm = false) {
          head.dirty = true
          !rm && _normalizeQueue.add(_i)
          hooks.callHook('entries:updated', head)
        },
        dispose() {
          if (entries.delete(_i)) {
            // Re-queue remaining entries for normalization after disposal
            head.invalidate()
          }
        },
        // a patch is the same as creating a new entry, just a nice DX
        patch(input) {
          inst.input = input
          entries.set(_i, inst)
          _._poll()
        },
      }
      _.patch(input)
      return _
    },
    invalidate() {
      // Re-queue all current entries for normalization
      for (const entry of entries.values()) {
        _normalizeQueue.add(entry._i)
      }
      head.dirty = true
      hooks.callHook('entries:updated', head)
    },
  }
  ;(resolvedOptions?.plugins || []).forEach(p => registerPlugin(head, p))
  resolvedOptions.init?.forEach(e => e && head.push(e as T))
  return head
}
