import { useHead } from '../../../../packages/vue/src'
import { createHead } from '../../../../packages/vue/src/client'

// Full usage with all core features
const head = createHead()

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
}, {
  head,
})
