import type { SSRHeadPayload, SSRRenderContext, ShouldRenderContext, Unhead } from '@unhead/schema'
import { ssrRenderTags } from './util'

export async function renderSSRHead<T extends {}>(head: Unhead<T>) {
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
  const html: SSRHeadPayload = ssrRenderTags(ctx.tags)
  const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
  await head.hooks.callHook('ssr:rendered', renderCtx)
  return renderCtx.html
}
