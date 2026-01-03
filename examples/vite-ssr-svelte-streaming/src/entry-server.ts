import { render as _render } from 'svelte/server'
import App from './App.svelte'
import { createStreamableHead, UnheadContextKey } from '@unhead/svelte/stream/server'

async function* svelteToStream(rendered: ReturnType<typeof _render>): AsyncGenerator<string> {
  yield rendered.html
}

export function render(url: string) {
  const head = createStreamableHead()
  const context = new Map()
  context.set(UnheadContextKey, head)

  const rendered = _render(App, {
    props: { url },
    context,
  })

  return {
    svelteStream: svelteToStream(rendered),
    head,
  }
}
