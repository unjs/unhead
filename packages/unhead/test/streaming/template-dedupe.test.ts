import { Buffer } from 'node:buffer'
import { JSDOM } from 'jsdom'
import { transformHtmlTemplate } from 'unhead/server'
import { createStreamableHead, prepareStreamingTemplate, prepareTemplate, renderShell, renderSSRHeadSuspenseChunk, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const templateWithTags = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Template</title><meta name="description" content="Template"></head><body><main id="app"><!--app-html--></main></body></html>'

describe.each([
  ['string', (html: string) => html],
  ['prepared', prepareTemplate],
] as const)('streaming template head extraction with %s templates', (_, template) => {
  it('dedupes shell tags and streams app markup at the active outlet', async () => {
    const { head } = createStreamableHead()
    head.push({ title: 'App', meta: [{ name: 'description', content: 'App' }] })
    const source = templateWithTags.replace('<main', '<template><!--app-html--></template><main')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<p>Streamed content</p>'))
        controller.close()
      },
    })

    const html = await new Response(wrapStream(head, stream, template(source))).text()
    const { document } = new JSDOM(html).window

    expect([...document.head.querySelectorAll('title')].map(title => title.textContent)).toEqual(['App'])
    expect([...document.head.querySelectorAll('meta[name="description"]')].map(meta => meta.getAttribute('content'))).toEqual(['App'])
    expect(document.head.querySelectorAll('meta[charset]')).toHaveLength(1)
    expect(document.querySelector('#app > p')?.textContent).toBe('Streamed content')
  })

  it('retains static tags and attributes and decodes template titles once', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    const source = '<html lang="fr"><head><title>&nbsp;Marks &amp; Spencer</title><meta name="description" content="Template"></head><body class="loaded"></body></html>'

    const { shell, end } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(shell + end).window

    expect(document.title).toBe('\u00A0Marks & Spencer')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Template')
    expect(document.documentElement.lang).toBe('fr')
    expect(document.body.className).toBe('loaded')
    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
  })

  it('retains static metadata when the template omits the head end tag', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    const source = '<html><head><title>Template</title><meta name="description" content="Template"><body></body></html>'

    const { shell, end } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(shell + end).window

    expect(document.title).toBe('Template')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Template')
  })

  it('retains static metadata when an SSR hook skips rendering', () => {
    let renders = 0
    const { head } = createStreamableHead({
      hooks: {
        'ssr:beforeRender': (ctx) => {
          renders++
          ctx.shouldRender = false
        },
      },
    })
    head.push({ title: 'App', link: [{ rel: 'canonical', href: '/app' }] })
    const source = templateWithTags.replace('</head>', '<link rel="icon" href="/icon.svg"></head>')

    const { shell, end } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(shell + end).window

    expect(document.title).toBe('Template')
    expect(document.head.querySelector('meta[charset]')?.getAttribute('charset')).toBe('UTF-8')
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/icon.svg')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(renderSSRHeadSuspenseChunk(head)).toBe('')
    expect(renders).toBe(1)
  })

  it.each([
    ['plain', { charset: 'utf-8' }],
    ['with an ID before the charset attribute', { id: 'app-charset', charset: 'utf-8' }],
  ] as const)('keeps a %s charset early enough to decode the document', (_, charset) => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ meta: [charset] })
    const source = `<!DOCTYPE html><html><head><meta charset="windows-1252"><!--${'x'.repeat(1200)}--><title>caf\u00E9</title></head><body></body></html>`

    const { shell, end } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(Buffer.from(shell + end)).window

    expect(document.title).toBe('caf\u00E9')
    expect(Array.from(document.head.querySelectorAll('meta[charset]'), meta => ({ id: meta.id, value: meta.getAttribute('charset') }))).toEqual([
      { id: 'id' in charset ? charset.id : '', value: 'utf-8' },
    ])
  })

  it('retains a legacy encoding declaration at the start of the document', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    const source = `<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><!--${'x'.repeat(1200)}--><title>caf\u00E9</title></head><body></body></html>`

    const { shell, end } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(Buffer.from(shell + end)).window

    expect(document.title).toBe('caf\u00E9')
  })

  it('keeps the template CSP before the bootstrap script', () => {
    const policy = 'script-src \'nonce-shell\''
    const source = `<html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body></body></html>`
    const prepared = template(source)
    transformHtmlTemplate(createStreamableHead({ disableDefaults: true }).head, prepared)
    const { head } = createStreamableHead({ disableDefaults: true, nonce: 'shell' })

    const { shell } = prepareStreamingTemplate(head, prepared)
    const { document } = new JSDOM(shell).window

    expect(Array.from(document.head.children, element => element.tagName)).toEqual(['META', 'SCRIPT'])
    expect(document.head.firstElementChild?.getAttribute('content')).toBe(policy)
    expect(document.head.querySelector('script')?.nonce).toBe('shell')
  })

  it('keeps a template base before CSP and relative resources', () => {
    const source = `<html><head><base href="/assets/"><meta http-equiv="Content-Security-Policy" content="base-uri 'none'"><link rel="stylesheet" href="theme.css"><script src="app.js"></script></head><body></body></html>`
    const { head } = createStreamableHead({ disableDefaults: true })

    const { shell } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(shell).window

    expect(Array.from(document.head.querySelectorAll('base, meta[http-equiv], link, script[src]'), element => element.tagName)).toEqual([
      'BASE',
      'META',
      'LINK',
      'SCRIPT',
    ])
    expect(document.head.querySelector('base')?.getAttribute('href')).toBe('/assets/')
  })

  it('preserves resources on each side of template CSP declarations', () => {
    const source = `<html><head><script id="config">window.config = true</script><style id="before">body{color:red}</style><link id="first" rel="stylesheet" href="/first.css"><meta http-equiv="Content-Security-Policy" content="script-src 'nonce-shell'; style-src 'nonce-shell'"><script id="allowed" nonce="shell">window.allowed = true</script><style id="after" nonce="shell">body{color:blue}</style><link id="last" rel="stylesheet" href="/last.css"><meta http-equiv="Content-Security-Policy" content="script-src 'none'"></head><body></body></html>`
    const { head } = createStreamableHead({ disableDefaults: true, nonce: 'shell' })

    const { shell } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(shell).window

    expect(Array.from(document.head.children, element => element.id || element.tagName)).toEqual([
      'config',
      'before',
      'first',
      'META',
      'allowed',
      'after',
      'last',
      'META',
      'SCRIPT',
    ])
    expect(document.head.lastElementChild?.getAttribute('nonce')).toBe('shell')
  })

  it.each([false, true])('preserves stylesheet cascade source order, hooks: %s', (hooked) => {
    const source = '<html><head><link rel="stylesheet" href="/first.css"><style>body{color:red}</style><link rel="stylesheet" href="data:text/css,body%7Bcolor%3Ablue%7D"></head><body></body></html>'
    const { head } = createStreamableHead({
      disableDefaults: true,
      hooks: hooked ? { 'entries:normalize': () => {} } : undefined,
    })

    const { shell } = prepareStreamingTemplate(head, template(source))
    const { document } = new JSDOM(shell).window

    expect(Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'), element =>
      element.getAttribute('href') || element.textContent)).toEqual([
      '/first.css',
      'body{color:red}',
      'data:text/css,body%7Bcolor%3Ablue%7D',
    ])
  })

  it('keeps later entries in the stream when the payload has already rendered', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    head.push({ title: 'Shell app title' })
    const state = renderShell(head)
    head.push({ title: 'Async app title' })

    const { shell } = prepareStreamingTemplate(head, template(templateWithTags), state)

    expect(shell).toContain('<title>Shell app title</title>')
    expect(shell).toContain('<title>Template</title>')
    expect(shell).toContain('<meta name="description" content="Template">')
    expect(renderSSRHeadSuspenseChunk(head)).toBe('window.__unhead__.push([{"title":"Async app title"}])')
  })

  it('preserves the existing template and app entries if rendering throws', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    transformHtmlTemplate(head, '<html><head><meta name="description" content="Previous"></head><body></body></html>')
    let fail = true
    head.push({
      title: () => {
        if (fail)
          throw new Error('Shell render failed')
        return 'App'
      },
    })

    expect(() => prepareStreamingTemplate(head, template(templateWithTags))).toThrow('Shell render failed')
    fail = false

    expect(head.render().headTags).toBe('<title>App</title>\n<meta name="description" content="Previous">')
  })
})
