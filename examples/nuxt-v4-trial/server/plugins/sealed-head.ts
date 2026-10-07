// Nitro runtime plugin: merges the sealed head payload into the rendered
// document. Runs inside the server bundle, after the Vue app rendered, so
// every plan pushed during setup is present.
import { renderSSRHead } from '@unhead/vue/precompiled/server'

export default (nitroApp: any) => {
  nitroApp.hooks.hook('render:html', async (html: { head: string[], htmlAttrs: string[], bodyAttrs: string[], bodyPrepend: string[], bodyAppend: string[] }, ctx: { event: object }) => {
    const head = (globalThis as any).__unheadSealedHeads?.get(ctx.event)
    if (!head)
      return
    const payload = renderSSRHead(head)
    if (payload.headTags)
      html.head.push(payload.headTags)
    if (payload.htmlAttrs)
      html.htmlAttrs.push(payload.htmlAttrs)
    if (payload.bodyAttrs)
      html.bodyAttrs.push(payload.bodyAttrs)
    if (payload.bodyTagsOpen)
      html.bodyPrepend.push(payload.bodyTagsOpen)
    if (payload.bodyTags)
      html.bodyAppend.push(payload.bodyTags)
  })
}
