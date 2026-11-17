import type { HookableCore } from 'hookable'
import type { ClientHeadHooks, HeadEntryOptions, HeadRenderer, ResolvableHead, Unhead } from '../types'

export interface ClientUnhead<T = ResolvableHead, RenderResult = boolean> extends Unhead<T, RenderResult> {
  hooks: HookableCore<ClientHeadHooks<T, RenderResult>>
  dirty: boolean
  invalidate: () => void
}

export function createClientHeadAdapter<T, RenderResult>(core: Unhead<T, RenderResult>, hooks: HookableCore<ClientHeadHooks<T, RenderResult>>, render: HeadRenderer<RenderResult, T>): ClientUnhead<T, RenderResult> {
  const corePush = core.push
  const head = core as ClientUnhead<T, RenderResult>
  head.ssr = false
  head.hooks = hooks
  head.dirty = !!head.dirty
  head.render = () => render(head)
  // Every change marks the head dirty first.
  // Render here because an async hook listener could break batching.
  function notify() {
    head.dirty = true
    hooks.callHook('entries:updated', head)
    if (!head._b)
      head.render()
  }
  head.invalidate = () => {
    for (const entry of head.entries.values())
      delete entry._tags
    notify()
  }
  head.push = (input: T, entryOptions?: HeadEntryOptions<T>) => {
    const unhook = entryOptions?.onRendered
      ? hooks.hook('dom:rendered', entryOptions.onRendered as any)
      : undefined
    const active = corePush(input, entryOptions)
    const entry = core.entries.get(active._i)
    if (entry)
      entry._o = input
    notify()
    return {
      _i: active._i,
      patch(input: T) {
        active.patch(input)
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
