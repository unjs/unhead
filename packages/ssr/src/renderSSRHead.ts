import { ssrRenderTags } from 'zhead'
import type { HeadClient } from '@unhead/schema'
import type { SSRHeadPayload } from './types'

export async function renderSSRHead<T extends HeadClient>(ctx: T) {
  const tags = await ctx.resolveTags()
  const beforeRenderCtx = { tags }
  await ctx.hooks.callHook('ssr:beforeRender', beforeRenderCtx)
  const html: SSRHeadPayload = ssrRenderTags(beforeRenderCtx.tags)
  const renderCXx = { tags, html }
  await ctx.hooks.callHook('ssr:render', renderCXx)
  return renderCXx.html
}
