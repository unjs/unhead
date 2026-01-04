import type {
  ActiveHeadEntry,
  CoreHeadHooks,
  CreateHeadOptions,
  HeadEntry,
  HeadEntryOptions,
  HeadPlugin,
  HeadPluginInput,
  HeadRenderer,
  ResolvableHead,
  Unhead,
} from './types'
import { HookableCore } from 'hookable'

function addHooks<T extends Record<string, any>>(hooks: HookableCore<T>, configHooks: Partial<T>) {
  for (const key in configHooks) {
    hooks.hook(key as any, configHooks[key] as any)
  }
}

export function registerPlugin(head: Unhead<any, any, any>, p: HeadPluginInput) {
  const plugin = (typeof p === 'function' ? p(head) : p)
  const key = plugin.key || String(head.plugins.size + 1)
  const exists = head.plugins.get(key)
  if (!exists) {
    head.plugins.set(key, plugin)
    addHooks(head.hooks, plugin.hooks || {})
  }
}

/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createUnhead<T = ResolvableHead, R = unknown, H extends CoreHeadHooks = CoreHeadHooks>(renderer: HeadRenderer<R, H>, resolvedOptions: CreateHeadOptions<H> = {}): Unhead<T, R, H> {
  const hooks = new HookableCore<H>()
  addHooks(hooks, resolvedOptions.hooks || {})
  const ssr = !resolvedOptions.document

  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: Map<string, HeadPlugin> = new Map()
  const head: Unhead<T, R, H> = {
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
