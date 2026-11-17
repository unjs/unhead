import type { RenderSSRHeadOptions, ShouldRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '../types'
import { callHook } from '../utils/hooks'
import { resolveTags } from '../utils/resolve'
import { capoTagWeight } from './sort'
import { ssrRenderTags } from './util'

/* @__NO_SIDE_EFFECTS__ */
export function createServerRenderer(options: RenderSSRHeadOptions = {}): <Input, RenderResult>(head: Unhead<Input, RenderResult>) => SSRHeadPayload {
  return (head) => {
    const beforeRenderCtx: ShouldRenderContext = { shouldRender: true }
    callHook(head, 'ssr:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return ssrRenderTags([])
    // Fresh per-render options so plugins (e.g. MinifyPlugin) can override
    // render behaviour like `omitLineBreaks` without leaking into the closure.
    const ctx = {
      tags: options.resolvedTags || resolveTags(head, { tagWeight: options.tagWeight ?? capoTagWeight }),
      options: { ...options },
    }
    callHook(head, 'ssr:render', ctx)
    const html: SSRHeadPayload = ssrRenderTags(ctx.tags, ctx.options)
    const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
    callHook(head, 'ssr:rendered', renderCtx)
    return renderCtx.html
  }
}

/**
 * @deprecated Use `head.render()` instead.
 */
/* @__NO_SIDE_EFFECTS__ */
export function renderSSRHead<Input, RenderResult>(head: Unhead<Input, RenderResult>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return createServerRenderer(options)(head)
}
