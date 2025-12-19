import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UnheadProvider } from '@unhead/react/client'
import App from './App'

// Reuse head instance created by head-client.ts (loaded early in <head>)
const head = (window as any).__unheadInstance__

hydrateRoot(
  document.getElementById('app')!,
  <UnheadProvider head={head}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </UnheadProvider>
)
