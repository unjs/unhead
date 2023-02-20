import type { BeforeRenderContext, SSRHeadPayload, SSRRenderContext, Unhead } from '@unhead/schema'
import { ssrRenderTags } from './util'
import {HeadTag} from "@unhead/schema";
import {computeHashes} from "@unhead/shared";

export interface RenderSSROptions {
  /**
   * Append a hash meta to the end of the head tags to allow quicker DOM hydration.
   *
   * @default true
   */
  appendHash?: boolean
}
export async function renderSSRHead<T extends {}>(head: Unhead<T>, options: RenderSSROptions = {}) {
  options.appendHash = options.appendHash ?? true
  const beforeRenderCtx: BeforeRenderContext = { shouldRender: true }
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
  const hashTag = <HeadTag> {
    tag: 'meta',
    props: {
      property: 'unhead:ssr',
      content: computeHashes(ctx.tags.map((tag) => tag._h!))
    },
    _e: -2,
    _p: -2,
  }
  ctx.tags.unshift(hashTag)
  console.log(ctx.tags)
  await head.hooks.callHook('ssr:render', ctx)
  const html: SSRHeadPayload = ssrRenderTags(ctx.tags)
  const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
  await head.hooks.callHook('ssr:rendered', renderCtx)
  return renderCtx.html
}
