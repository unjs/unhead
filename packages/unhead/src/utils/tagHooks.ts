import type { HookCallback } from 'hookable'
import type { ResolvedHeadTag as HeadTag, HeadTagInput, Unhead } from '../types'

function syncTag(tag: HeadTagInput, previous?: Set<HeadTag['attrs']>): HeadTag {
  if (tag.attrs !== undefined && tag.attrs === tag.props)
    return tag as HeadTag
  const attrs = tag.attrs === undefined || (tag.props !== undefined && previous?.has(tag.attrs))
    ? tag.props ?? {}
    : tag.attrs
  // Keep hook-owned tag references shared with tagMap. Copy external or
  // frozen tags so prepared input and entry caches remain untouched.
  if (previous && !Object.isFrozen(tag)) {
    tag.attrs = attrs
    tag.props = attrs
    return tag as HeadTag
  }
  return { ...tag, attrs, props: attrs }
}

export function syncTagAliases(tags: HeadTagInput[], previous?: Set<HeadTag['attrs']>): asserts tags is HeadTag[] {
  for (let i = 0; i < tags.length; i++)
    tags[i] = syncTag(tags[i], previous)
}

interface TagHookContext {
  tags: HeadTag[]
  tagMap?: Map<string, HeadTag>
}

function bindTagAliases(tag: HeadTag): HeadTag {
  if (Object.isFrozen(tag))
    tag = { ...tag }
  // Live tags share one attribute bag even during a listener. Keep the alias
  // enumerable so object spreads and serialized wire formats still include it.
  Object.defineProperty(tag, 'props', {
    configurable: true,
    enumerable: true,
    get() { return this.attrs },
    set(attrs) { this.attrs = attrs },
  })
  return tag
}

function syncContext(ctx: TagHookContext, previous?: Set<HeadTag['attrs']>) {
  syncTagAliases(ctx.tags, previous)
  for (let i = 0; i < ctx.tags.length; i++)
    ctx.tags[i] = bindTagAliases(ctx.tags[i])
  for (const [key, tag] of ctx.tagMap || []) {
    // Array-valued duplicate meta entries also carry tag metadata.
    if (Array.isArray(tag)) {
      syncTagAliases(tag, previous)
      for (let i = 0; i < tag.length; i++)
        tag[i] = bindTagAliases(tag[i])
    }
    const resolved = bindTagAliases(syncTag(tag, previous))
    if (resolved !== tag)
      ctx.tagMap!.set(key, resolved)
  }
}

// Reconcile after each listener so the next listener sees replacements and
// inserted tags through either alias. Keep this helper out of the public barrel.
export function callTagHook(head: Unhead<any, any>, hook: string, ctx: { tags: HeadTag[] }): void | Promise<void> {
  return head.hooks?.callHook(hook as any, ctx)
}

export function dispatchTagHook(hooks: HookCallback[] | undefined, ctx: TagHookContext): void | Promise<void> {
  if (!hooks?.length)
    return
  syncContext(ctx)
  const callNext = (start: number): void | Promise<void> => {
    for (let i = start; i < hooks.length; i++) {
      const previous = new Set(ctx.tags.map(tag => tag.attrs))
      for (const tag of ctx.tagMap?.values() || [])
        previous.add(tag.attrs)
      // Match HookableCore's synchronous dispatch and promise continuation.
      try {
        const result = hooks[i](ctx)
        syncContext(ctx, previous)
        if (result && typeof result.then === 'function') {
          return Promise.resolve(result).then(() => {
            syncContext(ctx, previous)
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
