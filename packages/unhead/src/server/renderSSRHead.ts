import type { HeadRenderer, RenderSSRHeadOptions, ShouldRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '../types'
import { callHook } from '../utils/hooks'
import { resolveTags } from '../utils/resolve'
import { capoTagWeight } from './sort'
import { ssrRenderTags } from './util'

/* @__NO_SIDE_EFFECTS__ */
export function createServerRenderer(options: RenderSSRHeadOptions = {}): HeadRenderer<SSRHeadPayload> {
  return (head: Unhead<any>) => {
    const beforeRenderCtx: ShouldRenderContext = { shouldRender: true }
    callHook(head, 'ssr:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return ssrRenderTags([])
    const ctx = { tags: options.resolvedTags || resolveTags(head, { tagWeight: options.tagWeight ?? capoTagWeight }) }
    callHook(head, 'ssr:render', ctx)
    const html: SSRHeadPayload = ssrRenderTags(ctx.tags, options)
    const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
    callHook(head, 'ssr:rendered', renderCtx)
    return renderCtx.html
  }
}

/**
 * @deprecated Use `head.render()` instead.
 */
/* @__NO_SIDE_EFFECTS__ */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return createServerRenderer(options)(head)
}
