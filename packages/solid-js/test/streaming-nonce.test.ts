import { createRequire } from 'node:module'
import { renderToString } from '@solidjs/web'
import { JSDOM } from 'jsdom'
import { createComponent } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createStreamableHead, HeadStream, UnheadContext } from '../src/stream/server'

// This project uses browser conditions. Resolve real Solid server APIs for SSR.
vi.mock('solid-js', () => createRequire(import.meta.url)('solid-js'))
vi.mock('@solidjs/web', () => createRequire(import.meta.url)('@solidjs/web'))

describe('solid streaming request nonce', () => {
  it.each(['request-a', 'request-b', 'request-"&quot;&tail=<tag>', undefined])('stamps the bootstrap and HeadStream patch: %s', async (nonce) => {
    const context = createStreamableHead({ nonce })
    context.onCompleteShell()
    const app = new ReadableStream<Uint8Array>({
      start(controller) {
        context.head.push({ title: 'Late title' })
        const html = renderToString(() => createComponent(UnheadContext, {
          value: context.head,
          get children() { return HeadStream() as unknown as ReturnType<typeof createComponent> },
        }))
        controller.enqueue(new TextEncoder().encode(html))
        controller.close()
      },
    })
    const html = await new Response(context.wrapStream(app, '<html><head></head><body><!--app-html--></body></html>')).text()
    const document = new JSDOM(html).window.document

    expect([...document.scripts].map(script => script.getAttribute('nonce'))).toEqual([nonce ?? null, nonce ?? null])
    const executed = new JSDOM(html, { runScripts: 'dangerously' }).window
    expect(executed.__unhead__?._q).toEqual([[{ title: 'Late title' }]])
    executed.close()
  })
})
