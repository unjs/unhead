import './app.css'
import { hydrate } from 'svelte'
import App from './App.svelte'
import { createHead, UnheadContextKey } from '@unhead/svelte/client'

const unhead = createHead()
unhead.push({
  title: 'test',
})

const map = new Map()
map.set(UnheadContextKey, unhead)

hydrate(App, {
  target: document.getElementById('app')!,
  context: map
})
