import { useHead } from '../../../../packages/unhead/src'
import { createHead } from '../../../../packages/unhead/src/server'

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
