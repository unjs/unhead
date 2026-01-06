import type {
  ActiveHeadEntry,
  CreateHeadOptions,
  HeadEntry,
  HeadEntryOptions,
  HeadPlugin,
  HeadPluginInput,
  HeadRenderer,
  ResolvableHead,
  Unhead,
} from './types'

export function registerPlugin(head: Unhead<any, any>, p: HeadPluginInput) {
  const plugin = (typeof p === 'function' ? p(head) : p)
  const key = plugin.key || String(head.plugins.size + 1)
  if (!head.plugins.get(key)) {
    head.plugins.set(key, plugin)
    for (const hookKey in plugin.hooks || {}) {
      head.hooks?.hook(hookKey as any, plugin.hooks![hookKey] as any)
    }
  }
}

/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createUnhead<T = ResolvableHead, R = unknown>(renderer: HeadRenderer<R>, resolvedOptions: CreateHeadOptions = {}): Unhead<T, R> {
  const ssr = !resolvedOptions.document
  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: Map<string, HeadPlugin> = new Map()
  const head: Unhead<T, R> = {
    _entryCount: 1,
    plugins,
    resolvedOptions,
    ssr,
    entries,
    render: () => renderer(head),
    use: (p: HeadPluginInput) => registerPlugin(head, p),
    push(input: T, _options?: HeadEntryOptions | undefined) {
      const _i = _options?._index ?? head._entryCount++
      const options = _options ? { ..._options, head: undefined } : {}
      const entry: HeadEntry<T> = { _i, input, options }
      entries.set(_i, entry)
      const active: ActiveHeadEntry<T> = {
        _i,
        dispose() {
          entries.delete(_i)
        },
        patch(input) {
          // SSR: apply immediately. Client: defer to next render (avoids hydration race)
          if (ssr) {
            entry.input = input
            delete entry._tags
          }
          else {
            entry._pending = input
          }
          // Re-add to entries if removed (e.g. after shell render)
          if (!entries.has(_i))
            entries.set(_i, entry)
        },
      }
      return active
    },
  }
  resolvedOptions.init?.forEach(e => e && head.push(e as T))
  return head
}
