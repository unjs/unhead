import { createStreamableHead, wrapStream } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'

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

  it('preserves a quoted attribute split across app chunks', async () => {
    const { head } = createStreamableHead()
    const chunks = ['<p class="', 'example">Content</p>']
    const encoder = new TextEncoder()
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunks.length === 2)
          head.push({ title: 'Late title' })
        controller.enqueue(encoder.encode(chunks.shift()!))
        if (!chunks.length)
          controller.close()
      },
    })

    const html = await new Response(wrapStream(head, source, TEMPLATE)).text()

    expect(html).toMatch(/<p class="example">Content<\/p>.*Late title.*<\/body>/s)
  })

  it('rejects when the app ends before completing an HTML tag', async () => {
    const { head } = createStreamableHead()
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<p class="'))
        controller.close()
      },
    })

    await expect(new Response(wrapStream(head, source, TEMPLATE)).text()).rejects.toThrow('The app stream ended without a verified HTML boundary.')
  })

  it('preserves a UTF-8 character split across app chunks', async () => {
    const { head } = createStreamableHead()
    const bytes = new TextEncoder().encode('<p>Café</p>')
    const split = bytes.indexOf(0xC3) + 1
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, split))
        controller.enqueue(bytes.subarray(split))
        controller.close()
      },
    })

    const html = await new Response(wrapStream(head, source, TEMPLATE, undefined, {
      flushChunk: () => '<!-- Late update -->',
    })).text()

    expect(html).toContain('<p>Café</p><!-- Late update -->')
  })

  it('waits for a table that spans several large chunks', async () => {
    const { head } = createStreamableHead()
    const row = `<tr><td>${'x'.repeat(140 * 1024)}</td></tr>`
    const chunks = ['<table>', row, row, '</table>']
    const encoder = new TextEncoder()
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunks.length === 4)
          head.push({ title: 'Late table' })
        controller.enqueue(encoder.encode(chunks.shift()!))
        if (!chunks.length)
          controller.close()
      },
    }, { highWaterMark: 0 })

    const html = await new Response(wrapStream(head, source, TEMPLATE)).text()

    expect(html).toMatch(/<\/table>.*Late table.*<\/body>/s)
  })

  it.each([
    { name: 'script', start: ['<script>const message = "'], text: 'hello ', end: ['";</', 'script', '>'] },
    {
      name: 'script with an HTML example',
      start: ['<script>const example = `<!', '-- <scr', 'ipt>'],
      text: 'guide ',
      end: ['</scr', 'ipt>', '--', '>', '`;</', 'script', '>'],
    },
    { name: 'style', start: ['<style>/* '], text: 'style notes ', end: [' */</', 'style', '>'] },
    { name: 'textarea', start: ['<textarea>'], text: 'notes ', end: ['</', 'textarea', '>'] },
  ])('preserves a large $name across app chunks', async ({ start, text, end }) => {
    const { head } = createStreamableHead()
    const block = text.repeat(16 * 1024)
    const chunks = [...start, block, block, block, ...end]
    const appHtml = chunks.join('')
    const encoder = new TextEncoder()
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode(chunks.shift()!))
        if (!chunks.length)
          controller.close()
      },
    }, { highWaterMark: 0 })

    const html = await new Response(wrapStream(head, source, TEMPLATE, undefined, {
      flushChunk: () => '<!-- Late update -->',
    })).text()

    expect(html).toContain(`${appHtml}<!-- Late update -->`)
  })

  it.each([
    '<select><option><meter value="1" max="2">Half</meter></option></select>',
    '<select><option><svg><text>Choice</text></svg>Choice</option></select>',
  ])('preserves customizable select markup in app content: %s', async (appHtml) => {
    const { head } = createStreamableHead()
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(appHtml))
        controller.close()
      },
    })

    const html = await new Response(wrapStream(head, source, TEMPLATE)).text()

    expect(html).toContain(`<div id="app">${appHtml}</div>`)
  })

  it('flushes a head update queued as the source closes', async () => {
    const { head } = createStreamableHead()
    const { promise: reading, resolve: onPull } = Promise.withResolvers<void>()
    let close!: () => void
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        close = () => controller.close()
      },
      pull() {
        onPull()
      },
    }, { highWaterMark: 0 })

    const html = new Response(wrapStream(head, source, TEMPLATE)).text()
    await reading
    close()
    queueMicrotask(() => head.push({ title: 'Queued title' }))

    expect(await html).toMatch(/__unhead__\.push\(.*Queued title.*<\/body>/s)
  })

  it('emits nothing when no entries were registered after the shell', async () => {
    const { head } = createStreamableHead()
    head.push({ title: 'Early' })
    const html = await render(head, () => {})

    expect(html.slice(0, html.indexOf('</head>'))).toContain('<title>Early</title>')
    expect(html).not.toContain('__unhead__.push(')
  })

  it('guards the queue when the template never got a bootstrap script', async () => {
    const { head } = createStreamableHead()
    const html = await new Response(wrapStream(
      head,
      lateStream(() => head.push({ title: 'Late' })),
      '<html><body><div id="app"><!--app-html--></div></body></html>',
    )).text()

    expect(html).not.toContain('window.__unhead__={')
    expect(html).toContain('window.__unhead__&&(')
  })

  it('enters the body when the template ends after the head', async () => {
    const { head } = createStreamableHead()
    const html = await new Response(wrapStream(
      head,
      lateStream(() => head.push({ title: 'Late' })),
      '<html><head></head>',
    )).text()

    expect(html).toMatch(/<\/head><body><p>app<\/p>.*Late/s)
  })

  it('completes the response when a chunk cannot be serialized', async () => {
    const { head } = createStreamableHead()
    const circular: any = {}
    circular.self = circular

    const html = await render(head, () => head.push({ script: [{ innerHTML: circular }] }))

    expect(html).toContain('</html>')
    expect(html).not.toContain('__unhead__.push(')
  })

  it('recovers on the next chunk after an unserializable entry', async () => {
    const { head } = createStreamableHead()
    const circular: any = {}
    circular.self = circular

    let pulls = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++
        if (pulls === 1) {
          head.push({ script: [{ innerHTML: circular }] })
          controller.enqueue(new TextEncoder().encode('<p>one</p>'))
          return
        }
        head.push({ title: 'Recovered' })
        controller.enqueue(new TextEncoder().encode('<p>two</p>'))
        controller.close()
      },
    })
    const html = await new Response(wrapStream(head, stream, TEMPLATE)).text()

    expect(html).toContain('</html>')
    expect(html).toContain('Recovered')
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
