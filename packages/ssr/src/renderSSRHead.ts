import type { BeforeSSRRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '@unhead/schema'
import { ssrRenderTags } from './util'

export async function renderSSRHead<T extends {}>(head: Unhead<T>) {
  const ctx = { tags: await head.resolveTags() }
  const beforeRenderCtx: BeforeSSRRenderContext = { shouldRender: true, tags: ctx.tags }
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
  await head.hooks.callHook('ssr:render', ctx)
  const html: SSRHeadPayload = ssrRenderTags(ctx.tags)
  const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
  await head.hooks.callHook('ssr:rendered', renderCtx)
  return renderCtx.html
}
