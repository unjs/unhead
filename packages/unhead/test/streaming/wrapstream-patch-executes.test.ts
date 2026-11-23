import { runInNewContext } from 'node:vm'
import { JSDOM } from 'jsdom'
import { useHeadSafe } from 'unhead'
import { createHead } from 'unhead/client'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { createStreamableHead as createClientStreamableHead } from 'unhead/stream/client'
import { createStreamableHead, renderSSRHeadSuspenseChunk, wrapStream } from 'unhead/stream/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { init as initIife } from '../../src/stream/iife'
import { buildStreamingPluginOptions, VIRTUAL_CLIENT_ID } from '../../src/stream/unplugin'

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
  it.each(['inline', 'module'] as const)('preserves the safe title boundary when replaying %s entries', (mode) => {
    const { head } = createStreamableHead()
    useHeadSafe(head, { title: 'Guest guide' })
    const chunk = renderSSRHeadSuspenseChunk(head)
    const updates: unknown[] = JSON.parse(chunk.slice(chunk.indexOf('(') + 1, chunk.lastIndexOf(')')))
    const dom = new JSDOM('')
    const window = dom.window as any
    const { document } = window
    globalThis.window = window
    globalThis.document = document
    window.__unhead__ = { _q: [updates], push: (batch: unknown[]) => window.__unhead__._q.push(batch) }

    if (mode === 'inline') {
      initIife()
    }
    else {
      const plugin = buildStreamingPluginOptions({ framework: 'unhead', mode: 'module' })
      const { code } = (plugin.load as any).handler.call({}, `\0${VIRTUAL_CLIENT_ID}`)
      runInNewContext(code.slice(code.indexOf('\n') + 1), { createHead, window, document })
    }

    const client = createClientStreamableHead({ plugins: [TemplateParamsPlugin] })!
    client.push({ script: [{ textContent: '// %pageTitle', processTemplateParams: true }] })
    client.render()

    expect({ title: document.title, script: document.querySelector('script')?.textContent }).toEqual({
      title: 'Guest guide',
      script: '//',
    })
  })

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
