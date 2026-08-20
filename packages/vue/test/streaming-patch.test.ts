import { describe, expect, it } from 'vitest'
import { createStreamableHead } from '../src/stream/server'

const TEMPLATE = '<!DOCTYPE html><html><head></head><body><div id="app"><!--app-html--></div></body></html>'
const NO_HEAD_TEMPLATE = '<html><body><div id="app"><!--app-html--></div></body></html>'

function lateStream(register: () => void) {
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      register()
      controller.enqueue(new TextEncoder().encode('<p>app</p>'))
      controller.close()
    },
  })
}

describe('vue streamed patch script', () => {
  it('delivers entries registered after the shell', async () => {
    const { head, wrapStream } = createStreamableHead()
    const html = await new Response(wrapStream(lateStream(() => head.push({ title: 'Late' })), TEMPLATE)).text()

    expect(html).toContain('__unhead__.push(')
    expect(html).toContain('Late')
  })

  it('completes the response when a late entry cannot be serialized', async () => {
    const { head, wrapStream } = createStreamableHead()
    const circular: any = {}
    circular.self = circular

    const html = await new Response(wrapStream(
      lateStream(() => head.push({ script: [{ innerHTML: circular }] })),
      TEMPLATE,
    )).text()

    expect(html).toContain('</html>')
  })

  it('guards the queue when the template never got a bootstrap script', async () => {
    const { head, wrapStream } = createStreamableHead()
    const html = await new Response(wrapStream(
      lateStream(() => head.push({ title: 'Late' })),
      NO_HEAD_TEMPLATE,
    )).text()

    expect(html).not.toContain('window.__unhead__={')
    expect(html).toContain('window.__unhead__&&(')
  })
})
