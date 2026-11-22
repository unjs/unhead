import { JSDOM } from 'jsdom'
import { createStreamableHead, renderSSRHeadShell, renderSSRHeadSuspenseChunk, wrapStream } from 'unhead/stream/server'
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

async function serveAndRun(late: Record<string, unknown> | Record<string, unknown>[], options: { shellTitle?: string, final?: boolean } = {}) {
  const { head } = createStreamableHead()
  if (options.shellTitle)
    head.push({ title: options.shellTitle })
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      for (const input of Array.isArray(late) ? late : [late])
        head.push(input as any)
      if (!options.final)
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

  it('substitutes the title placeholder in streamed callback output as in the shell', async () => {
    const input = {
      title: 'Docs',
      titleTemplate: (title?: string) => `${title} | 100%s`,
    }
    const { head } = createStreamableHead()
    head.push(input)
    const { window: { document: shell } } = new JSDOM(renderSSRHeadShell(head, TEMPLATE))
    const { document } = await serveAndRun(input)
    expect(shell.title).toBe('Docs | 100Docs')
    expect(document.title).toBe(shell.title)
  })

  it('removes the shell title when a streamed callback returns null', async () => {
    const { document } = await serveAndRun({ titleTemplate: () => null }, { shellTitle: 'Home' })
    expect(document.querySelector('title')).toBeNull()
  })

  it('flushes valid metadata when the final title callback throws', async () => {
    const fail = () => {
      throw new Error('Title failed')
    }
    const { document } = await serveAndRun([
      { titleTemplate: fail, meta: [{ name: 'description', content: 'Kept on final flush' }] },
      { titleTemplate: fail },
    ], { shellTitle: 'Home', final: true })
    expect(document.title).toBe('Home')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Kept on final flush')
  })

  it('uses the raw title when replacing a streamed callback template', () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Home' })
    const dom = new JSDOM(renderSSRHeadShell(head, TEMPLATE), { runScripts: 'dangerously' })
    globalThis.window = dom.window as any
    globalThis.document = dom.window.document
    initIife({})

    head.push({ titleTemplate: title => `${title} | A` })
    dom.window.eval(renderSSRHeadSuspenseChunk(head))
    expect(document.title).toBe('Home | A')

    head.push({ titleTemplate: '%s | B' })
    dom.window.eval(renderSSRHeadSuspenseChunk(head))
    expect(document.title).toBe('Home | B')

    head.push({ titleTemplate: () => null })
    dom.window.eval(renderSSRHeadSuspenseChunk(head))
    expect(document.querySelector('title')).toBeNull()

    head.push({ titleTemplate: '%s | C' })
    dom.window.eval(renderSSRHeadSuspenseChunk(head))
    expect(document.title).toBe('Home | C')
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
