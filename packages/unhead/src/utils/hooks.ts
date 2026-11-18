import type { HookableCore } from 'hookable'
import type { CoreHeadHooks, Unhead } from '../types'
import { HookableCore as Hookable } from 'hookable'
import { dispatchTagHook } from './tagHooks'

const TAG_HOOK_RE = /^(?:entries:normalize|tags:(?:beforeResolve|resolve|afterResolve)|ssr:render)$/

export function createHooks<T extends CoreHeadHooks>(hooks?: Partial<T>): HookableCore<T> {
  const instance = new Hookable<T>()
  const callHook = instance.callHook.bind(instance)
  // Keep tag reconciliation behind callHook so plugin instrumentation observes
  // the same dispatch and promise result as every other hook.
  instance.callHook = (name, ...args) => TAG_HOOK_RE.test(name)
    ? dispatchTagHook((instance as any)._hooks[name], args[0])
    : callHook(name, ...args)
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
