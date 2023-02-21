import type { BeforeRenderContext, HeadTag, SSRHeadPayload, SSRRenderContext, Unhead } from '@unhead/schema'
import { computeHashes } from '@unhead/shared'
import { ssrRenderTags } from './util'

export async function renderSSRHead<T extends {}>(head: Unhead<T>) {
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
  if (head.resolvedOptions.experimentalHashHydration) {
    ctx.tags.push(<HeadTag> {
      tag: 'meta',
      props: {
        name: 'unhead:ssr',
        content: computeHashes(
          ctx.tags
            .filter((t) => {
              // find entry
              const entry = head.headEntries().find(entry => entry._i === t._e)
              // we don't care about server entries
              return entry?._m !== 'server'
            })
            .map(tag => tag._h!),
        ),
      },
    })
  }
  await head.hooks.callHook('ssr:render', ctx)
  const html: SSRHeadPayload = ssrRenderTags(ctx.tags)
  const renderCtx: SSRRenderContext = { tags: ctx.tags, html }
  await head.hooks.callHook('ssr:rendered', renderCtx)
  return renderCtx.html
}
