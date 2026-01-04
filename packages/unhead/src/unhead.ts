import type {
  ActiveHeadEntry,
  CreateHeadOptions,
  HeadEntry,
  HeadEntryOptions,
  HeadHooks,
  HeadPlugin,
  HeadPluginInput,
  HeadRenderer,
  ResolvableHead,
  Unhead,
} from './types'
import { createHooks } from 'hookable'

export function registerPlugin(head: Unhead<any, any>, p: HeadPluginInput) {
  const plugin = (typeof p === 'function' ? p(head) : p)
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
export function createUnhead<T = ResolvableHead, R = unknown>(renderer: HeadRenderer<R>, resolvedOptions: CreateHeadOptions = {}): Unhead<T, R> {
  const hooks = createHooks<HeadHooks>()
  hooks.addHooks(resolvedOptions.hooks || {})
  const ssr = !resolvedOptions.document

  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: Map<string, HeadPlugin> = new Map()
  const head: Unhead<T, R> = {
    _entryCount: 1, // 0 is reserved for internal use
    plugins,
    resolvedOptions,
    hooks,
    ssr,
    entries,
    render: () => renderer(head),
    use: (p: HeadPluginInput) => registerPlugin(head, p),
    push(input: T, _options?: HeadEntryOptions | undefined) {
      const options = { ..._options || {} } as HeadEntryOptions
      delete options.head
      const _i = options._index ?? head._entryCount++
      const entry = { _i, input, options }
      entries.set(_i, entry)
      const active: ActiveHeadEntry<T> = {
        _i,
        dispose() {
          entries.delete(_i)
        },
        patch(input) {
          entry.input = input
        },
      }
      return active
    },
  }
  ;(resolvedOptions?.plugins || []).forEach(p => registerPlugin(head, p))
  resolvedOptions.init?.forEach(e => e && head.push(e as T))
  return head
}
