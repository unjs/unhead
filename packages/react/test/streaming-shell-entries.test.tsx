// @vitest-environment node
import type { ReactStreamableHeadContext } from '../src/stream/server'
import { PassThrough } from 'node:stream'
import { JSDOM } from 'jsdom'
import React, { Suspense, use } from 'react'
import { renderToPipeableStream, renderToStaticMarkup } from 'react-dom/server'
import { renderShell } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'
import { useHead } from '../src'
import { createStreamableHead, HeadStream, prepareStreamingTemplate, renderSSRHeadShell, UnheadProvider } from '../src/stream/server'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'

async function collectStream(stream: PassThrough): Promise<string> {
  let html = ''
  for await (const chunk of stream)
    html += chunk
  return html
}

describe('react shell entries', () => {
  it('keeps initial and component tags in the shell when HeadStream renders', async () => {
    const context = createStreamableHead({
      init: [{ link: [{ id: 'plugin-preload', rel: 'preload', as: 'style', href: '/plugin.css' }] }],
    })

    function App() {
      useHead({ title: 'Page', htmlAttrs: { lang: 'en' } })
      return (
        <>
          <HeadStream />
          <main>Page</main>
          <HeadStream />
        </>
      )
    }

    const output = new PassThrough()
    const done = collectStream(output)
    const { pipe } = renderToPipeableStream(<UnheadProvider value={context.head}><App /></UnheadProvider>, {
      onShellReady: context.onShellReady,
      onShellError: error => output.destroy(error as Error),
    })
    context.wrap(pipe, TEMPLATE)(output)

    const document = new JSDOM(await done).window.document
    expect(document.head.querySelectorAll('#plugin-preload')).toHaveLength(1)
    expect(document.title).toBe('Page')
    expect(document.documentElement.lang).toBe('en')
    expect([...document.querySelectorAll('#app script')].map(script => script.textContent)).toEqual(['', ''])
  })

  it('keeps the shell and emits each resolved Suspense update once', async () => {
    const context = createStreamableHead({
      init: [{ link: [{ id: 'plugin-preload', rel: 'preload', as: 'style', href: '/plugin.css' }] }],
    })
    let resolveTitle!: (title: string) => void
    const title = new Promise<string>((resolve) => {
      resolveTitle = resolve
    })

    function AsyncPage() {
      const value = use(title)
      useHead({ title: value, meta: [{ name: 'description', content: 'Loaded description' }] })
      return (
        <>
          <HeadStream />
          <main>{value}</main>
          <HeadStream />
        </>
      )
    }

    function App() {
      useHead({ title: 'Loading' })
      return (
        <>
          <HeadStream />
          <Suspense fallback={<p>Loading</p>}><AsyncPage /></Suspense>
        </>
      )
    }

    const output = new PassThrough()
    const shell = new Promise<string>(resolve => output.once('data', chunk => resolve(chunk.toString())))
    const done = collectStream(output)
    const { pipe } = renderToPipeableStream(<UnheadProvider value={context.head}><App /></UnheadProvider>, {
      onShellReady: context.onShellReady,
      onShellError: error => output.destroy(error as Error),
    })
    context.wrap(pipe, TEMPLATE)(output)

    const shellDocument = new JSDOM(await shell).window.document
    resolveTitle('Loaded page')
    const document = new JSDOM(await done).window.document
    const patches = [...document.scripts].map(script => script.textContent).filter(content => content?.startsWith('window.__unhead__.push('))

    expect(shellDocument.head.querySelectorAll('#plugin-preload')).toHaveLength(1)
    expect(shellDocument.title).toBe('Loading')
    expect(document.head.querySelectorAll('#plugin-preload')).toHaveLength(1)
    expect(patches).toHaveLength(1)
    expect(JSON.parse(patches[0]!.slice('window.__unhead__.push('.length, -1))).toEqual([
      { title: 'Loaded page', meta: [{ name: 'description', content: 'Loaded description' }] },
    ])
  })

  it.each([
    ['renderShell', (head: ReactStreamableHeadContext['head']) => renderShell(head).headTags],
    ['renderSSRHeadShell', (head: ReactStreamableHeadContext['head']) => renderSSRHeadShell(head, TEMPLATE)],
    ['prepareStreamingTemplate', (head: ReactStreamableHeadContext['head']) => prepareStreamingTemplate(head, TEMPLATE).shell],
    ['prepareStreamingTemplate without body', (head: ReactStreamableHeadContext['head']) => prepareStreamingTemplate(head, '<html><head></head>').shell],
  ] as const)('starts HeadStream updates after %s captures the shell', (_, captureShell) => {
    const { head } = createStreamableHead()
    head.push({ title: 'Initial page' })
    const stream = <UnheadProvider value={head}><HeadStream /></UnheadProvider>

    expect(renderToStaticMarkup(stream)).toBe('<script></script>')
    expect(captureShell(head)).toContain('<title>Initial page</title>')
    head.push({ title: 'Late page' })
    expect(renderToStaticMarkup(stream)).toContain('window.__unhead__.push([{"title":"Late page"}])')
    expect(renderToStaticMarkup(stream)).toBe('<script></script>')
  })

  it.each([renderSSRHeadShell, prepareStreamingTemplate])('retains shell entries after a template failure', (render) => {
    const { head } = createStreamableHead()
    head.push({ title: 'Retained page' })
    expect(() => render(head, null as any)).toThrow()

    const stream = <UnheadProvider value={head}><HeadStream /></UnheadProvider>
    expect(renderToStaticMarkup(stream)).toBe('<script></script>')
    const { shell } = prepareStreamingTemplate(head, TEMPLATE)
    expect(new JSDOM(shell).window.document.title).toBe('Retained page')
  })

  it('retains shell entries after a head render failure', () => {
    const { head } = createStreamableHead()
    let fail = true
    head.push({
      get title() {
        if (fail)
          throw new Error('Shell render failed')
        return 'Retained page'
      },
    })

    expect(() => renderShell(head)).toThrow('Shell render failed')
    fail = false
    const stream = <UnheadProvider value={head}><HeadStream /></UnheadProvider>
    expect(renderToStaticMarkup(stream)).toBe('<script></script>')
    expect(renderShell(head).headTags).toContain('<title>Retained page</title>')
  })
})
