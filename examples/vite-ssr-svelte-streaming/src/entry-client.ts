import './app.css'
import { hydrate } from 'svelte'
import App from './App.svelte'
import { createStreamableHead, UnheadContextKey } from '@unhead/svelte/stream/client'

// Reuse head instance created by head-client.ts (loaded early in <head>)
// Falls back to creating new one if head-client didn't load
const head = (window as any).__unheadInstance__ || createStreamableHead()
const context = new Map()
context.set(UnheadContextKey, head)

hydrate(App, {
  target: document.getElementById('app')!,
  context,
})
