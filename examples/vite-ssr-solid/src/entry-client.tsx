/* @refresh reload */
import './index.css'
import { hydrate } from 'solid-js/web'
import App from './App'
import { createHead, UnheadContext } from '@unhead/solid-js/client'

hydrate(() => {
  const head = createHead()
  return (<UnheadContext.Provider value={head}><App /></UnheadContext.Provider>)
}, document.getElementById('root'))
