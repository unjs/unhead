import { hydrate } from '@solidjs/web'
import { createStreamableHead, UnheadContext } from '@unhead/solid-js/stream/client'
import App from './App'

const head = createStreamableHead()
if (!head)
  throw new Error('Unhead streaming bootstrap state is missing')

hydrate(
  () => (
    <UnheadContext value={head}>
      <App url={window.location.pathname} />
    </UnheadContext>
  ),
  document.getElementById('root')!
)
