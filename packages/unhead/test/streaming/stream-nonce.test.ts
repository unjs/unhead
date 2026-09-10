import { JSDOM } from 'jsdom'
import { createBootstrapScript, createStreamableHead, prepareStreamingTemplate, prepareTemplate, renderSSRHeadShell, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const NONCES = ['request-a', 'request-b', 'request-"&quot;&tail=<tag>', undefined]
const TEMPLATE = '<html><head></head><body><!--app-html--></body></html>'

describe('streaming request nonces', () => {
  it.each(NONCES)('preserves the bootstrap nonce: %s', (nonce) => {
    const document = new JSDOM(createBootstrapScript('__unhead__', nonce)).window.document
    expect(document.querySelector('script')?.getAttribute('nonce')).toBe(nonce ?? null)
  })

  it.each([false, true])('stamps directly rendered and fallback shells, prepared: %s', (prepared) => {
    const source = '<html><head></head><body>'
    const template = prepared ? prepareTemplate(source) : source
    const { head } = createStreamableHead({ nonce: 'request-nonce' })
    const direct = renderSSRHeadShell(head, template)
    const fallback = prepareStreamingTemplate(head, template).shell

    for (const html of [direct, fallback]) {
      expect(new JSDOM(html).window.document.querySelector('script')?.getAttribute('nonce')).toBe('request-nonce')
    }
  })

  it('keeps bootstrap and patch nonces separate across concurrent requests', async () => {
    const template = prepareTemplate(TEMPLATE)
    const results = await Promise.all(NONCES.map(async (nonce) => {
      const { head } = createStreamableHead({ nonce })
      const app = new ReadableStream<Uint8Array>({
        pull(controller) {
          head.push({ title: 'Late title' })
          controller.enqueue(new TextEncoder().encode('<main>App</main>'))
          controller.close()
        },
      })
      return new Response(wrapStream(head, app, template)).text()
    }))

    for (const [index, html] of results.entries()) {
      const document = new JSDOM(html).window.document
      expect([...document.scripts].map(script => script.getAttribute('nonce'))).toEqual([NONCES[index] ?? null, NONCES[index] ?? null])
      const executed = new JSDOM(html, { runScripts: 'dangerously' }).window
      expect(executed.__unhead__._q).toEqual([[{ title: 'Late title' }]])
      executed.close()
    }
  })
})
