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
  const hooks = (head.hooks as any)?._hooks?.[hook]
  if (!hooks?.length)
    return
  return head.hooks?.callHook(hook as any, ctx)
}
