import type { HookCallback } from 'hookable'
import type { HeadTag, Unhead } from '../types'

export function syncTagAliases(tags: HeadTag[], previous?: Set<HeadTag['attrs']>) {
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]
    if (tag.attrs !== undefined && tag.attrs === tag.props)
      continue
    const attrs = tag.attrs === undefined || (tag.props !== undefined && previous?.has(tag.attrs))
      ? tag.props ?? {}
      : tag.attrs
    // Keep hook-owned tag references shared with tagMap. Copy external or
    // frozen tags so prepared input and entry caches remain untouched.
    if (previous && !Object.isFrozen(tag)) {
      tag.attrs = attrs
      tag.props = attrs
    }
    else {
      tags[i] = { ...tag, attrs, props: attrs }
    }
  }
}

// Reconcile after each listener so the next listener sees replacements and
// inserted tags through either alias. Keep this helper out of the public barrel.
export function callTagHook(head: Unhead<any, any>, hook: string, ctx: { tags: HeadTag[] }): void | Promise<void> {
  const hooks = (head.hooks as any)?._hooks?.[hook] as HookCallback[] | undefined
  if (!hooks?.length)
    return
  syncTagAliases(ctx.tags)
  const callNext = (start: number): void | Promise<void> => {
    for (let i = start; i < hooks.length; i++) {
      const previous = new Set(ctx.tags.map(tag => tag.attrs))
      // Match HookableCore's synchronous dispatch and promise continuation.
      try {
        const result = hooks[i](ctx)
        syncTagAliases(ctx.tags, previous)
        if (result && typeof result.then === 'function') {
          return Promise.resolve(result).then(() => {
            syncTagAliases(ctx.tags, previous)
            return callNext(i + 1)
          })
        }
      }
      catch (error) {
        return Promise.reject(error)
      }
    }
  }
  return callNext(0)
}
