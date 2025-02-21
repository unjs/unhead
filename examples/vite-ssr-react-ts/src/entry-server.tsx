import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { createHead, UnheadProvider } from '@unhead/react/server'

export function render(_url: string) {
  const head = createHead()
  const html = renderToString(
    <StrictMode>
      <UnheadProvider value={head}>
      <App />
      </UnheadProvider>
    </StrictMode>,
  )
  return { html, head }
}
