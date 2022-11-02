import { ssrRenderTags } from 'zhead'
import type { HeadClient } from '../../types'

export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export const renderSSRHead = async<T extends HeadClient<any>>(ctx: T) => {
  const tags = await ctx.resolveTags()
  const beforeRenderCtx = { tags }
  await ctx.hooks.callHook('ssr:beforeRender', beforeRenderCtx)
  const html: SSRHeadPayload = ssrRenderTags(beforeRenderCtx.tags)
  const renderCXx = { tags, html }
  await ctx.hooks.callHook('ssr:render', renderCXx)
  return renderCXx.html
}
