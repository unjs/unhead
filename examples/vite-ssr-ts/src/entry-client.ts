import './style.css'
import './typescript.svg'
import { setupCounter } from './counter'
import { createHead } from 'unhead/client'

// @ts-expect-error untyped
window.__UNHEAD__ = createHead()

setupCounter(document.querySelector('#counter') as HTMLButtonElement)
