import { useHead } from 'unhead'
import { createHead } from 'unhead/client'

// Full usage with all core features
const head = createHead()

useHead(head, {
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
