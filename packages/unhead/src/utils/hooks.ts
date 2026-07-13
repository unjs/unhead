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

let warnedAsyncHook = false

export function callHook(head: Unhead<any, any>, hook: string, ctx: any) {
  const hooks = (head.hooks as any)?._hooks?.[hook]
  if (!hooks?.length)
    return
  const res: any = head.hooks?.callHook(hook as any, ctx)
  // this is a synchronous pipeline: a listener returning a thenable is not
  // awaited — later listeners run out of order and the result is dropped
  if (res?.then && !warnedAsyncHook) {
    warnedAsyncHook = true
    console.warn(`[unhead] hook promise ignored: ${hook}`)
  }
  return res
}
