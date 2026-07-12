import type { ActiveHeadEntry, CreateHeadOptions, HeadEntry, HeadEntryOptions, HeadHooks, HeadPlugin, HeadPluginInput, HeadRenderer, ResolvableHead, Unhead } from './types'

export function registerPlugin<Input, RenderResult>(head: Unhead<Input, RenderResult>, p: HeadPluginInput<Input, RenderResult>) {
  // a function plugin can declare its key statically so we can bail before
  // running its setup, which may push tags or wrap head methods as a side effect
  if (typeof p === 'function' && p.key && head.plugins.has(p.key))
    return
  const plugin = typeof p === 'function' ? p(head) : p
  const key = plugin.key || String(head.plugins.size + 1)
  if (!head.plugins.get(key)) {
    head.plugins.set(key, plugin)
    for (const k in plugin.hooks || {}) {
      const key = k as keyof HeadHooks<Input, RenderResult>
      const hook = plugin.hooks?.[key]
      if (hook)
        head.hooks?.hook(key, hook)
    }
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function createUnhead<T = ResolvableHead, R = unknown>(renderer: HeadRenderer<R, T>, resolvedOptions: CreateHeadOptions<T> = {}): Unhead<T, R> {
  const ssr = !resolvedOptions.document
  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: Map<string, HeadPlugin<T, R>> = new Map()
  const head: Unhead<T, R> = {
    _entryCount: 1,
    plugins,
    resolvedOptions,
    ssr,
    entries,
    render: () => renderer(head),
    use: (p: HeadPluginInput<T, R>) => registerPlugin(head, p),
    push(input: T, _options?: HeadEntryOptions<T>) {
      const _i = _options?._index ?? head._entryCount++
      const options = _options ? { ..._options } : {}
      delete options.head
      delete options.onRendered
      const entry: HeadEntry<T> = { _i, input, options }
      entries.set(_i, entry)
      const active: ActiveHeadEntry<T> = {
        _i,
        dispose() { entries.delete(_i) },
        patch(input) {
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
  resolvedOptions.init?.forEach(e => e && head.push(e as T))
  return head
}
