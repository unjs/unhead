import { JSDOM } from 'jsdom'
import { createStreamableHead, wrapStream } from 'unhead/stream/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { init as initIife } from '../../src/stream/iife'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'

let originalWindow: any
let originalDocument: any

beforeEach(() => {
  originalWindow = globalThis.window
  originalDocument = globalThis.document
})

afterEach(() => {
  globalThis.window = originalWindow
  globalThis.document = originalDocument
})

async function serveAndRun(late: Record<string, unknown>) {
  const { head } = createStreamableHead()
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      head.push(late as any)
      controller.enqueue(new TextEncoder().encode('<p>app</p>'))
      controller.close()
    },
  })
  const html = await new Response(wrapStream(head, stream, TEMPLATE)).text()

  const dom = new JSDOM(html, { runScripts: 'dangerously' })
  globalThis.window = dom.window as any
  globalThis.document = dom.window.document
  initIife({})
  return { html, document: dom.window.document }
}

describe('the patch a bare wrapStream emits', () => {
  it('applies to the document once the browser runs it', async () => {
    const { html, document } = await serveAndRun({
      title: 'Streamed late',
      link: [{ rel: 'canonical', href: 'https://example.com/' }],
      script: [{ type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' }],
    })

    expect(html.slice(0, html.indexOf('</head>'))).not.toContain('Streamed late')

    expect(document.title).toBe('Streamed late')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com/')
    expect(document.querySelector('script[type="application/ld+json"]')).toBeTruthy()
  })

  it('removes its own script element', async () => {
    const { document } = await serveAndRun({ title: 'Streamed late' })

    const remaining = [...document.querySelectorAll('script')]
      .filter(s => s.textContent?.includes('__unhead__.push('))
    expect(remaining).toEqual([])
  })

  it('escapes content that would otherwise close the script element', async () => {
    const { html, document } = await serveAndRun({
      meta: [{ name: 'description', content: '</script><img onerror=alert(1)>' }],
    })

    expect(html).not.toContain('</script><img')
    expect(document.querySelectorAll('img')).toHaveLength(0)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('</script><img onerror=alert(1)>')
  })
})
