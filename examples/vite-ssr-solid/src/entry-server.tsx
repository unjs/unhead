import { renderToString } from 'solid-js/web'
import App from './App'
import { createHead } from 'unhead/server'

export function render(_url: string) {
  const head = createHead()
  const html = renderToString(() => <App />)
  return { html }
}
