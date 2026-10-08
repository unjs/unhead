import { PassThrough } from 'node:stream'
import { JSDOM } from 'jsdom'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createStreamableHead, HeadStream, UnheadProvider } from '../src/stream/server'

describe('react streaming request nonce', () => {
  it.each(['request-a', 'request-b', 'request-"&quot;&tail=<tag>', undefined])('stamps the bootstrap and HeadStream patch: %s', async (nonce) => {
    const context = createStreamableHead({ nonce })
    const output = new PassThrough()
    const collected = (async () => {
      let html = ''
      for await (const chunk of output) html += chunk
      return html
    })()
    context.wrap((writable) => {
      context.head.push({ title: 'Late title' })
      writable.end(renderToString(<UnheadProvider value={context.head}><HeadStream /></UnheadProvider>))
    }, '<html><head></head><body><!--app-html--></body></html>')(output)
    context.onShellReady()
    const html = await collected
    const document = new JSDOM(html).window.document

    expect([...document.scripts].map(script => script.getAttribute('nonce'))).toEqual([nonce ?? null, nonce ?? null])
    const executed = new JSDOM(html, { runScripts: 'dangerously' }).window
    expect(executed.__unhead__?._q).toEqual([[{ title: 'Late title' }]])
    executed.close()
  })
})
