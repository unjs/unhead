import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UnheadProvider, createStreamableHead } from '@unhead/react/stream/client'
import App from './App'

const head = createStreamableHead()

hydrateRoot(
  document.getElementById('app')!,
  <UnheadProvider value={head}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </UnheadProvider>
)
