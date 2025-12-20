import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UnheadProvider, createStreamableHead } from '@unhead/react/stream/client'
import App from './App'

const head = createStreamableHead()
console.log('entry-client.tsx head', head)

hydrateRoot(
  document.getElementById('app')!,
  <UnheadProvider head={head}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </UnheadProvider>
)
