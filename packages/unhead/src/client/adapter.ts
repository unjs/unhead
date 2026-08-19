import type { HookableCore } from 'hookable'
import type { ClientHeadHooks, HeadEntryOptions, HeadRenderer, ResolvableHead, Unhead } from '../types'
import { registerPlugin } from '../unhead'

export interface ClientUnhead<T = ResolvableHead> extends Unhead<T, boolean> {
  hooks: HookableCore<ClientHeadHooks>
  dirty: boolean
  invalidate: () => void
}

export function createClientHeadAdapter<T>(core: Unhead<T, boolean>, hooks: HookableCore<ClientHeadHooks>, render: HeadRenderer<boolean>): ClientUnhead<T> {
  const corePush = core.push
  const head = core as ClientUnhead<T>
  head.ssr = false
  head.hooks = hooks
  head.dirty = !!head.dirty
  head.use = p => registerPlugin(head, p)
  head.render = () => render(head)
  // Rendering happens here rather than in an `entries:updated` listener.
  // `hookable` awaits listeners in sequence, so one async listener would defer
  // a listener-driven render past the synchronous batch that `_b` guards, and
  // the batch would silently degrade to a render per push.
  function notify() {
    hooks.callHook('entries:updated', head)
    if (!head._b)
      head.render()
  }
  head.invalidate = () => {
    for (const entry of head.entries.values())
      delete entry._tags
    head.dirty = true
    notify()
  }
  head.push = (input: T, entryOptions?: HeadEntryOptions) => {
    const unhook = entryOptions?.onRendered
      ? hooks.hook('dom:rendered', entryOptions.onRendered as any)
      : undefined
    const active = corePush(input, entryOptions)
    const entry = core.entries.get(active._i)
    if (entry)
      entry._o = input
    head.dirty = true
    notify()
    return {
      _i: active._i,
      patch(input: T) {
        active.patch(input)
        head.dirty = true
        notify()
      },
      dispose() {
        unhook?.()
        if (core.entries.has(active._i)) {
          active.dispose()
          head.invalidate()
        }
      },
    }
  }
  return head
}
