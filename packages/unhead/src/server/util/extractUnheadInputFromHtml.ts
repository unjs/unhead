import type { ResolvedHead } from '../../types'

const Attrs = /(\w+)(?:=["']([^"']*)["'])?/g
const HtmlTag = /<html[^>]*>/
const BodyTag = /<body[^>]*>/
const HeadContent = /<head[^>]*>(.*?)<\/head>/s
const SelfClosingTags = /<(meta|link|base)[^>]*>/g
const ClosingTags = /<(title|script|style)[^>]*>[\s\S]*?<\/\1>/g
// eslint-disable-next-line regexp/no-misleading-capturing-group
const NewLines = /(\n\s*)+/g

function extractAttributes(tag: string) {
  // inner should be between the < and > (non greedy), split on ' ' and after index 0
  const inner = tag.match(/<([^>]*)>/)?.[1].split(' ').slice(1).join(' ')
  if (!inner)
    return {}
  const attrs = inner.match(Attrs)
  return attrs?.reduce((acc, attr) => {
    const sep = attr.indexOf('=')
    const key = sep > 0 ? attr.slice(0, sep) : attr
    const val = sep > 0 ? attr.slice(sep + 1).slice(1, -1) : true
    return { ...acc, [key]: val }
  }, {}) || {}
}

export function extractUnheadInputFromHtml(html: string) {
  const input: ResolvedHead<any> = {}
  input.htmlAttrs = extractAttributes(html.match(HtmlTag)?.[0] || '')
  html = html.replace(HtmlTag, '<html>')

  input.bodyAttrs = extractAttributes(html.match(BodyTag)?.[0] || '')
  html = html.replace(BodyTag, '<body>')

  const innerHead = html.match(HeadContent)?.[1] || ''
  innerHead.match(SelfClosingTags)?.forEach((s) => {
    html = html.replace(s, '')
    const tag = s.split(' ')[0].slice(1) as 'meta'
    input[tag] = input[tag] || []
    input[tag].push(extractAttributes(s) as any)
  })

  innerHead.match(ClosingTags)
    ?.map(tag => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      html = html.replace(tag, '')
      const type = tag.match(/<([a-z-]+)/)?.[1] as 'script' | 'title'
      const res = extractAttributes(tag) as any
      const innerContent = tag.match(/>([\s\S]*)</)?.[1]
      if (innerContent) {
        res[type !== 'script' ? 'textContent' : 'innerHTML'] = innerContent
      }
      if (type === 'title') {
        input.title = res
      }
      else {
        input[type] = input[type] || []
        input[type].push(res)
      }
    })

  html = html.replace(NewLines, '\n')
  return { html, input }
}
