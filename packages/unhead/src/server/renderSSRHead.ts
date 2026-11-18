import type { HeadRenderer, RenderSSRHeadOptions, ShouldRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '../types'
import { callHook } from '../utils/hooks'
import { resolveTags } from '../utils/resolve'
import { callTagHook } from '../utils/tagHooks'
import { capoTagWeight } from './sort'
import { ssrRenderTags } from './util'

/* @__NO_SIDE_EFFECTS__ */
export function createServerRenderer(options: RenderSSRHeadOptions = {}): HeadRenderer<SSRHeadPayload> {
  return (head: Unhead<any>) => {
    const beforeRenderCtx: ShouldRenderContext = { shouldRender: true }
    callHook(head, 'ssr:beforeRender', beforeRenderCtx)
    if (!beforeRenderCtx.shouldRender)
      return ssrRenderTags([])
    // Fresh per-render options so plugins (e.g. MinifyPlugin) can override
    // render behaviour like `omitLineBreaks` without leaking into the closure.
    const ctx = {
      // Normalize external inputs before hooks, including when no listeners run.
      tags: options.resolvedTags?.map((tag) => {
        const attrs = tag.attrs ?? tag.props ?? {}
        return { ...tag, attrs, props: attrs }
      }) || resolveTags(head, { tagWeight: options.tagWeight ?? capoTagWeight }),
      options: { ...options },
    }
    callTagHook(head, 'ssr:render', ctx)
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
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return createServerRenderer(options)(head)
}
