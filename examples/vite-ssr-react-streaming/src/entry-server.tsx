import { renderToPipeableStream } from 'react-dom/server'
import type { Writable } from 'node:stream'
import { createStreamableHead, UnheadProvider } from '@unhead/react/server'
import App from './App'

export function render() {
  const head = createStreamableHead()

  let resolveOnReady: () => void
  const onReady = new Promise<void>(r => resolveOnReady = r)

  const { pipe, abort } = renderToPipeableStream(
    <UnheadProvider value={head}>
      <App />
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
