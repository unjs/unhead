import { StrictMode } from 'react'
import {
  type RenderToPipeableStreamOptions,
  renderToPipeableStream,
} from 'react-dom/server'
import { createHead, UnheadProvider } from '@unhead/react/stream/server'
import App from './App'

/*
  React SSR streaming with Suspense works by adding JS code to the end of the
  HTML to update the suspended element in the client side. However, there are 2
  issues when integrating it in Vite with React's `renderToPipeableStream` API:

  1. The API requires a parent element for Suspense for the above behavior to
     work, otherwise suspended elements will be awaited in-place, resulting in
     slow streaming.

  2. The API stalls the stream to later append the JS code, causing us to unable
     to add the trailing HTML code (the part after `<!--app-html-->` in index.html).
     This is because React assumes full control of the entire HTML output, which
     isn't feasible here as Vite requires HTML files as entrypoints and for bundling.

  The solution here is to ensure a parent element (`<main>` in `<App/>`), and a
  custom element (`<vite-streaming-end>`) to detect when React has finished
  rendering its main content so we can render Vite's HTML after it.
*/

export function render(_url: string, options?: RenderToPipeableStreamOptions) {
  const head = createHead()

  const stream = renderToPipeableStream(
    <StrictMode>
      <UnheadProvider value={head}>
        <App />
      </UnheadProvider>
      <vite-streaming-end></vite-streaming-end>
    </StrictMode>,
    options
  )

  // Return both stream and head instance
  return { ...stream, head }
}
