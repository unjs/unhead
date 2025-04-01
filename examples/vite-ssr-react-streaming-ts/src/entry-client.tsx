import './index.css'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'
import { UnheadProvider, createHead } from '@unhead/react/client'

const head = createHead({
  hooks: {
    'entries:updated': () => {
      console.log('entries:updated')
    },
  }
})

hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <StrictMode>
    <UnheadProvider head={head}>
      <App />
    </UnheadProvider>
  </StrictMode>,
)
