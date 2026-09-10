import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createStreamableHead } from '../src/stream/server'

describe('streaming request nonce', () => {
  it.each(['request-a', 'request-b', undefined])('stamps the bootstrap and late patch: %s', async (nonce) => {
    const { head, wrapStream } = createStreamableHead({ nonce })
    const app = new ReadableStream<Uint8Array>({
      pull(controller) {
        head.push({ title: 'Late title' })
        controller.enqueue(new TextEncoder().encode('<main>App</main>'))
        controller.close()
      },
    })
    const html = await new Response(wrapStream(app, '<html><head></head><body><!--app-html--></body></html>')).text()
    const document = new JSDOM(html).window.document

    expect([...document.scripts].map(script => script.getAttribute('nonce'))).toEqual([nonce ?? null, nonce ?? null])
    const executed = new JSDOM(html, { runScripts: 'dangerously' }).window
    expect(executed.__unhead__._q).toEqual([[{ title: 'Late title' }]])
    executed.close()
  })
})
