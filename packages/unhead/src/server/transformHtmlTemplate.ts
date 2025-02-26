import type { RenderSSRHeadOptions, Unhead } from '../types'
import { renderSSRHead } from './renderSSRHead'
import { extractUnheadInputFromHtml } from './util/extractUnheadInputFromHtml'

export async function transformHtmlTemplate(head: Unhead<any>, html: string, options?: RenderSSRHeadOptions) {
  const { html: parsedHtml, input } = extractUnheadInputFromHtml(html)
  head.push(input, { _index: 0 })
  const headHtml = await renderSSRHead(head, options)
  return parsedHtml
    .replace('<html>', `<html${headHtml.htmlAttrs}>`)
    .replace('<body>', `<body>${headHtml.bodyTagsOpen ? `\n${headHtml.bodyTagsOpen}` : ``}`)
    .replace('<body>', `<body${headHtml.bodyAttrs}>`)
    .replace('</head>', `${headHtml.headTags}</head>`)
    .replace('</body>', `${headHtml.bodyTags}</body>`)
}
