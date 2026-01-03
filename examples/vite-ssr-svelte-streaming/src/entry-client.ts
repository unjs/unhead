import { hydrate } from 'svelte'
import App from './App.svelte'
import { createStreamableHead, UnheadContextKey } from '@unhead/svelte/stream/client'

// Reuse head instance created by virtual:@unhead/streaming-client (loaded early in <head>)
// Falls back to creating new one if virtual module didn't load
const head = (window as any).__unheadInstance__ || createStreamableHead()
const context = new Map()
context.set(UnheadContextKey, head)

hydrate(App, {
  target: document.getElementById('app')!,
  props: { url: window.location.pathname },
  context,
})
