import type { Unhead } from '../types'

// Kept apart from `createHooks`, so a chunk that only calls hooks does not import hookable
export function callHook(head: Unhead<any, any>, hook: string, ctx: any) {
  const hooks = (head.hooks as any)?._hooks?.[hook]
  if (!hooks?.length)
    return
  return head.hooks?.callHook(hook as any, ctx)
}
