import type { HeadRenderer, RenderSSRHeadOptions, ShouldRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '../types'
import { callHook } from '../utils/callHook'
import { resolveTags } from '../utils/resolve'
import { capoTagWeight } from './sort'
import { ssrRenderTags } from './util'

const DEFAULT_RESOLVE_OPTIONS = { tagWeight: capoTagWeight }

/* @__NO_SIDE_EFFECTS__ */
export function createServerRenderer(options: RenderSSRHeadOptions = {}): HeadRenderer<SSRHeadPayload> {
  const resolveOpts = options.tagWeight ? { tagWeight: options.tagWeight } : DEFAULT_RESOLVE_OPTIONS
  return (head: Unhead<any>) => {
    const hooks = (head.hooks as any)?._hooks
    if (hooks?.['ssr:beforeRender']?.length) {
      const beforeRenderCtx: ShouldRenderContext = { shouldRender: true }
      callHook(head, 'ssr:beforeRender', beforeRenderCtx)
      if (!beforeRenderCtx.shouldRender)
        return ssrRenderTags([])
    }
    let tags = options.resolvedTags || resolveTags(head, resolveOpts)
    let renderOptions = options
    if (hooks?.['ssr:render']?.length) {
      // Fresh per-render options so plugins (e.g. MinifyPlugin) can override
      // render behaviour like `omitLineBreaks` without leaking into the closure.
      const ctx = { tags, options: { ...options } }
      callHook(head, 'ssr:render', ctx)
      tags = ctx.tags
      renderOptions = ctx.options
    }
    const html: SSRHeadPayload = ssrRenderTags(tags, renderOptions)
    if (hooks?.['ssr:rendered']?.length) {
      const renderCtx: SSRRenderContext = { tags, html }
      callHook(head, 'ssr:rendered', renderCtx)
      return renderCtx.html
    }
    return html
  }
}

/**
 * @deprecated Use `head.render()` instead.
 */
/* @__NO_SIDE_EFFECTS__ */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return createServerRenderer(options)(head)
}
