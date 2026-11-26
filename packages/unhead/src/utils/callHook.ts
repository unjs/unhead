import type { Unhead } from '../types'

// Kept apart from `createHooks`, so a chunk that only calls hooks does not bundle hook registration
export function callHook(head: Unhead<any, any>, hook: string, ctx: any) {
  const hooks = head.hooks as any
  if (!hooks)
    return
  if (hooks._hooks && !hooks._hooks[hook]?.length)
    return
  return hooks.callHook?.(hook, ctx)
}
