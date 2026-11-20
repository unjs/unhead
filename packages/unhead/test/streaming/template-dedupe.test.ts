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
