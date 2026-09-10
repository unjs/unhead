import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createStreamableHead, prepareTemplate } from '../src/stream/server'

describe('streaming shell tag positions', () => {
  it.each([false, true])('preserves initial tags around the app, prepared: %s', async (prepared) => {
    const context = createStreamableHead({
      init: [{
        script: [
          { id: 'head-prepend', src: '/first.js', tagPriority: 'high' },
          { id: 'head-append', src: '/head.js' },
          { id: 'body-open', src: '/open.js', tagPosition: 'bodyOpen' },
          { id: 'body-close', src: '/close.js', tagPosition: 'bodyClose' },
        ],
      }],
    })
    const source = '<html><head></head><body><div id="app"><!--app-html--></div></body></html>'
    const template = prepared ? prepareTemplate(source) : source
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<main>App</main>'))
        controller.close()
      },
    })
    const html = await new Response(context.wrapStream(stream, template)).text()
    const document = new JSDOM(html).window.document

    expect([...document.head.querySelectorAll('script[id]')].map(script => script.id)).toEqual(['head-prepend', 'head-append'])
    expect([...document.body.children].map(element => element.id)).toEqual(['body-open', 'app', 'body-close'])
    expect(document.querySelector('#app')?.innerHTML).toBe('<main>App</main>')
    expect(document.querySelectorAll('#body-open')).toHaveLength(1)
  })
})
