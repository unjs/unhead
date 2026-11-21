import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { createStreamableHead, type PreparedTemplate, UnheadProvider } from '@unhead/react/stream/server'
import App from './App'

export function render(url: string, template: string | PreparedTemplate) {
  const { head, onShellReady, wrap } = createStreamableHead()

  const { pipe, abort } = renderToPipeableStream(
    <UnheadProvider value={head}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </UnheadProvider>,
    { onShellReady },
  )

  return {
    abort,
    pipe: wrap(pipe, template),
  }
}
