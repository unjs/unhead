import { bench, describe } from 'vitest'
import { useHead } from '../../src'
import { createHead, renderSSRHead } from '../../src/server'

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
    // do chunks of 100 over 10 iterations
    for (const i in Array.from({ length: 10 })) {
      for (const i2 in Array.from({ length: 10 })) {
        useHead(head, {
          // de-dupe keys
          title: `${page.title}-${i}/${i2} | Nuxt`,
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
              content: `${page.description} ${i}/${i2}`,
            },
            {
              property: 'og:image',
              content: `${page.image}?${i}/${i2}`,
            },
          ],
          script: [
            {
              src: `https://example.com/script.js?${i}/${i2}`,
            },
          ],
          link: [
            {
              as: 'style',
              href: `https://example.com/style.js?${i}/${i2}`,
            },
          ],
        }, {
          head,
        })
      }
      await renderSSRHead(head)
    }
  }, {
    iterations: 1000,
    time: 1000,
  })
})
