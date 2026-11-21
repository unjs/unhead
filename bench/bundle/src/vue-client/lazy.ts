import { createHead } from '@unhead/vue/lazy'

// Measure the Vue shell with an entry supplied by the framework.
const head = createHead()

head.push({
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
