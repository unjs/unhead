import './app.css'
import { hydrate } from 'svelte'
import App from './App.svelte'
import { createHead, UnheadContextKey } from '@unhead/svelte/client'

const unhead = createHead()
const context = new Map()
context.set(UnheadContextKey, unhead)

hydrate(App, {
  target: document.getElementById('app')!,
  context: context
})
