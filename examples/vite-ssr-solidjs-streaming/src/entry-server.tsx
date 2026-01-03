import { renderToStringAsync } from 'solid-js/web'
import { createStreamableHead, UnheadContext } from '@unhead/solid-js/stream/server'
import App from './App'

export async function render(url: string) {
  const head = createStreamableHead()

  const html = await renderToStringAsync(() => (
    <UnheadContext.Provider value={head}>
      <App url={url} />
    </UnheadContext.Provider>
  ))

  return { html, head }
}
