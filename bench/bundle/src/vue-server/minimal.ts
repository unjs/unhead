import { useHead } from '@unhead/vue'
import { createHead, renderSSRHead } from '@unhead/vue/server'


async function doHead() {
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

  return await renderSSRHead(head)
}

doHead()
