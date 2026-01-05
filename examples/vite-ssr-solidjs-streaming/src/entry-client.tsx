import { hydrate } from 'solid-js/web'
import { createStreamableHead, UnheadContext } from '@unhead/solid-js/stream/client'
import App from './App'

const head = createStreamableHead()

hydrate(
  () => (
    <UnheadContext.Provider value={head}>
      <App url={window.location.pathname} />
    </UnheadContext.Provider>
  ),
  document.getElementById('app')!
)
