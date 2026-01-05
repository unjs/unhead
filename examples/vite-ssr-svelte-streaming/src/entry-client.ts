import { hydrate } from 'svelte'
import App from './App.svelte'
import { createStreamableHead, UnheadContextKey } from '@unhead/svelte/stream/client'

// Get head instance created by iife script (loaded early in <head>)
const head = createStreamableHead()!
const context = new Map()
context.set(UnheadContextKey, head)

hydrate(App, {
  target: document.getElementById('app')!,
  props: { url: window.location.pathname },
  context,
})
