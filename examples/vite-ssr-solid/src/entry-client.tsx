/* @refresh reload */
import './index.css'
import { hydrate } from 'solid-js/web'
import App from './App'
import { createHead } from 'unhead/client'
import { createContext, useContext } from 'solid-js';

hydrate(() => {
  const head = createHead()
  const context = createContext({ head })
  return <App />
}, document.getElementById('root'))
