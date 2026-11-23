import { JSDOM } from 'jsdom'
import { createStreamableHead, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'
// The title becomes an event handler if a patch lands inside an attribute.
const TITLE = 'x onerror=lateTitle() y'
const encoder = new TextEncoder()

function render(chunks: Uint8Array[], title = TITLE) {
  const { head } = createStreamableHead()
  const queue = [...chunks]
  const source = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (queue.length === chunks.length)
        head.push({ title })
      controller.enqueue(queue.shift()!)
      if (!queue.length)
        controller.close()
    },
  }, { highWaterMark: 0 })
  return new Response(wrapStream(head, source, TEMPLATE)).text()
}

function inspect(html: string) {
  const { document } = new JSDOM(html).window
  const handler = [...document.querySelectorAll('[onerror]')].some(element => element.getAttribute('onerror') === 'lateTitle()')
  const patches = [...document.querySelectorAll('script')].filter(script => script.textContent!.includes('.push(['))
  const delivered = patches.some(script => script.textContent!.includes(TITLE))
  for (const patch of patches)
    patch.remove()
  const app = document.getElementById('app')
  app?.normalize()
  return { app: app?.innerHTML, delivered, handler }
}

const documents = {
  'state script': '<script>window.__STATE__={"q":"<img src=x onerror=alert(1)>"};</script><p>after</p>',
  'escaped script': '<script>var s = "<!-- <script>"; var t = "</script>"; var u = "-->";</script><p>after</p>',
  'comment': '<!-- a > b <p> --><!--><!---><!-- c --!><p>after</p>',
  'bogus markup': '<!doctype html><?x?></ ></><p>after</p>',
  'quoted attributes': '<img src="/missing.png" alt="a > b"><p title=\'c > d\'>x</p>',
  'unquoted attribute': '<input value=a/b><p>after</p>',
  'textarea': '<textarea>a </b> <script></textarea><p>after</p>',
  'title': '<title>a <b> c</title><p>after</p>',
  'style': '<style>p > a { color: red }</style><p>after</p>',
  'noscript': '<noscript><img src=x alt="n"></noscript><p>after</p>',
  'svg': '<svg><title>Icon</title><style>.a{}</style><path d="M0 0"/></svg><p>after</p>',
  'uppercase': '<SCRIPT>var a = 1 < 2;</SCRIPT><P CLASS="x">y</P>',
  'multibyte': '<p>Café ☕ 你好</p><p>after</p>',
}

describe('wrapStream patch boundaries', () => {
  it.each(Object.entries(documents))('keeps the %s intact at every split', async (_, markup) => {
    const bytes = encoder.encode(markup)
    const expected = inspect(await render([bytes])).app
    for (let split = 1; split < bytes.length; split++) {
      const result = inspect(await render([bytes.subarray(0, split), bytes.subarray(split)]))
      expect(result, `split at byte ${split}`).toEqual({ app: expected, delivered: true, handler: false })
    }
  })

  it.each(Object.entries(documents))('writes no late output into the %s when the app stream stops early', async (_, markup) => {
    const bytes = encoder.encode(markup)
    for (let end = 1; end < bytes.length; end++)
      expect(inspect(await render([bytes.subarray(0, end)])).handler, `end at byte ${end}`).toBe(false)
  })

  it('writes a late patch after an app chunk that ends in body content', async () => {
    const html = await render([encoder.encode('<p>First</p>'), encoder.encode('<p>Second</p>')], 'Late title')

    expect(html).toMatch(/<p>First<\/p><script>[^<]*Late title[^<]*<\/script><p>Second<\/p>/)
  })
})
