import type { RenderSSRHeadOptions, ShouldRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '../types'
import { ssrRenderTags } from './util'

export async function renderSSRHead<T extends Record<string, any>>(head: Unhead<T>, options?: RenderSSRHeadOptions) {
  const beforeRenderCtx: ShouldRenderContext = { shouldRender: true }
  await head.hooks.callHook('ssr:beforeRender', beforeRenderCtx)
  if (!beforeRenderCtx.shouldRender) {
    return {
      headTags: '',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: '',
      bodyAttrs: '',
    }
  }
  const ctx = { tags: await head.resolveTags() }
  await head.hooks.callHook('ssr:render', ctx)
  const html: SSRHeadPayload = ssrRenderTags(ctx.tags, options)
  const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
  await head.hooks.callHook('ssr:rendered', renderCtx)
  return renderCtx.html
}
