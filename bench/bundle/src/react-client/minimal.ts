import { useHead } from '@unhead/react'
import { createHead, UnheadProvider } from '@unhead/react/client'

// Minimal client usage: useHead via the provider. Exported so the bundler retains
// the provider runtime alongside createHead + useHead (never executed, only built).
export const head = createHead()

export function App() {
  useHead({
    title: 'Test',
    titleTemplate: '%s | Site',
    meta: [
      { name: 'description', content: 'Test' },
    ],
    link: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
    script: [
      { src: '/test.js', defer: true },
    ],
  })
  return UnheadProvider
}
