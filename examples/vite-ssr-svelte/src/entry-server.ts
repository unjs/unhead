import { render as _render } from 'svelte/server'
import App from './App.svelte'

export function render(_url: string) {
  return _render(App)
}
