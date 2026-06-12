import type { ActiveHeadEntry, CreateHeadOptions, HeadEntry, HeadEntryOptions, HeadPlugin, HeadPluginInput, HeadRenderer, ResolvableHead, Unhead } from './types'
import { markImpureInput } from './utils/staticEntry'

export function registerPlugin(head: Unhead<any, any>, p: HeadPluginInput) {
  const plugin = typeof p === 'function' ? p(head) : p
  const key = plugin.key || String(head.plugins.size + 1)
  if (!head.plugins.get(key)) {
    head.plugins.set(key, plugin)
    for (const k in plugin.hooks || {}) {
      const fn = plugin.hooks![k] as any
      fn._o = plugin.order || 0
      head.hooks?.hook(k as any, fn)
      // callbacks run in plugin `order` (lower first), stable by registration
      const list = (head.hooks as any)?._hooks?.[k]
      if (list?.length > 1)
        list.sort((a: any, b: any) => (a._o || 0) - (b._o || 0))
    }
  }
}

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
    push(input: T, _options?: HeadEntryOptions) {
      const _i = _options?._index ?? head._entryCount++
      const options = _options ? { ..._options } : {}
      delete (options as any).head
      delete (options as any).onRendered
      const isStatic = (options as any).static
      delete (options as any).static
      const entry: HeadEntry<T> = { _i, input, options }
      if (isStatic)
        entry._static = true
      entries.set(_i, entry)
      const active: ActiveHeadEntry<T> = {
        _i,
        dispose() { entries.delete(_i) },
        patch(input) {
          // patching with the same object identity means it was mutated in
          // place — it can never be treated as a shared static input
          if (resolvedOptions.staticCache && input === entry.input)
            markImpureInput(resolvedOptions.staticCache, input)
          if (ssr) {
            entry.input = input
            delete entry._tags
          }
          else {
            entry._pending = input
          }
          if (!entries.has(_i))
            entries.set(_i, entry)
        },
      }
      return active
    },
  }
  resolvedOptions.init?.forEach((e) => {
    if (e) {
      const active = head.push(e as T)
      // init inputs are config-level and usually identical across heads:
      // eligible for automatic static-entry inference
      entries.get(active._i)!._init = true
    }
  })
  return head
}
