import type { HookableCore } from 'hookable'
import type { ActiveHeadEntry, ClientHeadHooks, HeadEntryOptions, HeadRenderer, ResolvableHead, Unhead } from '../types'
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
  head.invalidate = () => {
    for (const entry of head.entries.values())
      delete entry._tags
    head.dirty = true
    hooks.callHook('entries:updated', head)
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
    hooks.callHook('entries:updated', head)
    return {
      _i: active._i,
      patch(input: T) {
        active.patch(input)
        head.dirty = true
        hooks.callHook('entries:updated', head)
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
  hooks.hook('entries:updated', () => {
    head.render()
  })
  return head
}

export function createStreamClientHeadAdapter<T>(core: Unhead<T, boolean>, hooks: HookableCore<ClientHeadHooks>, render: HeadRenderer<boolean>, locked: () => boolean): ClientUnhead<T> {
  const head = createClientHeadAdapter(core, hooks, render)
  const push = head.push
  head.push = (input, options) => {
    if (locked()) {
      return {
        _i: -1,
        patch: () => {},
        dispose: () => {},
      } as ActiveHeadEntry<T>
    }
    const active = push(input, options)
    const patch = active.patch
    active.patch = input => !locked() && patch(input)
    return active
  }
  return head
}
