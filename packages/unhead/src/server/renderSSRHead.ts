import type { RenderSSRHeadOptions, ShouldRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '../types'
import { resolveTags } from '../utils/resolve'
import { capoTagWeight } from './sort'
import { ssrRenderTags } from './util'

/* @__NO_SIDE_EFFECTS__ */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  const beforeRenderCtx: ShouldRenderContext = { shouldRender: true }
  head.hooks.callHook('ssr:beforeRender', beforeRenderCtx)
  if (!beforeRenderCtx.shouldRender)
    return ssrRenderTags([])
  const ctx = { tags: options?.resolvedTags || resolveTags(head, { tagWeight: options?.tagWeight ?? capoTagWeight }) }
  head.hooks.callHook('ssr:render', ctx)
  const html: SSRHeadPayload = ssrRenderTags(ctx.tags, options)
  const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
  head.hooks.callHook('ssr:rendered', renderCtx)
  return renderCtx.html
}
