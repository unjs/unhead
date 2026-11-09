import { useHead } from '@unhead/vue'
import { createHead } from '@unhead/vue/compiled/client'

// Same input as minimal.ts, so the eager chunk compares directly with Vue Client (Minimal).
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
