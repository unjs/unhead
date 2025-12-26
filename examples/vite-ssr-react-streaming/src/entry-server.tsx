import { renderToPipeableStream } from 'react-dom/server'
import type { Writable } from 'node:stream'
import { StaticRouter } from 'react-router-dom/server'
import { createStreamableHead, UnheadProvider } from '@unhead/react/stream/server'
import App from './App'

export function render(url: string) {
  const head = createStreamableHead()

  let resolveOnReady: () => void
  const onReady = new Promise<void>(r => resolveOnReady = r)

  const { pipe, abort } = renderToPipeableStream(
    <UnheadProvider value={head}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </UnheadProvider>,
    {
      onShellReady() {
        resolveOnReady()
      },
    },
  )

  return {
    head,
    onReady,
    abort,
    pipe: (writable: Writable) => pipe(writable),
  }
}
