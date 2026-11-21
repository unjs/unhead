import type { PreparedTemplate } from '@unhead/solid-js/stream/server'
import { renderToStream } from '@solidjs/web'
import { createStreamableHead, UnheadContext } from '@unhead/solid-js/stream/server'
import App from './App'

export function render(url: string, template: string | PreparedTemplate) {
  const { head, onCompleteShell, onError, wrapStream } = createStreamableHead()

  const stream = renderToStream(() => (
    <UnheadContext value={head}>
      <App url={url} />
    </UnheadContext>
  ), { onCompleteShell, onError })

  return wrapStream(stream.readable, template)
}
