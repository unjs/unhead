import { ssrRenderTags } from 'zhead'
import type { BeforeRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '@unhead/schema'

export async function renderSSRHead<T extends {}>(head: Unhead<T>) {
  const tags = await head.resolveTags()
  const beforeRenderCtx: BeforeRenderContext = { shouldRender: true, tags }
  if (!beforeRenderCtx.shouldRender) {
    return {
      headTags: '',
      bodyTags: '',
      bodyTagsOpen: '',
      htmlAttrs: '',
      bodyAttrs: '',
    }
  }
  await head.hooks.callHook('ssr:beforeRender', beforeRenderCtx)
  const html: SSRHeadPayload = ssrRenderTags(beforeRenderCtx.tags)
  const renderCtx: SSRRenderContext = { tags, html }
  await head.hooks.callHook('ssr:render', renderCtx)
  return renderCtx.html
}
