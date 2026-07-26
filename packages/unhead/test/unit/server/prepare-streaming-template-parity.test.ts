import { describe, expect, it } from 'vitest'
import { applyHeadToHtml, parseHtmlForIndexes } from '../../../src/parser'
import { prepareStreamingTemplate } from '../../../src/stream/server'
import { createStreamableServerHead } from '../../util'

// Reference implementation: prepareStreamingTemplate used to derive the shell
// indexes by literally re-parsing `${shellPart}</body></html>`. The optimized
// version computes those indexes from the original parse; this fuzz locks
// byte-identical behavior against the reference, including malformed inputs.
function oldPrepareStreamingTemplate(head: any, template: string, preRenderedState?: any) {
  const ssr = preRenderedState ?? head.render()
  const streamKey = head.resolvedOptions.experimentalStreamKey || '__unhead__'
  const bootstrapScript = `<script>window.${streamKey}={_q:[],push(e){this._q.push(e)}}</script>`
  const parsed = parseHtmlForIndexes(template)
  const bodyEnd = parsed.indexes.bodyTagEnd
  const bodyCloseStart = parsed.indexes.bodyCloseTagStart
  let parts: any
  if (bodyEnd >= 0 && bodyCloseStart >= 0) {
    const bodyInterior = template.substring(bodyEnd, bodyCloseStart)
    const markerMatch = bodyInterior.match(/<!--\s*(?:app-html|ssr-outlet)\s*-->/)
    let beforeStream: string
    let afterStream: string
    if (markerMatch) {
      beforeStream = bodyInterior.substring(0, markerMatch.index!)
      afterStream = bodyInterior.substring(markerMatch.index! + markerMatch[0].length)
    }
    else {
      beforeStream = ''
      afterStream = bodyInterior
    }
    const shellPart = template.substring(0, bodyEnd) + beforeStream
    const endPart = template.substring(bodyCloseStart)
    const shellParsed = parseHtmlForIndexes(`${shellPart}</body></html>`)
    const shell = applyHeadToHtml(shellParsed, {
      htmlAttrs: ssr.htmlAttrs,
      headTags: bootstrapScript + ssr.headTags,
      bodyAttrs: ssr.bodyAttrs,
      bodyTags: '',
    }).replace('</body></html>', '')
    parts = { shell, end: afterStream + ssr.bodyTags + endPart }
  }
  else {
    parts = {
      shell: applyHeadToHtml(parsed, {
        htmlAttrs: ssr.htmlAttrs,
        headTags: bootstrapScript + ssr.headTags,
        bodyAttrs: ssr.bodyAttrs,
        bodyTags: ssr.bodyTags,
      }),
      end: '',
    }
  }
  return parts
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PIECES = [
  '<html>',
  '<html lang="en">',
  '</html>',
  '<head>',
  '</head>',
  '<body>',
  '<body class="x">',
  '</body>',
  '<!--app-html-->',
  '<!-- ssr-outlet -->',
  '<div>',
  '</div>',
  'text',
  '<',
  '>',
  '<htm',
  '</bod',
  '<!DOCTYPE html>',
  '<title>t</title>',
  '\n',
  '<html',
  '<body',
  '</head',
  '</body></html>',
  '',
]

describe('fuzz parity old vs new prepareStreamingTemplate', () => {
  it('matches on 5000 random templates', () => {
    const rand = mulberry32(42)
    for (let i = 0; i < 5000; i++) {
      const n = 1 + Math.floor(rand() * 12)
      const template = Array.from({ length: n }, () => PIECES[Math.floor(rand() * PIECES.length)]).join('')
      const state = { htmlAttrs: ' data-a="1"', headTags: '<title>X</title>', bodyAttrs: ' class="b"', bodyTagsOpen: '', bodyTags: '<script src="/x.js"></script>' }
      const oldResult = oldPrepareStreamingTemplate(createStreamableServerHead(), template, state)
      const newResult = prepareStreamingTemplate(createStreamableServerHead(), template, state)
      expect(newResult, `template: ${JSON.stringify(template)}`).toEqual(oldResult)
    }
  })
})
