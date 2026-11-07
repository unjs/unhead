import type { PreparedTemplate } from 'unhead/stream/server'
import { createStreamableHead, prepareStreamingTemplate, prepareTemplate, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const TEMPLATE = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Template</title><meta name="description" content="Template"></head><body><div id="app"><!--app-html--></div></body></html>'

function appStream() {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('<p>app</p>'))
      controller.close()
    },
  })
}

async function renderWithApp(head: any, template: string | PreparedTemplate) {
  return new Response(wrapStream(head, appStream(), template)).text()
}

describe('streaming template head extraction', () => {
  it.each([
    ['string', TEMPLATE],
    ['prepared', prepareTemplate(TEMPLATE)],
  ] as const)('preserves template tags with a pre-rendered payload for %s templates', (_, template) => {
    const { head } = createStreamableHead({ disableDefaults: true })
    const state = head.render()
    head.push({ title: 'Async page' })

    const { shell } = prepareStreamingTemplate(head, template, state)

    expect(shell).toContain('<title>Template</title>')
    expect(shell).toContain('<meta name="description" content="Template">')
    expect(shell).toContain('<meta charset="UTF-8">')
    expect(shell).not.toContain('<title>Async page</title>')
    expect(head.render().headTags).toContain('<title>Async page</title>')
    expect(head.render().headTags).not.toContain('content="Template"')
  })

  it('wrapStream dedupes template head tags against app tags', async () => {
    const { head } = createStreamableHead()
    head.push({
      title: 'App',
      meta: [{ name: 'description', content: 'App' }],
    })

    const html = await renderWithApp(head, TEMPLATE)

    expect(html.match(/<title>[^<]*<\/title>/g)).toEqual(['<title>App</title>'])
    expect(html.match(/<meta name="description"[^>]*>/g)).toEqual(['<meta name="description" content="App">'])
    expect(html.match(/<meta charset[^>]*>/gi)?.length).toBe(1)
  })

  it('prepareStreamingTemplate dedupes template head tags against app tags', () => {
    const { head } = createStreamableHead()
    head.push({
      title: 'App',
      meta: [{ name: 'description', content: 'App' }],
    })

    const { shell } = prepareStreamingTemplate(head, TEMPLATE)

    expect(shell.match(/<title>[^<]*<\/title>/g)).toEqual(['<title>App</title>'])
    expect(shell.match(/<meta name="description"[^>]*>/g)).toEqual(['<meta name="description" content="App">'])
    expect(shell.match(/<meta charset[^>]*>/gi)?.length).toBe(1)
  })

  it('keeps template head tags the app does not set', () => {
    const { head } = createStreamableHead({ disableDefaults: true })
    const { shell } = prepareStreamingTemplate(head, TEMPLATE)

    expect(shell).toContain('<title>Template</title>')
    expect(shell).toContain('<meta name="description" content="Template">')
    expect(shell).toContain('<meta charset="UTF-8">')
  })

  it('extracts template head tags from a PreparedTemplate', async () => {
    const { prepareTemplate } = await import('unhead/stream/server')
    const template = prepareTemplate(TEMPLATE)
    const { head } = createStreamableHead()
    head.push({
      title: 'App',
      meta: [{ name: 'description', content: 'App' }],
    })

    const html = await renderWithApp(head, template)

    expect(html.match(/<title>[^<]*<\/title>/g)).toEqual(['<title>App</title>'])
    expect(html.match(/<meta name="description"[^>]*>/g)).toEqual(['<meta name="description" content="App">'])
    expect(html.match(/<meta charset[^>]*>/gi)?.length).toBe(1)
  })

  it('extracts html and body attrs from the template', () => {
    const { head } = createStreamableHead()
    const { shell } = prepareStreamingTemplate(head, '<html data-theme="dark"><head></head><body class="loaded"><div id="app"><!--app-html--></div></body></html>')

    expect(shell).toContain('data-theme="dark"')
    expect(shell).toContain('class="loaded"')
  })

  it('does not leak template tags into suspense chunks', () => {
    const { head } = createStreamableHead()
    prepareStreamingTemplate(head, TEMPLATE)

    expect(head.entries.size).toBe(0)
  })
})
