import { bench, describe } from 'vitest'
import { createHead, useHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('ssr bench', () => {
  bench('x50 ssr', async () => {
    const head = createHead()
    const page = {
      title: 'Home',
      description: 'Home page description',
      image: 'https://nuxtjs.org/meta_0.png',
    }
    useHead({
      // de-dupe keys
      title: 'bench test',
    }, {
      head,
    })
    for (const i in Array.from({ length: 1000 })) {
      useHead({
        // de-dupe keys
        title: `${page.title}-${i} | Nuxt`,
        meta: [
          {
            name: 'description',
            content: `${page.description} ${i}`,
          },
          {
            property: 'og:image',
            content: `${page.image}?${i}`,
          },
        ],
        script: [
          {
            src: `https://example.com/script.js?${i}`,
          },
        ],
        link: [
          {
            as: 'style',
            href: `https://example.com/style.js?${i}`,
          },
        ],
      }, {
        head,
      })
    }
    await renderSSRHead(head)
  }, {
    iterations: 1000,
  })
})
