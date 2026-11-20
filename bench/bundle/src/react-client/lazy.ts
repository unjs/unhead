import { useHead } from '@unhead/react'
import { createHead, UnheadProvider } from '@unhead/react/lazy'

// Same input as minimal.ts, so the eager chunk compares directly with React Client (Minimal).
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
