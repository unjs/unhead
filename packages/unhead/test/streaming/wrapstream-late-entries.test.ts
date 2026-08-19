import { createStreamableHead, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'

/** A stream that registers head entries only once it is pulled, after the shell. */
function lateStream(register: () => void) {
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      register()
      controller.enqueue(new TextEncoder().encode('<p>app</p>'))
      controller.close()
    },
  })
}

async function render(head: any, register: () => void, options?: { flushChunk?: () => string }) {
  return new Response(wrapStream(head, lateStream(register), TEMPLATE, undefined, options)).text()
}

describe('wrapStream late entries', () => {
  it('delivers entries registered after the shell', async () => {
    const { head } = createStreamableHead()
    const html = await render(head, () => head.push({
      title: 'Late',
      link: [{ rel: 'canonical', href: 'https://example.com/' }],
    }))

    expect(html).toContain('__unhead__.push(')
    expect(html).toContain('Late')
    expect(html).toContain('canonical')
    expect(head.entries.size).toBe(0)
  })

  it('places the patch before the closing body tags', async () => {
    const { head } = createStreamableHead()
    const html = await render(head, () => head.push({ title: 'Late' }))

    expect(html.indexOf('__unhead__.push(')).toBeLessThan(html.indexOf('</body>'))
  })

  it('emits nothing when no entries were registered after the shell', async () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Early' })
    const html = await render(head, () => {})

    expect(html.slice(0, html.indexOf('</head>'))).toContain('<title>Early</title>')
    expect(html).not.toContain('__unhead__.push(')
  })

  it('lets a caller override the wrapper', async () => {
    const { head } = createStreamableHead()
    const html = await render(
      head,
      () => head.push({ title: 'Late' }),
      { flushChunk: () => '<!--custom-->' },
    )

    expect(html).toContain('<!--custom-->')
    expect(html).not.toContain('__unhead__.push(')
  })
})
