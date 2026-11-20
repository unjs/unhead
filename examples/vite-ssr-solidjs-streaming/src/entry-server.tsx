import { renderToStream } from '@solidjs/web'
import { createStreamableHead, UnheadContext } from '@unhead/solid-js/stream/server'
import App from './App'

export function render(url: string, template: string) {
  const { head, onCompleteShell, wrapStream } = createStreamableHead()

  const stream = renderToStream(() => (
    <UnheadContext value={head}>
      <App url={url} />
    </UnheadContext>
  ), { onCompleteShell })

  return wrapStream(stream.readable, template)
}
