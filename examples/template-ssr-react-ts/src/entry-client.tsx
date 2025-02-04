import './index.css'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'
import { UnheadProvider } from '@unhead/react/client'

hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <StrictMode>
    <UnheadProvider>
    <App />
    </UnheadProvider>
  </StrictMode>,
)
