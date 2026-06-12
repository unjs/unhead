import type { HookableCore } from 'hookable'
import type { CoreHeadHooks, Unhead } from '../types'
import { HookableCore as Hookable } from 'hookable'

export function createHooks<T extends CoreHeadHooks>(hooks?: Partial<T>): HookableCore<T> {
  const instance = new Hookable<T>()
  for (const key in hooks || {}) {
    instance.hook(key as any, hooks![key as keyof typeof hooks] as any)
  }
  return instance
}

export function callHook(head: Unhead<any, any>, hook: string, ctx: any) {
  return head.hooks?.callHook(hook as any, ctx)
}

/**
 * Calls a hook's callbacks synchronously in plugin order, without hookable's
 * promise chaining. Used on the render hot path — render hooks are sync-only.
 */
export function callSyncHook(head: Unhead<any, any>, hook: string, ctx: any) {
  const fns = (head.hooks as any)?._hooks?.[hook]
  if (fns) {
    for (let i = 0; i < fns.length; i++)
      fns[i](ctx)
  }
}
