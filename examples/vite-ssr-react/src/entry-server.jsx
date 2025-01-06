import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { createServerHead, unheadCtx } from 'unhead'

/**
 * @param {string} _url
 */
export function render(_url) {
  const html = renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return { html }
}
