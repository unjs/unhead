import { bench, describe } from 'vitest'
import {
  createStreamableHead,
  prepareStreamingTemplate,
  renderSSRHeadSuspenseChunk,
  wrapStream,
} from '../../src/stream/server'

const TEMPLATE = '<!DOCTYPE html><html><head><title>Bench</title></head><body><div id="app"><!--app-html--></div></body></html>'

const encoder = new TextEncoder()
const CHUNK = encoder.encode('<div class="product"><h2>Wireless Headphones</h2><p>Premium sound quality with noise cancellation.</p><span class="price">$79.99</span></div>')

function appStream(chunks: number): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i++ < chunks)
        controller.enqueue(CHUNK)
      else
        controller.close()
    },
  })
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader()
  while (true) {
    const { done } = await reader.read()
    if (done)
      return
  }
}

function makeHead() {
  const { head } = createStreamableHead()
  head.push({
    title: 'Bench',
    meta: [{ name: 'description', content: 'streaming bench' }],
  })
  return head
}

describe('streaming ssr bench', () => {
  // Floor for the wrapStream benches: same chunk volume, no wrapper.
  bench('baseline: drain 100-chunk stream', async () => {
    await drain(appStream(100))
  })

  bench('wrapStream: drain 100-chunk stream', async () => {
    await drain(wrapStream(makeHead(), appStream(100), TEMPLATE))
  })

  bench('wrapStream: shell first-read then cancel (100-chunk upstream)', async () => {
    const reader = wrapStream(makeHead(), appStream(100), TEMPLATE).getReader()
    await reader.read()
    await reader.cancel('bench')
  })

  bench('prepareStreamingTemplate x100', () => {
    for (let i = 0; i < 100; i++)
      prepareStreamingTemplate(makeHead(), TEMPLATE)
  })

  bench('renderSSRHeadSuspenseChunk x100 (5 entries per chunk)', () => {
    const head = makeHead()
    prepareStreamingTemplate(head, TEMPLATE)
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 5; j++) {
        head.push({
          title: `Chunk ${i}-${j}`,
          meta: [{ name: 'description', content: `chunk ${i}-${j}` }],
        })
      }
      renderSSRHeadSuspenseChunk(head)
    }
  })
})
