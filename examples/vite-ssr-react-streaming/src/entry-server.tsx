import { StrictMode } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { PassThrough } from 'node:stream'
import App from './App'
import { createHead, UnheadProvider } from '@unhead/react/server'
import type { Unhead } from '@unhead/react/server'

export interface RenderResult {
  stream: PassThrough
  head: Unhead
  pipe: (writable: NodeJS.WritableStream) => void
}

export function render(_url: string): RenderResult {
  const head = createHead()
  const stream = new PassThrough()

  const { pipe } = renderToPipeableStream(
    <StrictMode>
      <UnheadProvider value={head}>
        <App />
      </UnheadProvider>
    </StrictMode>,
    {
      onShellReady() {
        pipe(stream)
      },
      onShellError(error: unknown) {
        console.error('Shell error:', error)
      },
      onError(error: unknown) {
        console.error('Stream error:', error)
      },
    },
  )

  return { stream, head, pipe }
}
