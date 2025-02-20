import { render as _render } from 'svelte/server'
import App from './App.svelte'
import { createHead, UnheadContextKey } from '@unhead/svelte/server'

export function render(_url: string) {
  const unhead = createHead()
  const context = new Map()
  context.set(UnheadContextKey, unhead)
  return {
    render: _render(App, {
      context,
    }),
    unhead,
  }
}
