import { render as _render } from 'svelte/server'
import App from './App.svelte'
import { createStreamableHead, UnheadContextKey } from '@unhead/svelte/stream/server'

export function render(url: string, template: string) {
  const { head, wrapStream } = createStreamableHead()
  const context = new Map()
  context.set(UnheadContextKey, head)

  const rendered = _render(App, {
    props: { url },
    context,
  })

  // Convert sync render to ReadableStream
  const svelteStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(rendered.html))
      controller.close()
    },
  })

  return wrapStream(svelteStream, template)
}
