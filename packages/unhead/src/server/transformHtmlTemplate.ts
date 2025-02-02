import type { RenderSSRHeadOptions, Unhead } from '@unhead/schema'
import { renderSSRHead } from './renderSSRHead'
import { extractTagsFromHtml } from './util/extractTagsFromHtml'

export async function transformHtmlTemplate(head: Unhead<any>, html: string, options?: RenderSSRHeadOptions) {
  const { html: parsedHtml, input } = extractTagsFromHtml(html)
  head.push(input)
  const headHtml = await renderSSRHead(head, options)
  return parsedHtml
    .replace('<html>', `<html${headHtml.htmlAttrs}>`)
    .replace('<body>', `<body>${headHtml.bodyTagsOpen ? `\n${headHtml.bodyTagsOpen}` : ``}`)
    .replace('<body>', `<body${headHtml.bodyAttrs}>`)
    .replace('</head>', `${headHtml.headTags}</head>`)
    .replace('</body>', `${headHtml.bodyTags}</body>`)
}
