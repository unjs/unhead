import './app.css'
import { hydrate } from 'svelte'
import App from './App.svelte'
import { createHead } from 'unhead/client'

const unhead = createHead()
unhead.push({
  title: 'test',
})

const map = new Map()
map.set('unhead', unhead)

hydrate(App, {
  target: document.getElementById('app')!,
  context: map
})
