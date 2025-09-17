import type { RenderSSRHeadOptions, SSRHeadPayload, Unhead } from '../types'
import { renderSSRHead } from './renderSSRHead'
import { extractUnheadInputFromHtml } from './util/extractUnheadInputFromHtml'

function applyHeadToHtml(html: string, headHtml: SSRHeadPayload): string {
  return html
    .replace('<html>', `<html${headHtml.htmlAttrs}>`)
    .replace('</head>', `${headHtml.headTags}</head>`)
    .replace('<body>', `<body${headHtml.bodyAttrs}>${headHtml.bodyTagsOpen ? `\n${headHtml.bodyTagsOpen}` : ''}`)
    .replace('</body>', `${headHtml.bodyTags}</body>`)
}

export async function transformHtmlTemplate(head: Unhead<any>, html: string, options?: RenderSSRHeadOptions) {
  const { html: parsedHtml, input } = extractUnheadInputFromHtml(html)
  head.push(input, { _index: 0 })
  const headHtml = await renderSSRHead(head, options)
  return applyHeadToHtml(parsedHtml, headHtml)
}
