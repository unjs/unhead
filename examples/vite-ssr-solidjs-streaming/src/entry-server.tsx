import { renderToStream } from 'solid-js/web'
import { createStreamableHead, UnheadContext } from '@unhead/solid-js/stream/server'
import App from './App'

export function render(url: string, template: string) {
  const { head, onCompleteShell, wrapStream } = createStreamableHead()

  const { readable, writable } = new TransformStream()

  renderToStream(() => (
    <UnheadContext.Provider value={head}>
      <App url={url} />
    </UnheadContext.Provider>
  ), { onCompleteShell }).pipeTo(writable)

  return wrapStream(readable, template)
}
