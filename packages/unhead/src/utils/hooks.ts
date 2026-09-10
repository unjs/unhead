import type { HookableCore, HookCallback } from 'hookable'
import type { CoreHeadHooks, Unhead } from '../types'
import { HookableCore as Hookable } from 'hookable'

function callRegisteredHooks(hooks: HookCallback[], args: any[], start = 0): Promise<void> | void {
  for (let i = start; i < hooks.length; i++) {
    // Keep synchronous failures synchronous so renderers can stop before consuming entries.
    const result = hooks[i](...args)
    if (result && typeof result.then === 'function')
      return Promise.resolve(result).then(() => callRegisteredHooks(hooks, args, i + 1))
  }
}

export function createHooks<T extends CoreHeadHooks>(hooks?: Partial<T>): HookableCore<T> {
  const instance = new Hookable<T>()
  instance.callHook = (name, ...args) => {
    const registered = (instance as any)._hooks[name] as HookCallback[] | undefined
    if (registered?.length)
      return callRegisteredHooks(registered, args)
  }
  for (const key in hooks || {}) {
    instance.hook(key as any, hooks![key as keyof typeof hooks] as any)
  }
  return instance
}

export function callHook(head: Unhead<any, any>, hook: string, ctx: any) {
  const hooks = (head.hooks as any)?._hooks?.[hook]
  if (!hooks?.length)
    return
  return head.hooks?.callHook(hook as any, ctx)
}
