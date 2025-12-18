import { hydrateRoot } from 'react-dom/client'
import { createStreamableHead, UnheadProvider } from '@unhead/react/client'
import App from './App'

const head = createStreamableHead()

hydrateRoot(
  document.getElementById('app')!,
  <UnheadProvider head={head}>
    <App />
  </UnheadProvider>
)
