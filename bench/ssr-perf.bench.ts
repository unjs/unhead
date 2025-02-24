import { bench, describe } from 'vitest'
import { useHead } from '../packages/unhead/src'
import { createHead, renderSSRHead } from '../packages/unhead/src/server'

describe('ssr bench', () => {
  bench('x50 ssr', async () => {
    const head = createHead()
    const page = {
      title: 'Home',
      description: 'Home page description',
      image: 'https://nuxtjs.org/meta_0.png',
    }
    useHead(head, {
      // de-dupe keys
      title: 'bench test',
    }, {
      head,
    })
    for (const i in Array.from({ length: 1000 })) {
      useHead(head, {
        // de-dupe keys
        title: `${page.title}-${i} | Nuxt`,
        bodyAttrs: {
          style: {
            color: 'red',
            background: 'blue',
          },
          class: {
            dark: true,
          },
        },
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
    time: 1000,
  })
})
