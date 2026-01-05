import { render as _render } from 'svelte/server'
import App from './App.svelte'
import { createStreamableHead, UnheadContextKey } from '@unhead/svelte/stream/server'

export async function render(url: string, template: string) {
  const { head, wrapStream } = createStreamableHead()
  const context = new Map()
  context.set(UnheadContextKey, head)

  // Svelte 5.36+ experimental async SSR - await the render
  const rendered = await _render(App, {
    props: { url },
    context,
  })

  // Convert to ReadableStream for wrapStream
  const svelteStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(rendered.body))
      controller.close()
    },
  })

  return wrapStream(svelteStream, template)
}
